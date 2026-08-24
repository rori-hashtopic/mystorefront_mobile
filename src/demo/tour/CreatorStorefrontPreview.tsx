import { Link2 } from "lucide-react";
import samPhoto from "@/assets/demo/creator-2-sam.png";

const products = [
  {
    name: "Cleansing Balm",
    price: "R 380",
    retailer: "SKIN functional",
    image:
      "https://skinfunctional.com/cdn/shop/files/cleansing-balm-1.webp?v=1755778470",
  },
  {
    name: "All The Shade SPF 30",
    price: "R 520",
    retailer: "lelive",
    image:
      "https://www.lelive.us/cdn/shop/files/alltheshade_1_8bd9522d-8292-45b1-8937-067f1e12c356.jpg?v=1721852008",
  },
  {
    name: "Plush Half Zip Sweat",
    price: "R 699",
    retailer: "Cotton On",
    image:
      "https://cottonon.com/dw/image/v2/BBDS_PRD/on/demandware.static/-/Sites-catalog-master-body/default/dw53292549/6339198/6339198-02-2.jpg?sw=640&sh=960&sm=fit",
  },
];

export function CreatorStorefrontPreview() {
  return (
    <div className="flex flex-col items-center">
      {/* Phone-frame card */}
      <div className="relative w-full max-w-[260px] rounded-[28px] border border-border bg-card shadow-sm overflow-hidden">
        {/* Mock notch */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-14 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Creator header */}
        <div className="px-4 pt-3 pb-3 flex items-center gap-2.5 border-b border-border">
          <div className="h-9 w-9 shrink-0 aspect-square rounded-full overflow-hidden bg-muted">
            <img
              src={samPhoto}
              alt="Sam Solomons"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-tight truncate">
              Sam Solomons
            </p>
            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
              Durban-based wellness creator sharing the products I love &lt;3
            </p>
          </div>
        </div>

        {/* Products */}
        <div className="p-3 space-y-2 bg-secondary/30">
          {products.map((p) => (
            <div
              key={p.name}
              className="bg-card border border-border rounded-lg p-2 flex items-center gap-2.5"
            >
              <div className="h-10 w-10 rounded-md bg-muted shrink-0 overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{p.retailer}</p>
                <p className="text-[10px] text-muted-foreground">{p.price}</p>
                <p className="text-[9px] text-emerald-700 flex items-center gap-1 mt-0.5">
                  <Link2 className="h-2.5 w-2.5" />
                  Tracked
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
