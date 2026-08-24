import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Download, Users, UserCheck, ShoppingBag, Palette, Trash2, Pencil, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppFooter } from "@/components/layout/AppFooter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminEditUserModal } from "@/components/admin/AdminEditUserModal";
import { AdminCreateCreatorModal } from "@/components/admin/AdminCreateCreatorModal";

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

interface UserWithRole {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  role: string | null;
  marketing_consent: boolean;
  marketing_consent_updated_at: string | null;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [consentFilter, setConsentFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") {
      navigate("/");
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    async function fetchUsers() {
      const { data: profiles } = await supabase
        .rpc("get_all_profiles_admin");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const { data: shopperProfiles } = await supabase
        .from("shopper_profiles")
        .select("user_id, marketing_consent");

      const { data: brandInvites } = await supabase
        .from("brand_creator_invites")
        .select("redeemed_by_user_id")
        .eq("status", "redeemed");
      const invitedCreatorIds = new Set(
        (brandInvites || []).map((r: any) => r.redeemed_by_user_id).filter(Boolean)
      );

      if (profiles) {
        const usersWithRoles = profiles.map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.id)?.role || null;
          const shopper = shopperProfiles?.find(s => s.user_id === profile.id);
          // For shoppers, consent lives on shopper_profiles
          const consent = userRole === "shopper" && shopper
            ? shopper.marketing_consent
            : (profile as any).marketing_consent ?? false;
          const consentUpdatedAt = (profile as any).marketing_consent_updated_at || null;
          return {
            ...profile,
            role: userRole,
            marketing_consent: consent ?? false,
            marketing_consent_updated_at: consentUpdatedAt || null,
          };
        }).filter(u =>
          u.role !== "creator"
          || (u as any).onboarding_completed === true
          || invitedCreatorIds.has(u.id)
        );
        setUsers(usersWithRoles);
      }

      setLoading(false);
    }

    if (user && role === "admin") {
      fetchUsers();
    }
  }, [user, role]);


  // Apply filters
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search filter
      const matchesSearch = 
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Role filter
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      
      // Consent filter
      const matchesConsent = 
        consentFilter === "all" ||
        (consentFilter === "opted_in" && u.marketing_consent) ||
        (consentFilter === "not_opted_in" && !u.marketing_consent);
      
      return matchesSearch && matchesRole && matchesConsent;
    });
  }, [users, searchQuery, roleFilter, consentFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = users.length;
    const creatorsOptedIn = users.filter(u => u.role === "creator" && u.marketing_consent).length;
    const shoppersOptedIn = users.filter(u => u.role === "shopper" && u.marketing_consent).length;
    const totalOptedIn = users.filter(u => u.marketing_consent).length;
    return { total, creatorsOptedIn, shoppersOptedIn, totalOptedIn };
  }, [users]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Export functionality
  const generateCSV = (usersToExport: UserWithRole[]) => {
    const headers = ["name", "email", "role", "marketingConsent", "marketingConsentUpdatedAt", "joinedAt"];
    const rows = usersToExport.map(u => [
      u.display_name || "",
      u.email || "",
      u.role || "",
      u.marketing_consent ? "true" : "false",
      u.marketing_consent_updated_at || "",
      u.created_at || "",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const logExport = async (count: number, filters: Record<string, string>) => {
    try {
      await supabase.from("admin_logs").insert({
        admin_user_id: user!.id,
        action: "export_users",
        details: { count, filters },
      });
    } catch (error) {
      console.error("Failed to log export:", error);
    }
  };

  const handleExportSelected = async () => {
    if (selectedUsers.size === 0) {
      toast({ title: "No users selected", variant: "destructive" });
      return;
    }
    
    setIsExporting(true);
    const usersToExport = filteredUsers.filter(u => selectedUsers.has(u.id));
    const csv = generateCSV(usersToExport);
    downloadCSV(csv, `users-selected-${new Date().toISOString().split("T")[0]}.csv`);
    await logExport(usersToExport.length, { type: "selected", roleFilter, consentFilter });
    toast({ title: `Exported ${usersToExport.length} users` });
    setIsExporting(false);
  };

  const handleDeleteUsers = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    
    const idsToDelete = deleteTarget === "selected" 
      ? Array.from(selectedUsers) 
      : [deleteTarget];

    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_ids: idsToDelete },
      });

      if (error) throw error;

      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      const failCount = data.results?.filter((r: any) => !r.success).length || 0;

      setUsers(prev => prev.filter(u => !idsToDelete.includes(u.id)));
      setSelectedUsers(prev => {
        const next = new Set(prev);
        idsToDelete.forEach(id => next.delete(id));
        return next;
      });

      toast({ 
        title: `Deleted ${successCount} user${successCount !== 1 ? "s" : ""}${failCount > 0 ? ` (${failCount} failed)` : ""}` 
      });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleExportFiltered = async () => {
    setIsExporting(true);
    const csv = generateCSV(filteredUsers);
    downloadCSV(csv, `users-filtered-${new Date().toISOString().split("T")[0]}.csv`);
    await logExport(filteredUsers.length, { type: "filtered", roleFilter, consentFilter, search: searchQuery });
    toast({ title: `Exported ${filteredUsers.length} users` });
    setIsExporting(false);
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    creator: "bg-blue-500/20 text-blue-500",
    brand: "bg-purple-500/20 text-purple-500",
    admin: "bg-red-500/20 text-red-500",
    shopper: "bg-green-500/20 text-green-500",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Users
            </h1>
            <p className="text-muted-foreground">
              Manage all registered users and marketing consent.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpis.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Creators Opted In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpis.creatorsOptedIn}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Shoppers Opted In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpis.shoppersOptedIn}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Total Opted In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpis.totalOptedIn}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-0 flex-[1_1_100%] sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="shopper">Shopper</SelectItem>
              <SelectItem value="creator">Creator</SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={consentFilter} onValueChange={setConsentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by consent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Consent</SelectItem>
              <SelectItem value="opted_in">Opted In</SelectItem>
              <SelectItem value="not_opted_in">Not Opted In</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap">
            <Button
              size="sm"
              className="min-w-0"
              onClick={() => setShowCreateModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Creator
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="min-w-0"
              onClick={() => setDeleteTarget("selected")}
              disabled={selectedUsers.size === 0 || isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedUsers.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-w-0"
              onClick={handleExportSelected}
              disabled={selectedUsers.size === 0 || isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected ({selectedUsers.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-w-0"
              onClick={handleExportFiltered}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export All ({filteredUsers.length})
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Marketing Consent</TableHead>
                  <TableHead>Consent Date</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(u.id)}
                        onCheckedChange={() => toggleSelectUser(u.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{u.display_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role ? (
                        <Badge className={roleColors[u.role] || "bg-gray-500/20 text-gray-500"}>
                          {u.role}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No role</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={u.marketing_consent ? "default" : "secondary"}
                        className={u.marketing_consent ? "bg-green-500/20 text-green-600" : ""}
                      >
                        {u.marketing_consent ? "Opted in" : "Not opted in"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.marketing_consent_updated_at 
                        ? new Date(u.marketing_consent_updated_at).toLocaleDateString()
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditUserId(u.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(u.id)}
                          disabled={u.id === user?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <AppFooter />
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget === "selected" ? `${selectedUsers.size} users` : "user"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user{deleteTarget === "selected" && selectedUsers.size > 1 ? "s" : ""} will be permanently removed from the platform, including all authentication data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUsers}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminEditUserModal
        isOpen={!!editUserId}
        onClose={() => setEditUserId(null)}
        userId={editUserId}
        onSaved={() => {
          // Re-fetch users
          setLoading(true);
          (async () => {
            const { data: profiles } = await supabase.rpc("get_all_profiles_admin");
            const { data: roles } = await supabase
              .from("user_roles")
              .select("user_id, role");
            const { data: shopperProfiles } = await supabase
              .from("shopper_profiles")
              .select("user_id, marketing_consent");
            const { data: brandInvites } = await supabase
              .from("brand_creator_invites")
              .select("redeemed_by_user_id")
              .eq("status", "redeemed");
            const invitedCreatorIds = new Set(
              (brandInvites || []).map((r: any) => r.redeemed_by_user_id).filter(Boolean)
            );
            if (profiles) {
              setUsers(profiles.map(profile => {
                const userRole = roles?.find(r => r.user_id === profile.id)?.role || null;
                const shopper = shopperProfiles?.find(s => s.user_id === profile.id);
                const consent = userRole === "shopper" && shopper
                  ? shopper.marketing_consent
                  : (profile as any).marketing_consent ?? false;
                return {
                  ...profile,
                  role: userRole,
                  marketing_consent: consent ?? false,
                  marketing_consent_updated_at: (profile as any).marketing_consent_updated_at || null,
                };
              }).filter(u =>
                u.role !== "creator"
                || (u as any).onboarding_completed === true
                || invitedCreatorIds.has(u.id)
              ));
            }


            setLoading(false);
          })();
        }}
      />

      <AdminCreateCreatorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setLoading(true);
          (async () => {
            const { data: profiles } = await supabase.rpc("get_all_profiles_admin");
            const { data: roles } = await supabase.from("user_roles").select("user_id, role");
            const { data: shopperProfiles } = await supabase.from("shopper_profiles").select("user_id, marketing_consent");
            const { data: brandInvites } = await supabase
              .from("brand_creator_invites")
              .select("redeemed_by_user_id")
              .eq("status", "redeemed");
            const invitedCreatorIds = new Set(
              (brandInvites || []).map((r: any) => r.redeemed_by_user_id).filter(Boolean)
            );
            if (profiles) {
              setUsers(profiles.map(profile => {
                const userRole = roles?.find(r => r.user_id === profile.id)?.role || null;
                const shopper = shopperProfiles?.find(s => s.user_id === profile.id);
                const consent = userRole === "shopper" && shopper
                  ? shopper.marketing_consent
                  : (profile as any).marketing_consent ?? false;
                return {
                  ...profile,
                  role: userRole,
                  marketing_consent: consent ?? false,
                  marketing_consent_updated_at: (profile as any).marketing_consent_updated_at || null,
                };
              }).filter(u =>
                u.role !== "creator"
                || (u as any).onboarding_completed === true
                || invitedCreatorIds.has(u.id)
              ));
            }


            setLoading(false);
          })();
        }}
      />
    </AdminLayout>
  );
}
