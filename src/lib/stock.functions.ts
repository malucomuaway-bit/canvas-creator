import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUnlocked } from "./gate.server";

export type StockItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  expires_at: string | null;
  min_quantity: number;
  updated_at: string;
};

export const listStock = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("stock_items")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StockItem[];
});

export const addStockItem = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        name: z.string().trim().min(1).max(100),
        quantity: z.number().nonnegative().default(1),
        unit: z.string().max(20).nullable().optional(),
        category: z.string().max(50).nullable().optional(),
        expires_at: z.string().nullable().optional(),
        min_quantity: z.number().nonnegative().default(0),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("stock_items").insert(data);
    if (error) throw error;
    return { ok: true as const };
  });

export const updateStockItem = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(100).optional(),
        quantity: z.number().nonnegative().optional(),
        unit: z.string().max(20).nullable().optional(),
        category: z.string().max(50).nullable().optional(),
        expires_at: z.string().nullable().optional(),
        min_quantity: z.number().nonnegative().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { id, ...updates } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("stock_items").update(updates).eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteStockItem = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("stock_items").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

// "Acabou" → move o item do estoque pra lista de compras
export const stockToShopping = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    const { data: row, error: err1 } = await s.from("stock_items").select("*").eq("id", data.id).maybeSingle();
    if (err1) throw err1;
    if (!row) return { ok: false as const };
    const { error: err2 } = await s.from("shopping_items").insert({
      name: row.name,
      quantity: Math.max(1, row.min_quantity || 1),
      unit: row.unit,
      category: row.category,
    });
    if (err2) throw err2;
    return { ok: true as const };
  });
