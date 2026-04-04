-- ============================================================
-- Sri Siddha Herbal Store — Supabase Database Schema
-- Run this in Supabase SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- PROFILES — extends Supabase auth.users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  mobile      TEXT DEFAULT '',
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin','customer')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ─────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          BIGSERIAL PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_ta     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read categories" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

INSERT INTO public.categories (name_en, name_ta) VALUES
  ('Herbal Powder', 'மூலிகை பொடி'),
  ('Herbal Oil', 'மூலிகை எண்ணெய்'),
  ('Herbal Root', 'மூலிகை வேர்'),
  ('Herbal Spice', 'மூலிகை மசாலா'),
  ('Herbal Gel', 'மூலிகை ஜெல்'),
  ('Mineral Herb', 'தாது மூலிகை'),
  ('Herbal Tablet', 'மூலிகை மாத்திரை'),
  ('Herbal Leaf', 'மூலிகை இலை'),
  ('Herbal Product', 'மூலிகை பொருள்')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- HEALTH TAGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_tags (
  id          BIGSERIAL PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_ta     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read health_tags" ON public.health_tags
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin manage health_tags" ON public.health_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

INSERT INTO public.health_tags (name_en, name_ta) VALUES
  ('Cold & Cough', 'சளி மற்றும் இருமல்'),
  ('Digestion', 'செரிமானம்'),
  ('Hair Growth', 'முடி வளர்ச்சி'),
  ('Immunity', 'நோய் எதிர்ப்பு சக்தி'),
  ('Skin Care', 'சரும பராமரிப்பு'),
  ('Stress', 'மன அழுத்தம்'),
  ('Fever', 'காய்ச்சல்'),
  ('Joint Pain', 'மூட்டு வலி'),
  ('Diabetes', 'நீரிழிவு'),
  ('Weight Loss', 'எடை குறைப்பு')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  name_ta       TEXT DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'Herbal Product',
  remedy        TEXT[] DEFAULT '{}',
  price         NUMERIC(10,2) NOT NULL,
  offer_price   NUMERIC(10,2),
  description   TEXT DEFAULT '',
  description_ta TEXT DEFAULT '',
  benefits      TEXT DEFAULT '',
  benefits_ta   TEXT DEFAULT '',
  image         TEXT DEFAULT '/assets/images/default-herb.jpg',
  stock         INTEGER NOT NULL DEFAULT 0,
  unit          TEXT DEFAULT '100g',
  rating        NUMERIC(3,1) DEFAULT 4.7,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read products" ON public.products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin manage products" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no    TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address       TEXT NOT NULL,
  items         JSONB NOT NULL DEFAULT '[]',
  subtotal      NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User can insert orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admin can view all orders" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin can update orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Allow anon read for guest orders
CREATE POLICY "Anon can insert guest orders" ON public.orders
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);


-- ─────────────────────────────────────────────────────────────
-- INVOICE COUNTER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_counter (
  id       INTEGER PRIMARY KEY DEFAULT 1,
  counter  INTEGER NOT NULL DEFAULT 0,
  year     INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())
);

CREATE POLICY "Anyone can read counter" ON public.invoice_counter
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can update counter" ON public.invoice_counter
  FOR UPDATE TO anon, authenticated USING (true);

ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;

INSERT INTO public.invoice_counter (id, counter, year) VALUES (1, 0, EXTRACT(YEAR FROM NOW())::INTEGER)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine role: special admin email gets admin role
  INSERT INTO public.profiles (id, name, mobile, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    NEW.email,
    CASE WHEN NEW.email = 'admin@srisiddha.com' THEN 'admin' ELSE 'customer' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- FUNCTION: get_next_invoice_no
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_next_invoice_no()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  cnt INTEGER;
BEGIN
  -- Reset counter if year changed
  UPDATE public.invoice_counter
  SET counter = CASE WHEN year = current_year THEN counter + 1 ELSE 1 END,
      year = current_year
  WHERE id = 1
  RETURNING counter INTO cnt;
  
  RETURN 'INV-' || current_year || '-' || LPAD(cnt::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_next_invoice_no() TO anon, authenticated;
