
-- affiliate_clicks → links
ALTER TABLE public.affiliate_clicks
  DROP CONSTRAINT affiliate_clicks_link_id_fkey,
  ADD CONSTRAINT affiliate_clicks_link_id_fkey
    FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;

-- outbound_clicks → links
ALTER TABLE public.outbound_clicks
  DROP CONSTRAINT outbound_clicks_link_id_fkey,
  ADD CONSTRAINT outbound_clicks_link_id_fkey
    FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;

-- explore_clicks → links
ALTER TABLE public.explore_clicks
  DROP CONSTRAINT explore_clicks_link_id_fkey,
  ADD CONSTRAINT explore_clicks_link_id_fkey
    FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;

-- creator_wishlist_items → links
ALTER TABLE public.creator_wishlist_items
  DROP CONSTRAINT creator_wishlist_items_link_id_fkey,
  ADD CONSTRAINT creator_wishlist_items_link_id_fkey
    FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;
