
-- MARKETS
CREATE TABLE public.markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.markets TO authenticated;
GRANT ALL ON public.markets TO service_role;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service manages markets" ON public.markets FOR ALL USING (true) WITH CHECK (true);

-- STOCK
CREATE TABLE public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text,
  category text,
  expires_at date,
  min_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service manages stock" ON public.stock_items FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER stock_items_set_updated_at BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PURCHASE HISTORY
CREATE TABLE public.purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  total numeric NOT NULL DEFAULT 0,
  market_id uuid REFERENCES public.markets(id) ON DELETE SET NULL,
  market_name text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_history TO authenticated;
GRANT ALL ON public.purchase_history TO service_role;
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service manages history" ON public.purchase_history FOR ALL USING (true) WITH CHECK (true);

-- SHOPPING ITEMS additions
ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS market_id uuid REFERENCES public.markets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS last_bought_at timestamptz;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_history;
ALTER TABLE public.shopping_items REPLICA IDENTITY FULL;
ALTER TABLE public.stock_items REPLICA IDENTITY FULL;
