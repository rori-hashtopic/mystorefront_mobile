
-- Create 6 dummy auth users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('a1b2c3d4-1111-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zendaya@demo.com', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Zendaya Coleman"}'),
  ('a1b2c3d4-2222-4000-a000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chiara@demo.com', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Chiara Ferragni"}'),
  ('a1b2c3d4-3333-4000-a000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emma@demo.com', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Emma Chamberlain"}'),
  ('a1b2c3d4-4444-4000-a000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thandiwe@demo.com', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Thandiwe Moloi"}'),
  ('a1b2c3d4-5555-4000-a000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'james@demo.com', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"James Chen"}'),
  ('a1b2c3d4-6666-4000-a000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aaliya@demo.com', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{"display_name":"Aaliya Patel"}')
ON CONFLICT (id) DO NOTHING;

-- Create identities for each user
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1b2c3d4-1111-4000-a000-000000000001', 'a1b2c3d4-1111-4000-a000-000000000001', 'zendaya@demo.com', 'email', '{"sub":"a1b2c3d4-1111-4000-a000-000000000001","email":"zendaya@demo.com"}', now(), now(), now()),
  ('a1b2c3d4-2222-4000-a000-000000000002', 'a1b2c3d4-2222-4000-a000-000000000002', 'chiara@demo.com', 'email', '{"sub":"a1b2c3d4-2222-4000-a000-000000000002","email":"chiara@demo.com"}', now(), now(), now()),
  ('a1b2c3d4-3333-4000-a000-000000000003', 'a1b2c3d4-3333-4000-a000-000000000003', 'emma@demo.com', 'email', '{"sub":"a1b2c3d4-3333-4000-a000-000000000003","email":"emma@demo.com"}', now(), now(), now()),
  ('a1b2c3d4-4444-4000-a000-000000000004', 'a1b2c3d4-4444-4000-a000-000000000004', 'thandiwe@demo.com', 'email', '{"sub":"a1b2c3d4-4444-4000-a000-000000000004","email":"thandiwe@demo.com"}', now(), now(), now()),
  ('a1b2c3d4-5555-4000-a000-000000000005', 'a1b2c3d4-5555-4000-a000-000000000005', 'james@demo.com', 'email', '{"sub":"a1b2c3d4-5555-4000-a000-000000000005","email":"james@demo.com"}', now(), now(), now()),
  ('a1b2c3d4-6666-4000-a000-000000000006', 'a1b2c3d4-6666-4000-a000-000000000006', 'aaliya@demo.com', 'email', '{"sub":"a1b2c3d4-6666-4000-a000-000000000006","email":"aaliya@demo.com"}', now(), now(), now())
ON CONFLICT DO NOTHING;

-- Update profiles with full data
UPDATE profiles SET display_name = 'Zendaya Coleman', bio = 'Actress, model, and fashion icon. Curating bold looks that push boundaries and inspire confidence.', niche_tags = ARRAY['Fashion', 'Beauty', 'Entertainment'], location_tags = ARRAY['Los Angeles', 'USA'], instagram_connected = true, username = 'zendayacoleman', tier = 'ambassador', is_discoverable = true, onboarding_completed = true, onboarding_step = 5 WHERE id = 'a1b2c3d4-1111-4000-a000-000000000001';

UPDATE profiles SET display_name = 'Chiara Ferragni', bio = 'Digital entrepreneur and fashion influencer. Sharing my favorite Italian-inspired style picks from around the world.', niche_tags = ARRAY['Fashion', 'Luxury', 'Travel'], location_tags = ARRAY['Milan', 'Italy'], instagram_connected = true, username = 'chiaraferragni', tier = 'trendsetter', is_discoverable = true, onboarding_completed = true, onboarding_step = 5 WHERE id = 'a1b2c3d4-2222-4000-a000-000000000002';

UPDATE profiles SET display_name = 'Emma Chamberlain', bio = 'Coffee lover, thrifter, and content creator. Here to share my everyday finds and lifestyle favorites.', niche_tags = ARRAY['Lifestyle', 'Fashion', 'Coffee'], location_tags = ARRAY['Los Angeles', 'USA'], instagram_connected = true, username = 'emmachamberlain', tier = 'icon', is_discoverable = true, onboarding_completed = true, onboarding_step = 5 WHERE id = 'a1b2c3d4-3333-4000-a000-000000000003';

UPDATE profiles SET display_name = 'Thandiwe Moloi', bio = 'South African beauty and skincare enthusiast. Celebrating African beauty brands and natural skincare routines.', niche_tags = ARRAY['Beauty', 'Skincare', 'Wellness'], location_tags = ARRAY['Johannesburg', 'South Africa'], instagram_connected = false, username = 'thandiwemoloi', tier = 'enthusiast', is_discoverable = true, onboarding_completed = true, onboarding_step = 5 WHERE id = 'a1b2c3d4-4444-4000-a000-000000000004';

UPDATE profiles SET display_name = 'James Chen', bio = 'Tech reviewer and gadget enthusiast. Sharing honest reviews and the best deals on electronics.', niche_tags = ARRAY['Tech', 'Gadgets', 'Lifestyle'], location_tags = ARRAY['Singapore'], instagram_connected = true, username = 'jameschen', tier = 'ambassador', is_discoverable = true, onboarding_completed = true, onboarding_step = 5 WHERE id = 'a1b2c3d4-5555-4000-a000-000000000005';

UPDATE profiles SET display_name = 'Aaliya Patel', bio = 'Fitness coach and wellness advocate. MyStorefront features activewear, supplements, and healthy living essentials.', niche_tags = ARRAY['Fitness', 'Wellness', 'Activewear'], location_tags = ARRAY['Cape Town', 'South Africa'], instagram_connected = true, username = 'aaliyapatel', tier = 'trendsetter', is_discoverable = true, onboarding_completed = true, onboarding_step = 5 WHERE id = 'a1b2c3d4-6666-4000-a000-000000000006';

-- Assign creator roles
INSERT INTO user_roles (user_id, role)
VALUES
  ('a1b2c3d4-1111-4000-a000-000000000001', 'creator'),
  ('a1b2c3d4-2222-4000-a000-000000000002', 'creator'),
  ('a1b2c3d4-3333-4000-a000-000000000003', 'creator'),
  ('a1b2c3d4-4444-4000-a000-000000000004', 'creator'),
  ('a1b2c3d4-5555-4000-a000-000000000005', 'creator'),
  ('a1b2c3d4-6666-4000-a000-000000000006', 'creator')
ON CONFLICT (user_id, role) DO NOTHING;
