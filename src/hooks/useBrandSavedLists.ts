import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SavedList {
  id: string;
  brand_id: string;
  name: string;
  created_at: string;
  creator_count?: number;
}

export interface SavedListItem {
  id: string;
  list_id: string;
  creator_id: string;
  created_at: string;
}

export function useBrandSavedLists() {
  const { user } = useAuth();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [lists, setLists] = useState<SavedList[]>([]);
  const [savedCreatorIds, setSavedCreatorIds] = useState<Set<string>>(new Set());
  const [allItems, setAllItems] = useState<SavedListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch brand account
  useEffect(() => {
    if (!user) return;
    supabase
      .from("brand_accounts")
      .select("id")
      .eq("owner_user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setBrandId(data?.id || null));
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);

    const [listsRes, itemsRes] = await Promise.all([
      supabase
        .from("brand_saved_lists")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: true }),
      supabase
        .from("brand_saved_list_items")
        .select("*")
        .in(
          "list_id",
          // We'll fetch all items for this brand's lists
          (await supabase.from("brand_saved_lists").select("id").eq("brand_id", brandId)).data?.map((l) => l.id) || []
        ),
    ]);

    const fetchedLists = listsRes.data || [];
    const fetchedItems = itemsRes.data || [];

    // Enrich lists with creator count
    const enriched = fetchedLists.map((list) => ({
      ...list,
      creator_count: fetchedItems.filter((item) => item.list_id === list.id).length,
    }));

    setLists(enriched);
    setAllItems(fetchedItems);
    setSavedCreatorIds(new Set(fetchedItems.map((item) => item.creator_id)));
    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getOrCreateDefaultList = async (): Promise<string | null> => {
    if (!brandId) return null;

    // Check for existing default list
    const existing = lists.find((l) => l.name === "Saved Creators");
    if (existing) return existing.id;

    // Create one
    const { data, error } = await supabase
      .from("brand_saved_lists")
      .insert({ brand_id: brandId, name: "Saved Creators" })
      .select()
      .single();

    if (error || !data) return null;
    return data.id;
  };

  const toggleSaveCreator = async (creatorId: string, listId?: string) => {
    const targetListId = listId || (await getOrCreateDefaultList());
    if (!targetListId) return { error: "No list available" };

    const existingItem = allItems.find(
      (item) => item.list_id === targetListId && item.creator_id === creatorId
    );

    if (existingItem) {
      // Remove
      const { error } = await supabase
        .from("brand_saved_list_items")
        .delete()
        .eq("id", existingItem.id);
      if (error) return { error: error.message };
    } else {
      // Add
      const { error } = await supabase
        .from("brand_saved_list_items")
        .insert({ list_id: targetListId, creator_id: creatorId });
      if (error) return { error: error.message };
    }

    await fetchAll();
    return { error: null };
  };

  const createList = async (name: string) => {
    if (!brandId) return { error: "No brand account" };
    const { error } = await supabase
      .from("brand_saved_lists")
      .insert({ brand_id: brandId, name });
    if (error) return { error: error.message };
    await fetchAll();
    return { error: null };
  };

  const deleteList = async (listId: string) => {
    // Delete items first, then list
    await supabase.from("brand_saved_list_items").delete().eq("list_id", listId);
    const { error } = await supabase.from("brand_saved_lists").delete().eq("id", listId);
    if (error) return { error: error.message };
    await fetchAll();
    return { error: null };
  };

  const removeCreatorFromList = async (listId: string, creatorId: string) => {
    const { error } = await supabase
      .from("brand_saved_list_items")
      .delete()
      .eq("list_id", listId)
      .eq("creator_id", creatorId);
    if (error) return { error: error.message };
    await fetchAll();
    return { error: null };
  };

  const renameList = async (listId: string, newName: string) => {
    const { error } = await supabase
      .from("brand_saved_lists")
      .update({ name: newName })
      .eq("id", listId);
    if (error) return { error: error.message };
    await fetchAll();
    return { error: null };
  };

  const moveCreatorToList = async (fromListId: string, toListId: string, creatorId: string) => {
    // Check if already in target list
    const alreadyExists = allItems.some(
      (item) => item.list_id === toListId && item.creator_id === creatorId
    );

    // Remove from source list
    const { error: removeError } = await supabase
      .from("brand_saved_list_items")
      .delete()
      .eq("list_id", fromListId)
      .eq("creator_id", creatorId);
    if (removeError) return { error: removeError.message };

    // Add to target list if not already there
    if (!alreadyExists) {
      const { error: addError } = await supabase
        .from("brand_saved_list_items")
        .insert({ list_id: toListId, creator_id: creatorId });
      if (addError) return { error: addError.message };
    }

    await fetchAll();
    return { error: null };
  };

  const getCreatorsInList = (listId: string) => {
    return allItems.filter((item) => item.list_id === listId).map((item) => item.creator_id);
  };

  const isCreatorSaved = (creatorId: string) => savedCreatorIds.has(creatorId);

  return {
    lists,
    allItems,
    loading,
    brandId,
    isCreatorSaved,
    toggleSaveCreator,
    createList,
    deleteList,
    renameList,
    moveCreatorToList,
    removeCreatorFromList,
    getCreatorsInList,
    refetch: fetchAll,
  };
}
