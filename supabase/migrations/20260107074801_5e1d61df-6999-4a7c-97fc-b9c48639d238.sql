-- Add admin access to brand_saved_lists
CREATE POLICY "Admins can view all saved lists"
ON public.brand_saved_lists
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin access to brand_saved_list_items
CREATE POLICY "Admins can view all saved list items"
ON public.brand_saved_list_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));