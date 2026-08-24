-- Add is_discoverable column to profiles for visibility to other creators
ALTER TABLE public.profiles 
ADD COLUMN is_discoverable boolean NOT NULL DEFAULT true;

-- Create creator_wishlists table (one per user)
CREATE TABLE public.creator_wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creator_wishlist_items table
CREATE TABLE public.creator_wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_id UUID NOT NULL REFERENCES public.creator_wishlists(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(wishlist_id, link_id)
);

-- Create explore_clicks table for tracking outbound clicks
CREATE TABLE public.explore_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  viewer_user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'explore',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_explore_clicks_link_id ON public.explore_clicks(link_id);
CREATE INDEX idx_explore_clicks_viewer ON public.explore_clicks(viewer_user_id);
CREATE INDEX idx_creator_wishlist_items_wishlist ON public.creator_wishlist_items(wishlist_id);
CREATE INDEX idx_links_user_id ON public.links(user_id);

-- Enable RLS
ALTER TABLE public.creator_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explore_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies for creator_wishlists
CREATE POLICY "Users can view their own wishlist"
ON public.creator_wishlists FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wishlist"
ON public.creator_wishlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all wishlists"
ON public.creator_wishlists FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for creator_wishlist_items
CREATE POLICY "Users can view their own wishlist items"
ON public.creator_wishlist_items FOR SELECT
USING (wishlist_id IN (
  SELECT id FROM public.creator_wishlists WHERE user_id = auth.uid()
));

CREATE POLICY "Users can add items to their wishlist"
ON public.creator_wishlist_items FOR INSERT
WITH CHECK (wishlist_id IN (
  SELECT id FROM public.creator_wishlists WHERE user_id = auth.uid()
));

CREATE POLICY "Users can remove items from their wishlist"
ON public.creator_wishlist_items FOR DELETE
USING (wishlist_id IN (
  SELECT id FROM public.creator_wishlists WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can view all wishlist items"
ON public.creator_wishlist_items FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for explore_clicks
CREATE POLICY "Users can log their own clicks"
ON public.explore_clicks FOR INSERT
WITH CHECK (auth.uid() = viewer_user_id);

CREATE POLICY "Admins can view all clicks"
ON public.explore_clicks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can see clicks on their links"
ON public.explore_clicks FOR SELECT
USING (auth.uid() = creator_id);

-- Seed sample link data for explore feed (30 items across multiple creators)
INSERT INTO public.links (user_id, product_title, affiliate_url, product_image_url, retailer, description)
VALUES 
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Oversized Linen Shirt - White', 'https://example.com/product/1', 'https://picsum.photos/seed/prod1/400/400', 'Zara', 'Perfect for summer days!'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'High-Rise Mom Jeans - Vintage Blue', 'https://example.com/product/2', 'https://picsum.photos/seed/prod2/400/400', 'H&M', 'My go-to everyday piece'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Chunky Platform Sneakers', 'https://example.com/product/3', 'https://picsum.photos/seed/prod3/400/400', 'ASOS', 'Obsessed with this find'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Minimalist Gold Hoops', 'https://example.com/product/4', 'https://picsum.photos/seed/prod4/400/400', 'Cotton On', 'Such good quality'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Silk Midi Dress - Sage', 'https://example.com/product/5', 'https://picsum.photos/seed/prod5/400/400', 'Woolworths', 'A wardrobe staple'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Structured Blazer - Black', 'https://example.com/product/6', 'https://picsum.photos/seed/prod6/400/400', 'Zara', 'Office essential'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Knit Cardigan - Cream', 'https://example.com/product/7', 'https://picsum.photos/seed/prod7/400/400', 'H&M', 'Cozy vibes'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Wide Leg Trousers - Navy', 'https://example.com/product/8', 'https://picsum.photos/seed/prod8/400/400', 'ASOS', 'Dress up or down'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Canvas Tote Bag - Natural', 'https://example.com/product/9', 'https://picsum.photos/seed/prod9/400/400', 'Cotton On', 'Beach ready'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Leather Belt - Tan', 'https://example.com/product/10', 'https://picsum.photos/seed/prod10/400/400', 'Woolworths', 'Classic accessory'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Cropped Denim Jacket', 'https://example.com/product/11', 'https://picsum.photos/seed/prod11/400/400', 'Zara', 'Spring essential'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Flowy Maxi Skirt', 'https://example.com/product/12', 'https://picsum.photos/seed/prod12/400/400', 'H&M', 'Boho chic'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Statement Earrings', 'https://example.com/product/13', 'https://picsum.photos/seed/prod13/400/400', 'ASOS', 'Party ready'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Ribbed Tank Top Set', 'https://example.com/product/14', 'https://picsum.photos/seed/prod14/400/400', 'Cotton On', 'Versatile basics'),
  ('348078e2-2f4e-46ff-89a5-ef49b82b70ec', 'Suede Ankle Boots', 'https://example.com/product/15', 'https://picsum.photos/seed/prod15/400/400', 'Woolworths', 'Autumn vibes'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Running Shorts - Black', 'https://example.com/product/b1', 'https://picsum.photos/seed/prodb1/400/400', 'Nike', 'Game changer for workouts!'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Sports Bra - Rose', 'https://example.com/product/b2', 'https://picsum.photos/seed/prodb2/400/400', 'Adidas', 'Best purchase this year'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Yoga Mat - Lavender', 'https://example.com/product/b3', 'https://picsum.photos/seed/prodb3/400/400', 'Under Armour', 'Highly recommend'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Resistance Bands Set', 'https://example.com/product/b4', 'https://picsum.photos/seed/prodb4/400/400', 'Lululemon', 'Worth every cent'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Water Bottle - Mint', 'https://example.com/product/b5', 'https://picsum.photos/seed/prodb5/400/400', 'Reebok', 'Changed my routine'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Training Gloves', 'https://example.com/product/b6', 'https://picsum.photos/seed/prodb6/400/400', 'Nike', 'Gym essential'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Compression Leggings', 'https://example.com/product/b7', 'https://picsum.photos/seed/prodb7/400/400', 'Adidas', 'So comfortable'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Gym Bag - Grey', 'https://example.com/product/b8', 'https://picsum.photos/seed/prodb8/400/400', 'Under Armour', 'Fits everything'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Foam Roller - Blue', 'https://example.com/product/b9', 'https://picsum.photos/seed/prodb9/400/400', 'Lululemon', 'Recovery must-have'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Jump Rope - Pink', 'https://example.com/product/b10', 'https://picsum.photos/seed/prodb10/400/400', 'Reebok', 'Great cardio tool'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Ankle Weights', 'https://example.com/product/b11', 'https://picsum.photos/seed/prodb11/400/400', 'Nike', 'Extra burn'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Sweatband Set', 'https://example.com/product/b12', 'https://picsum.photos/seed/prodb12/400/400', 'Adidas', 'Keeps you dry'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Protein Shaker', 'https://example.com/product/b13', 'https://picsum.photos/seed/prodb13/400/400', 'Under Armour', 'No clumps'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Fitness Tracker Band', 'https://example.com/product/b14', 'https://picsum.photos/seed/prodb14/400/400', 'Lululemon', 'Tracks everything'),
  ('ecd39280-9317-422f-af15-6765521853bf', 'Muscle Recovery Cream', 'https://example.com/product/b15', 'https://picsum.photos/seed/prodb15/400/400', 'Reebok', 'Post-workout relief');