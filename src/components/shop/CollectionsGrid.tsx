import { useState } from "react";
import {
  Plus,
  GripVertical,
  Link2,
  MoreHorizontal,
  Package,
  Pencil,
  EyeOff,
  Eye,
  Trash2,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collection } from "@/pages/Shop";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CollectionsGridProps {
  collections: Collection[];
  products: CollectionProduct[];
  isEditMode: boolean;
  isPublicView?: boolean;
  onProductClick?: (product: CollectionProduct) => void;
  onAddCollection?: () => void;
  onAddProduct?: (collectionId: string) => void;
  onCollectionsChange?: () => void;
  username: string | null;
  isLoading?: boolean;
}

type CollectionProduct = {
  id: string;
  title: string;
  image_url: string | null;
  retailer?: string | null;
  description?: string | null;
  affiliate_url?: string;
};

export function CollectionsGrid({
  collections,
  products,
  isEditMode,
  isPublicView = false,
  onProductClick,
  onAddCollection,
  onAddProduct,
  onCollectionsChange,
  username,
  isLoading = false,
}: CollectionsGridProps) {
  const { toast } = useToast();
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteProductConfirm, setDeleteProductConfirm] = useState<{
    productId: string;
    collectionId: string;
    type: "remove" | "delete";
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredCollectionId, setHoveredCollectionId] = useState<string | null>(null);
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="space-y-12 sm:space-y-16">
        {[1, 2].map((i) => (
          <div key={i}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="aspect-[3/4] rounded-none" />
              ))}
            </div>
            <Skeleton className="h-5 sm:h-6 w-36 sm:w-48 mb-2" />
            <Skeleton className="h-4 w-24 sm:w-32" />
            <div className="h-px bg-border mt-6 sm:mt-8" />
          </div>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    if (isPublicView) {
      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
          <p className="font-display text-base sm:text-lg text-foreground mb-2">No collections yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">This creator hasn't created any collections yet.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
        <p className="font-display text-base sm:text-lg text-foreground mb-2">No collections yet</p>
        <p className="text-sm text-muted-foreground mb-6 sm:mb-8 max-w-sm">
          Create your first collection to organize and showcase your favorite products
        </p>
        {onAddCollection && (
          <button
            onClick={onAddCollection}
            className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group min-h-[44px]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="border-b border-foreground group-hover:border-transparent transition-colors">
              Add Collection
            </span>
          </button>
        )}
      </div>
    );
  }

  const handleCopyLink = async (collectionId: string) => {
    const url = username
      ? `${window.location.origin}/${username}?collection=${collectionId}`
      : `${window.location.origin}/shop?collection=${collectionId}`;

    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Collection link copied" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const getCollectionProducts = (collection: Collection) =>
    collection.product_ids
      .map((id) => products.find((p) => p.id === id))
      .filter((product): product is CollectionProduct => Boolean(product));

  const openCollection = collections.find((collection) => collection.id === openCollectionId) || null;
  const openCollectionProducts = openCollection ? getCollectionProducts(openCollection) : [];

  const handleRename = async (collectionId: string) => {
    if (!editingTitle.trim()) return;

    try {
      const { error } = await supabase
        .from("collections")
        .update({ title: editingTitle.trim() })
        .eq("id", collectionId);

      if (error) throw error;
      toast({ title: "Collection renamed" });
      setEditingCollectionId(null);
      onCollectionsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to rename", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleHide = async (collection: Collection) => {
    try {
      const { error } = await supabase
        .from("collections")
        .update({ is_archived: !collection.is_archived })
        .eq("id", collection.id);

      if (error) throw error;
      toast({
        title: collection.is_archived ? "Collection visible" : "Collection hidden",
        description: collection.is_archived ? "Now showing on your public shop" : "Hidden from your public shop",
      });
      onCollectionsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (collectionId: string) => {
    try {
      const { error } = await supabase.from("collections").delete().eq("id", collectionId);

      if (error) throw error;
      toast({ title: "Collection deleted" });
      setDeleteConfirmId(null);
      onCollectionsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    }
  };

  const handleDuplicate = async (collection: Collection) => {
    try {
      // Insert must set user_id to the current creator (collections RLS requires
      // user_id = auth.uid()). The previous code used a truncated collection id,
      // which is not a valid uuid.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to duplicate a collection.");

      const { error } = await supabase.from("collections").insert({
        user_id: user.id,
        title: `${collection.title} (Copy)`,
        description: collection.description,
        product_ids: collection.product_ids,
        sort_order: collection.sort_order + 1,
      });

      if (error) throw error;
      toast({ title: "Collection duplicated" });
      onCollectionsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to duplicate", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveProduct = async (productId: string, collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;

    try {
      const newProductIds = collection.product_ids.filter((id) => id !== productId);
      const { error } = await supabase
        .from("collections")
        .update({ product_ids: newProductIds })
        .eq("id", collectionId);

      if (error) throw error;
      toast({ title: "Product removed from collection" });
      onCollectionsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from("links").delete().eq("id", productId);

      if (error) throw error;

      // Also strip this product from any collection that referenced it, so the
      // product counts stay accurate and no dangling ids are left behind.
      const affected = collections.filter((c) => c.product_ids.includes(productId));
      for (const c of affected) {
        await supabase
          .from("collections")
          .update({ product_ids: c.product_ids.filter((id) => id !== productId) })
          .eq("id", c.id);
      }

      toast({ title: "Product deleted" });
      setDeleteProductConfirm(null);
      onCollectionsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    }
  };

  // Move a collection up/down in sort order (used by the mobile arrows).
  const moveCollection = async (collectionId: string, direction: "up" | "down") => {
    const index = collections.findIndex((c) => c.id === collectionId);
    if (index === -1) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= collections.length) return;

    const newOrder = [...collections];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(target, 0, moved);

    try {
      for (let i = 0; i < newOrder.length; i++) {
        await supabase.from("collections").update({ sort_order: i }).eq("id", newOrder[i].id);
      }
      toast({ title: "Collections reordered" });
      onCollectionsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to reorder", description: error.message, variant: "destructive" });
    }
  };

  const handleDragStart = (e: React.DragEvent, collectionId: string) => {
    setDraggingId(collectionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const dragIndex = collections.findIndex((c) => c.id === draggingId);
    const dropIndex = collections.findIndex((c) => c.id === targetId);

    if (dragIndex === -1 || dropIndex === -1) {
      setDraggingId(null);
      return;
    }

    // Optimistically reorder
    const newOrder = [...collections];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    // Update sort_order for affected items
    try {
      const updates = newOrder.map((c, index) => ({
        id: c.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase.from("collections").update({ sort_order: update.sort_order }).eq("id", update.id);
      }

      toast({ title: "Collections reordered" });
      onCollectionsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to reorder", description: error.message, variant: "destructive" });
    }

    setDraggingId(null);
  };

  return (
    <>
      <div className="space-y-12 sm:space-y-16">
        {collections.map((collection, collectionIndex) => {
          // Products actually in this collection (existing links only).
          const collectionProducts = getCollectionProducts(collection);
          const displayProducts = collectionProducts.slice(0, 4);

          // Count only products that still exist, so removing/deleting one
          // immediately lowers the number shown.
          const productCount = collectionProducts.length;
          const updatedText = formatDistanceToNow(new Date(collection.updated_at), {
            addSuffix: false,
          });

          const isHovered = hoveredCollectionId === collection.id;

          return (
            <div
              key={collection.id}
              className={`group relative ${isPublicView ? "cursor-pointer" : ""} ${draggingId === collection.id ? "opacity-50" : ""}`}
              onMouseEnter={() => setHoveredCollectionId(collection.id)}
              onMouseLeave={() => setHoveredCollectionId(null)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, collection.id)}
              onClick={() => isPublicView && setOpenCollectionId(collection.id)}
            >
              {/* Top Right Actions - appear on hover, only for creators, hidden on mobile */}
              {!isPublicView && (
                <div
                  className={`absolute -top-2 right-0 z-10 hidden sm:flex items-center gap-1.5 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}
                >
                  {/* Drag Handle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80 cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => handleDragStart(e, collection.id)}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>

                  {/* Copy Link */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80"
                    onClick={() => handleCopyLink(collection.id)}
                  >
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>

                  {/* More Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingCollectionId(collection.id);
                          setEditingTitle(collection.title);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleHide(collection)}>
                        {collection.is_archived ? (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Unhide collection
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Hide collection
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(collection)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteConfirmId(collection.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete collection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Product Thumbnails Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
                {displayProducts.map((product) => {
                  const productId = product.id;
                  return (
                    <div key={product.id} className="aspect-[3/4] overflow-hidden bg-muted relative group/product">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/product:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Product hover actions - only for creators, hidden on mobile */}
                      {isHovered && !isPublicView && (
                        <div className="absolute inset-0 bg-foreground/80 opacity-0 group-hover/product:opacity-100 transition-opacity hidden sm:flex flex-col items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full max-w-24 sm:max-w-28 h-8 text-xs uppercase tracking-wider"
                            onClick={() => handleRemoveProduct(productId, collection.id)}
                          >
                            Remove
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full max-w-24 sm:max-w-28 h-8 text-xs uppercase tracking-wider"
                            onClick={() =>
                              setDeleteProductConfirm({
                                productId,
                                collectionId: collection.id,
                                type: "delete",
                              })
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      )}

                      {/* Mobile per-product actions — always visible (touch has no hover) */}
                      {!isPublicView && (
                        <div className="absolute top-2 right-2 sm:hidden" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-background/85 hover:bg-background shadow-sm"
                                aria-label="Product options"
                              >
                                <MoreHorizontal className="h-4 w-4 text-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" collisionPadding={16} className="w-48">
                              <DropdownMenuItem onClick={() => handleRemoveProduct(productId, collection.id)}>
                                <Package className="h-4 w-4 mr-2" />
                                Remove from collection
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setDeleteProductConfirm({
                                    productId,
                                    collectionId: collection.id,
                                    type: "delete",
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete product
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add new product card - appears on hover, only for creators, hidden on mobile */}
                {isHovered && !isPublicView && onAddProduct && (
                  <div
                    className="aspect-[3/4] border border-dashed border-border bg-muted/30 hidden sm:flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onAddProduct(collection.id)}
                  >
                    <div className="text-center">
                      <Plus className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Add</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Collection Meta */}
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  {editingCollectionId === collection.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(collection.id);
                          if (e.key === "Escape") setEditingCollectionId(null);
                        }}
                        className="h-8 w-48"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleRename(collection.id)} className="h-8">
                        Save
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-display text-xl text-foreground group-hover:underline underline-offset-4 transition-all">
                        {collection.title}
                        {collection.is_archived && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">(Hidden)</span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {productCount} Products · Updated {updatedText} ago
                      </p>
                    </>
                  )}
                </div>

                {/* Mobile collection actions — always visible next to the title (touch has no hover) */}
                {!isPublicView && editingCollectionId !== collection.id && (
                  <div className="flex sm:hidden items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/80"
                      onClick={() => moveCollection(collection.id, "up")}
                      disabled={collectionIndex === 0}
                      aria-label="Move collection up"
                    >
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/80"
                      onClick={() => moveCollection(collection.id, "down")}
                      disabled={collectionIndex === collections.length - 1}
                      aria-label="Move collection down"
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/80"
                          aria-label="Collection options"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" collisionPadding={16} className="w-52">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCollectionId(collection.id);
                            setEditingTitle(collection.title);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        {onAddProduct && (
                          <DropdownMenuItem onClick={() => onAddProduct(collection.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add product
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleCopyLink(collection.id)}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleHide(collection)}>
                          {collection.is_archived ? (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Unhide collection
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Hide collection
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(collection)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteConfirmId(collection.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete collection
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="h-px bg-border mt-8" />
            </div>
          );
        })}
      </div>

      <Dialog open={!!openCollection} onOpenChange={(open) => !open && setOpenCollectionId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-6 sm:p-8">
          {openCollection && (
            <div>
              <div className="mb-8">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Collection</span>
                <DialogTitle asChild>
                  <h2 className="font-display text-3xl sm:text-4xl mt-1 text-foreground">{openCollection.title}</h2>
                </DialogTitle>
                {openCollection.description && (
                  <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{openCollection.description}</p>
                )}
                <div className="h-px bg-border mt-5" />
              </div>

              {openCollectionProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                  {openCollectionProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => onProductClick?.(product)}
                      className="group text-left"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-muted relative mb-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        {isPublicView && (
                          <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-background font-medium">
                              <ExternalLink className="h-4 w-4" /> Shop
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-display text-sm sm:text-base leading-snug text-foreground line-clamp-2 group-hover:underline underline-offset-2">
                        {product.title}
                      </h3>
                      {product.retailer && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{product.retailer}</p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">This collection has no products yet.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Collection Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the collection from your shop. Products will remain in your library and can be added to
              other collections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Product Confirmation */}
      <AlertDialog open={!!deleteProductConfirm} onOpenChange={() => setDeleteProductConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product from your library. It will be removed from all collections. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductConfirm && handleDeleteProduct(deleteProductConfirm.productId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
