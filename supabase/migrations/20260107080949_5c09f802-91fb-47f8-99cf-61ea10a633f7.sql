-- Allow admins and creators to also use shopper features (follows/wishlists)

-- Update shopper_follows policies to allow admins and creators
DROP POLICY IF EXISTS "Shoppers can view their own follows" ON public.shopper_follows;
CREATE POLICY "Users can view their own follows"
ON public.shopper_follows
FOR SELECT
USING (auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Shoppers can follow creators" ON public.shopper_follows;
CREATE POLICY "Users can follow creators"
ON public.shopper_follows
FOR INSERT
WITH CHECK (auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Shoppers can unfollow creators" ON public.shopper_follows;
CREATE POLICY "Users can unfollow creators"
ON public.shopper_follows
FOR DELETE
USING (auth.uid() = shopper_id);

-- Admins can view all follows
CREATE POLICY "Admins can view all follows"
ON public.shopper_follows
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update shopper_wishlists policies to allow admins and creators
DROP POLICY IF EXISTS "Shoppers can view their own wishlist" ON public.shopper_wishlists;
CREATE POLICY "Users can view their own wishlist"
ON public.shopper_wishlists
FOR SELECT
USING (auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Shoppers can add to wishlist" ON public.shopper_wishlists;
CREATE POLICY "Users can add to wishlist"
ON public.shopper_wishlists
FOR INSERT
WITH CHECK (auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Shoppers can remove from wishlist" ON public.shopper_wishlists;
CREATE POLICY "Users can remove from wishlist"
ON public.shopper_wishlists
FOR DELETE
USING (auth.uid() = shopper_id);

-- Admins can view all wishlists
CREATE POLICY "Admins can view all wishlists"
ON public.shopper_wishlists
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update shopper_activity policies similarly
DROP POLICY IF EXISTS "Shoppers can view their own activity" ON public.shopper_activity;
CREATE POLICY "Users can view their own activity"
ON public.shopper_activity
FOR SELECT
USING (auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Shoppers can log their activity" ON public.shopper_activity;
CREATE POLICY "Users can log their activity"
ON public.shopper_activity
FOR INSERT
WITH CHECK (auth.uid() = shopper_id);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity"
ON public.shopper_activity
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));