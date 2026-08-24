import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Check, X, Plus, ArrowRight, Download, Tag, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppFooter } from "@/components/layout/AppFooter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BrandAccount {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
  owner_user_id: string;
  plan_tier?: "free" | "premium" | null;
}

interface BrandWaitlistEntry {
  id: string;
  brand_name: string;
  website_url: string | null;
  full_name: string;
  email: string;
  biggest_challenge: string | null;
  goals: string | null;
  partnership_types: string | null;
  created_at: string;
}

export default function AdminBrands() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [brands, setBrands] = useState<BrandAccount[]>([]);
  const [waitlist, setWaitlist] = useState<BrandWaitlistEntry[]>([]);
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBrand, setNewBrand] = useState({
    name: "",
    website_url: "",
    description: "",
    category: "",
    commission_percent: "",
    refund_buffer_days: "",
    email: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    async function fetchData() {
      const [brandsRes, waitlistRes, codesRes] = await Promise.all([
        supabase.rpc("get_all_brand_accounts"),
        supabase.from("brand_waitlist").select("*").order("created_at", { ascending: false }),
        supabase
          .from("discount_codes" as any)
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      if (brandsRes.data) setBrands(brandsRes.data as BrandAccount[]);
      if (waitlistRes.data) setWaitlist(waitlistRes.data as BrandWaitlistEntry[]);
      if (codesRes.data) setDiscountCodes(codesRes.data as any[]);
      setLoading(false);
    }
    if (user && role === "admin") fetchData();
  }, [user, role]);

  const updateBrandStatus = async (brandId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("brand_accounts").update({ status }).eq("id", brandId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setBrands(brands.map((b) => (b.id === brandId ? { ...b, status } : b)));
      toast({ title: `Brand ${status}`, description: `The brand has been ${status}.` });
    }
  };

  const deleteBrand = async (brand: BrandAccount) => {
    if (
      !confirm(
        `Delete brand "${brand.name}"? This permanently removes the brand account and all related data (clicks, orders, conversations, codes, etc.). This cannot be undone.`,
      )
    )
      return;
    const { error } = await supabase.rpc("admin_delete_brand" as any, { p_brand_id: brand.id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setBrands(brands.filter((b) => b.id !== brand.id));
      toast({ title: "Brand deleted", description: `${brand.name} has been removed.` });
    }
  };

  const togglePlanTier = async (brand: BrandAccount) => {
    const next = brand.plan_tier === "premium" ? "free" : "premium";
    const { error } = await supabase
      .from("brand_accounts")
      .update({ plan_tier: next } as any)
      .eq("id", brand.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setBrands(brands.map((b) => (b.id === brand.id ? { ...b, plan_tier: next } : b)));
      toast({ title: next === "premium" ? "Upgraded to Premium" : "Downgraded to Free", description: brand.name });
    }
  };

  const handleAddBrand = async () => {
    if (!newBrand.name.trim() || !newBrand.email.trim() || !newBrand.password.trim() || !user) return;
    if (newBrand.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    // Required at creation: website URL, commission rate, and refund buffer.
    const websiteUrl = newBrand.website_url.trim();
    if (!websiteUrl) {
      toast({ title: "Website URL required", description: "Enter the brand's website URL.", variant: "destructive" });
      return;
    }
    const commission = Number(newBrand.commission_percent);
    if (!newBrand.commission_percent.trim() || !Number.isFinite(commission) || commission < 0 || commission > 100) {
      toast({
        title: "Commission rate required",
        description: "Enter a commission percentage between 0 and 100.",
        variant: "destructive",
      });
      return;
    }
    const refundDays = Number(newBrand.refund_buffer_days);
    if (!newBrand.refund_buffer_days.trim() || !Number.isInteger(refundDays) || refundDays < 0) {
      toast({
        title: "Refund buffer required",
        description: "Enter the refund buffer as a whole number of days (0 or more).",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Create user account with brand role
      const { data: userData, error: userError } = await supabase.functions.invoke("admin-create-creator", {
        body: {
          email: newBrand.email.trim(),
          password: newBrand.password.trim(),
          display_name: newBrand.name.trim(),
          role: "brand",
        },
      });
      if (userError || userData?.error) {
        throw new Error(userData?.error || userError?.message || "Failed to create user");
      }

      // 2. Create brand account owned by the new user
      const { data, error } = await supabase.rpc("admin_create_brand" as any, {
        p_name: newBrand.name.trim(),
        p_owner_user_id: userData.user_id,
        p_website_url: websiteUrl,
        p_description: newBrand.description.trim() || null,
        p_category: newBrand.category.trim() || null,
        p_commission_percent: commission,
        p_refund_buffer_days: refundDays,
        p_status: "approved",
      });
      if (error) throw error;

      setBrands([data as BrandAccount, ...brands]);
      setShowAddModal(false);
      setNewBrand({
        name: "",
        website_url: "",
        description: "",
        category: "",
        commission_percent: "",
        refund_buffer_days: "",
        email: "",
        password: "",
      });
      toast({ title: "Brand added", description: `${(data as any).name} has been created with login credentials.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500",
    approved: "bg-green-500/20 text-green-500",
    rejected: "bg-red-500/20 text-red-500",
    suspended: "bg-gray-500/20 text-gray-500",
  };

  const fields = [
    { key: "name" as const, label: "Brand Name", required: true },
    { key: "email" as const, label: "Email", required: true, type: "email" },
    { key: "password" as const, label: "Password", required: true, type: "password" },
    { key: "website_url" as const, label: "Website URL", required: true },
    { key: "commission_percent" as const, label: "Commission %", type: "number", required: true },
    { key: "refund_buffer_days" as const, label: "Refund Buffer (days)", type: "number", required: true },
    { key: "category" as const, label: "Category / Industry" },
    { key: "description" as const, label: "Description" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Brands</h1>
            <p className="text-muted-foreground">Manage brand accounts and waitlist signups.</p>
          </div>
          <div className="flex items-center gap-4">
            {waitlist.length > 0 && (
              <button
                onClick={() => {
                  const headers = [
                    "Brand Name",
                    "Website",
                    "Contact",
                    "Email",
                    "Goals",
                    "Partnership Types",
                    "Challenge",
                    "Date",
                  ];
                  const rows = waitlist.map((e) => [
                    e.brand_name,
                    e.website_url || "",
                    e.full_name,
                    e.email,
                    e.goals || "",
                    e.partnership_types || "",
                    e.biggest_challenge || "",
                    new Date(e.created_at).toLocaleDateString(),
                  ]);
                  const csv = [headers, ...rows]
                    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                    .join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "brand-waitlist.csv";
                  a.click();
                }}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="group flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Add Brand
              <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          </div>
        </div>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList>
            <TabsTrigger value="accounts">Accounts ({brands.length})</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist ({waitlist.length})</TabsTrigger>
            <TabsTrigger value="discount-codes">Discount Codes ({discountCodes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <Card>
              <CardContent className="p-0">
                {brands.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No brands yet</h3>
                    <p className="text-muted-foreground">Brand accounts will appear here when users register.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brands.map((brand) => (
                        <TableRow key={brand.id}>
                          <TableCell className="font-medium">{brand.name}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[brand.status]}>{brand.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                brand.plan_tier === "premium"
                                  ? "bg-amber-500/20 text-amber-600"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {brand.plan_tier === "premium" ? "Premium" : "Free"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(brand.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {brand.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateBrandStatus(brand.id, "approved")}
                                  >
                                    <Check className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateBrandStatus(brand.id, "rejected")}
                                  >
                                    <X className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="outline" onClick={() => togglePlanTier(brand)}>
                                <Sparkles className="h-4 w-4 mr-1" />
                                {brand.plan_tier === "premium" ? "Downgrade" : "Upgrade"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteBrand(brand)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waitlist">
            <Card>
              <CardContent className="p-0">
                {waitlist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No waitlist signups yet</h3>
                    <p className="text-muted-foreground">Brand waitlist submissions will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Brand Name</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Goals</TableHead>
                          <TableHead>Partnership Types</TableHead>
                          <TableHead>Biggest Challenge</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waitlist.map((e) => (
                          <TableRow key={e.id} className="align-top">
                            <TableCell className="font-medium">{e.brand_name}</TableCell>
                            <TableCell className="text-xs break-all max-w-[180px]">
                              {e.website_url ? (
                                <a
                                  href={e.website_url.startsWith("http") ? e.website_url : `https://${e.website_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline hover:opacity-70"
                                >
                                  {e.website_url}
                                </a>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>{e.full_name}</TableCell>
                            <TableCell className="text-muted-foreground break-all">{e.email}</TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[220px] whitespace-pre-wrap">
                              {e.goals || "—"}
                            </TableCell>
                            <TableCell className="text-xs max-w-[220px] whitespace-pre-wrap">
                              {e.partnership_types || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[300px] whitespace-pre-wrap">
                              {e.biggest_challenge || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                              {new Date(e.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discount-codes">
            <Card>
              <CardContent className="p-0">
                {discountCodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No discount codes yet</h3>
                    <p className="text-muted-foreground">Discount codes created by brands will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Uses</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expiry</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {discountCodes.map((dc: any) => {
                          const brand = brands.find((b) => b.id === dc.brand_id);
                          return (
                            <TableRow key={dc.id}>
                              <TableCell className="font-mono font-bold">{dc.code}</TableCell>
                              <TableCell>{brand?.name || dc.brand_id?.slice(0, 8)}</TableCell>
                              <TableCell>
                                {dc.discount_type === "percentage"
                                  ? `${dc.discount_value}%`
                                  : `R${Number(dc.discount_value).toFixed(0)}`}
                              </TableCell>
                              <TableCell>
                                {dc.usage_count} / {dc.usage_limit ?? "∞"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    dc.is_active
                                      ? "bg-emerald-500/20 text-emerald-600"
                                      : "bg-muted text-muted-foreground"
                                  }
                                >
                                  {dc.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {dc.expiry_date ? new Date(dc.expiry_date).toLocaleDateString() : "Never"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Brand Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="px-8 pt-8 pb-0">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">New Brand</p>
              <DialogTitle className="font-display text-2xl tracking-tight font-semibold">Add a brand</DialogTitle>
            </DialogHeader>
            <div className="px-8 pb-8 pt-6 space-y-0">
              {fields.map((field, i) => (
                <div key={field.key}>
                  {i > 0 && <div className="h-px bg-border" />}
                  <div className="py-4">
                    <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    {field.key === "description" ? (
                      <textarea
                        value={newBrand[field.key]}
                        onChange={(e) => setNewBrand({ ...newBrand, [field.key]: e.target.value })}
                        rows={3}
                        className="w-full bg-transparent border-b border-border pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
                        placeholder="Brief description of the brand"
                      />
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={newBrand[field.key]}
                        onChange={(e) => setNewBrand({ ...newBrand, [field.key]: e.target.value })}
                        className="w-full bg-transparent border-b border-border pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                        placeholder={field.label}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div className="h-px bg-border" />
              <div className="pt-6 flex items-center justify-between">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBrand}
                  disabled={
                    !newBrand.name.trim() ||
                    !newBrand.email.trim() ||
                    !newBrand.password.trim() ||
                    !newBrand.website_url.trim() ||
                    !newBrand.commission_percent.trim() ||
                    !newBrand.refund_buffer_days.trim() ||
                    saving
                  }
                  className="group flex items-center gap-2 text-sm font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-70 transition-opacity"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create Brand <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AppFooter />
      </div>
    </AdminLayout>
  );
}
