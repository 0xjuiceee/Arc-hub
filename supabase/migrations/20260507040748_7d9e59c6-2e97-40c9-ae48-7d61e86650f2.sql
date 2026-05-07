CREATE TABLE public.tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT,
  creator_address TEXT NOT NULL,
  bonding_curve_address TEXT,
  base_price TEXT NOT NULL DEFAULT '100000000000000',
  slope TEXT NOT NULL DEFAULT '1000000000000',
  current_price TEXT NOT NULL DEFAULT '0.0001',
  market_cap TEXT NOT NULL DEFAULT '0',
  volume_24h TEXT NOT NULL DEFAULT '0',
  total_trades INTEGER NOT NULL DEFAULT 0,
  total_supply TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  trader_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy','sell')),
  amount_tokens TEXT NOT NULL DEFAULT '0',
  price TEXT NOT NULL DEFAULT '0',
  total_ritual TEXT NOT NULL DEFAULT '0',
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.price_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  price TEXT NOT NULL,
  market_cap TEXT NOT NULL DEFAULT '0',
  total_supply TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tokens" ON public.tokens FOR SELECT USING (true);
CREATE POLICY "Public insert tokens" ON public.tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tokens" ON public.tokens FOR UPDATE USING (true);

CREATE POLICY "Public read trades" ON public.trades FOR SELECT USING (true);
CREATE POLICY "Public insert trades" ON public.trades FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read snapshots" ON public.price_snapshots FOR SELECT USING (true);
CREATE POLICY "Public insert snapshots" ON public.price_snapshots FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read config" ON public.config FOR SELECT USING (true);
CREATE POLICY "Public insert config" ON public.config FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update config" ON public.config FOR UPDATE USING (true);

CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles" ON public.profiles FOR UPDATE USING (true);

CREATE INDEX idx_tokens_created ON public.tokens (created_at DESC);
CREATE INDEX idx_tokens_volume ON public.tokens (volume_24h DESC);
CREATE INDEX idx_trades_token ON public.trades (token_address, created_at DESC);
CREATE INDEX idx_trades_trader ON public.trades (trader_address, created_at DESC);
CREATE INDEX idx_snap_token ON public.price_snapshots (token_address, created_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('token-images','token-images',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures','profile-pictures',true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Token images public read" ON storage.objects FOR SELECT USING (bucket_id = 'token-images');
CREATE POLICY "Token images public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'token-images');
CREATE POLICY "Token images public update" ON storage.objects FOR UPDATE USING (bucket_id = 'token-images');

CREATE POLICY "Profile pics public read" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pictures');
CREATE POLICY "Profile pics public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-pictures');
CREATE POLICY "Profile pics public update" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-pictures');