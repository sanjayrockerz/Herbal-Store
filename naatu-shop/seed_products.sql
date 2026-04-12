-- Compact Product Reset Script
-- Run this in Supabase SQL Editor to keep only 4 clean products.
-- This removes old oversized or malformed product rows.

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_ta TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS remedy TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS offer_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '/assets/images/default-herb.jpg';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '100g';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 4.7;

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND COALESCE(p.role, 'customer') = 'admin'
    )
  );

DROP POLICY IF EXISTS "products_admin_update" ON public.products;
CREATE POLICY "products_admin_update" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND COALESCE(p.role, 'customer') = 'admin'
    )
  );

DROP POLICY IF EXISTS "products_admin_delete" ON public.products;
CREATE POLICY "products_admin_delete" ON public.products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND COALESCE(p.role, 'customer') = 'admin'
    )
  );

TRUNCATE TABLE public.products RESTART IDENTITY;

INSERT INTO public.products (
  name,
  name_ta,
  category,
  remedy,
  price,
  offer_price,
  description,
  benefits,
  image,
  stock,
  unit,
  rating
) VALUES
(
  'Sukku Powder',
  'சுக்கு பொடி',
  'Herbal Powder',
  ARRAY['Cold & Cough', 'Digestion'],
  80,
  69,
  'Traditional dry ginger powder used in Siddha formulations.',
  'Helps digestion and relieves cold symptoms.',
  'https://images.unsplash.com/photo-1615485925873-7ecbbe90a23c?w=800&q=80',
  40,
  '100g',
  4.8
),
(
  'Nilavembu Powder',
  'நிலவேம்பு பொடி',
  'Herbal Powder',
  ARRAY['Immunity', 'Fever'],
  70,
  62,
  'Andrographis paniculata powder prepared in small batches.',
  'Supports immunity and seasonal wellness.',
  'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80',
  35,
  '100g',
  4.7
),
(
  'Bhringaraj Hair Oil',
  'பிரிங்கராஜ் எண்ணெய்',
  'Herbal Oil',
  ARRAY['Hair Growth', 'Skin Care'],
  180,
  159,
  'Cold-infused bhringaraj oil for scalp nourishment.',
  'Helps reduce hair fall and supports scalp health.',
  'https://images.unsplash.com/photo-1617897903246-719242758050?w=800&q=80',
  28,
  '200ml',
  4.9
),
(
  'Triphala Powder',
  'திரிபலா பொடி',
  'Herbal Powder',
  ARRAY['Digestion', 'Immunity'],
  95,
  85,
  'Classical three-fruit blend for daily digestive support.',
  'Aids digestion and detox support in routine use.',
  'https://images.unsplash.com/photo-1514996937319-344454492b37?w=800&q=80',
  32,
  '100g',
  4.8
);

SELECT COUNT(*) AS seeded_products FROM public.products;
