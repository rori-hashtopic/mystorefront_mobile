import { useState } from "react";
import {
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  FolderPlus,
  Link2,
} from "lucide-react";
import { buildAffiliateRedirectUrl } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, type Variants } from "framer-motion";

export interface ProductItem {
  id: string;
  title: string;
  image_url: string | null;
  retailer: string | null;
  description: string | null;
  affiliate_url: string;
  sort_order?: number;
}

interface AllProductsGridProps {
  products: ProductItem[];
  isLoading?: boolean;
  isCreatorView: boolean;
  onAddProduct?: () => void;
  onProductsChange?: () => void;
  onProductClick?: (product: ProductItem) => void;
  onEditProduct?: (product: ProductItem) => void;
  onAddToCollection?: (product: ProductItem) => void;
  searchQuery?: string;
  onReorder?: (reorderedProducts: ProductItem[]) => void;
  creatorUsername?: string | null;
}

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export function AllProductsGrid({
  products,
  isLoading = false,
  isCreatorView,
  onAddProduct,
  onProductsChange,
  onProductClick,
  onEditProduct,
  onAddToCollection,
  searchQuery = "",
  onReorder,
  creatorUsername,
}: AllProductsGridProps) {
  const { toast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Filter products based on search query
  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.title.toLowerCase().includes(query) ||
      (product.retailer && product.retailer.toLowerCase().includes(query)) ||
      (product.description && product.description.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i}>
            <Skeleton className="aspect-[3/4] w-full rounded-none mb-3 sm:mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0 && isCreatorView && onAddProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
        <p className="font-display text-base sm:text-lg text-foreground mb-2">No products yet</p>
        <p className="text-sm text-muted-foreground mb-6 sm:mb-8 max-w-sm">
          Add products to start curating your storefront.
        </p>
        <button
          onClick={onAddProduct}
          className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group min-h-[44px]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="border-b border-foreground group-hover:border-transparent transition-colors">
            Add product
          </span>
        </button>
      </div>
    );
  }

  if (products.length === 0 && !isCreatorView) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
        <p className="font-display text-base sm:text-lg text-foreground mb-2">No products yet</p>
        <p className="text-sm text-muted-foreground max-w-sm">This creator hasn't added any products yet.</p>
      </div>
    );
  }

  if (filteredProducts.length === 0 && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
        <p className="font-display text-base sm:text-lg text-foreground mb-2">No results</p>
        <p className="text-sm text-muted-foreground">No products found matching "{searchQuery}"</p>
      </div>
    );
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from("links").delete().eq("id", productId);

      if (error) throw error;
      toast({ title: "Product deleted" });
      setDeleteConfirmId(null);
      onProductsChange?.();
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopyAffiliateLink = async (product: ProductItem) => {
    try {
      const url = buildAffiliateRedirectUrl(product.id, creatorUsername ?? undefined, "shop");
      await navigator.clipboard.writeText(url);
      toast({ title: "Affiliate link copied" });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleProductClickInternal = (product: ProductItem) => {
    if (isCreatorView || isReordering) return;
    if (!isCreatorView) {
      if (onProductClick) {
        onProductClick(product);
      } else {
        window.open(product.affiliate_url, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handleMoveProduct = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredProducts.length) return;

    const newList = [...filteredProducts];
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];

    // Update sort_order in DB for swapped items
    const updates = newList.map((p, i) =>
      supabase
        .from("links")
        .update({ sort_order: i } as any)
        .eq("id", p.id),
    );

    try {
      await Promise.all(updates);
      onReorder?.(newList);
      onProductsChange?.();
    } catch (err: any) {
      toast({ title: "Failed to reorder", description: err.message, variant: "destructive" });
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newList = [...filteredProducts];
    const [moved] = newList.splice(dragIndex, 1);
    newList.splice(dropIndex, 0, moved);

    onReorder?.(newList);
    setDragIndex(null);
    setDragOverIndex(null);

    const updates = newList.map((p, i) =>
      supabase
        .from("links")
        .update({ sort_order: i } as any)
        .eq("id", p.id),
    );

    try {
      await Promise.all(updates);
      onProductsChange?.();
    } catch (err: any) {
      toast({ title: "Failed to reorder", description: err.message, variant: "destructive" });
      onProductsChange?.();
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      {/* Reorder toggle for creator */}
      {isCreatorView && products.length > 1 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsReordering(!isReordering)}
            className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group"
          >
            <GripVertical className="h-3.5 w-3.5" />
            <span className="border-b border-foreground group-hover:border-transparent transition-colors">
              {isReordering ? "Done" : "Reorder"}
            </span>
          </button>
        </div>
      )}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {filteredProducts.map((product, index) => {
          const isHovered = hoveredProductId === product.id;

          return (
            <motion.article
              key={product.id}
              variants={fadeInUp}
              className={`group relative ${isReordering ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${isReordering && dragOverIndex === index && dragIndex !== index ? "ring-2 ring-foreground/40 ring-offset-2" : ""} ${isReordering && dragIndex === index ? "opacity-40" : ""}`}
              onMouseEnter={() => !isReordering && setHoveredProductId(product.id)}
              onMouseLeave={() => setHoveredProductId(null)}
              onClick={() => !isReordering && handleProductClickInternal(product)}
              draggable={isReordering}
              onDragStart={(e) => isReordering && handleDragStart(e as unknown as React.DragEvent, index)}
              onDragOver={(e) => isReordering && handleDragOver(e as unknown as React.DragEvent, index)}
              onDrop={(e) => isReordering && handleDrop(e as unknown as React.DragEvent, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Product Image */}
              <div className="aspect-[3/4] overflow-hidden bg-muted relative mb-3 sm:mb-4">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">No image</span>
                  </div>
                )}

                {/* Reorder overlay */}
                {isCreatorView && isReordering && (
                  <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center gap-3 animate-in fade-in duration-150">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-9 w-9 rounded-full"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveProduct(index, "up");
                      }}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-background font-medium tabular-nums">{index + 1}</span>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-9 w-9 rounded-full"
                      disabled={index === filteredProducts.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveProduct(index, "down");
                      }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Hover overlay for creator - hidden on touch, visible on hover */}
                {isCreatorView && !isReordering && isHovered && (
                  <div className="absolute inset-0 bg-foreground/80 flex flex-col items-center justify-center gap-2 p-3 sm:p-4 animate-in fade-in duration-150">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-32 h-8 text-[11px] uppercase tracking-wider justify-start px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProduct?.(product);
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-32 h-8 text-[11px] uppercase tracking-wider justify-start px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyAffiliateLink(product);
                      }}
                    >
                      <Link2 className="h-3 w-3 mr-2" />
                      Copy Link
                    </Button>
                    {onAddToCollection && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-32 h-8 text-[11px] uppercase tracking-wider justify-start px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCollection(product);
                        }}
                      >
                        <FolderPlus className="h-3 w-3 mr-2" />
                        Collection
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-32 h-8 text-[11px] uppercase tracking-wider justify-start px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(product.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}

                {/* Hover overlay for shopper */}
                {!isCreatorView && isHovered && (
                  <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-background">
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.15em] font-medium">Shop</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-0.5 sm:space-y-1">
                <h4 className="font-display text-sm sm:text-base leading-snug text-foreground line-clamp-2 group-hover:underline underline-offset-2 transition-all">
                  {product.title}
                </h4>
                {product.retailer && <p className="text-xs text-muted-foreground truncate">{product.retailer}</p>}
                {product.description && (
                  <p className="text-sm italic text-foreground/70 line-clamp-2 mt-1.5 leading-relaxed font-serif">
                    "{product.description}"
                  </p>
                )}
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product from your storefront. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDeleteProduct(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
