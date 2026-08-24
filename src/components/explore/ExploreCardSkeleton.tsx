import { Skeleton } from "@/components/ui/skeleton";

export function ExploreProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[3/4] w-full rounded-none mb-4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="h-px bg-border mt-6" />
    </div>
  );
}

export function ExploreCreatorCardSkeleton() {
  return (
    <div className="py-8 first:pt-0">
      <div className="flex items-start gap-6 sm:gap-8">
        <Skeleton className="h-4 w-4 hidden sm:block" />
        <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-24 mt-2" />
        </div>
      </div>
      <div className="h-px bg-border mt-8" />
    </div>
  );
}

export function ExploreBrandCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/3] w-full rounded-none mb-5" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24 mt-2" />
      </div>
      <div className="h-px bg-border mt-6" />
    </div>
  );
}
