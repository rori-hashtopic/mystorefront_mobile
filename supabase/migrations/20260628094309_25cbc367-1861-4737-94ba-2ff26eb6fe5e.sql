create policy "Public read access for payment proofs"
on storage.objects for select
using (bucket_id = 'payment-proofs');

create policy "Authenticated users can upload payment proofs"
on storage.objects for insert
with check (bucket_id = 'payment-proofs' and auth.role() = 'authenticated');