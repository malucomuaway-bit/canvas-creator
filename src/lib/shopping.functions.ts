import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUnlocked } from "./gate.server";

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  estimated_price: number | null;
  paid_price: number | null;
  checked: boolean;
  category: string | null;
  position: number;
};

export const listShopping = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("shopping_items")
    .select("*")
    .order("checked", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  const budget = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "budget")
    .maybeSingle();
  return {
    items: (data ?? []) as ShoppingItem[],
    budget: ((budget.data?.value as { monthly?: number } | null)?.monthly ?? 0) as number,
  };
});

export const addShoppingItem = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        name: z.string().trim().min(1).max(100),
        quantity: z.number().positive().default(1),
        unit: z.string().max(20).nullable().optional(),
        estimated_price: z.number().nonnegative().nullable().optional(),
        category: z.string().max(50).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("shopping_items").insert({
      name: data.name,
      quantity: data.quantity,
      unit: data.unit ?? null,
      estimated_price: data.estimated_price ?? null,
      category: data.category ?? null,
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const updateShoppingItem = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        checked: z.boolean().optional(),
        paid_price: z.number().nonnegative().nullable().optional(),
        estimated_price: z.number().nonnegative().nullable().optional(),
        quantity: z.number().positive().optional(),
        name: z.string().trim().min(1).max(100).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { id, ...updates } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("shopping_items").update(updates).eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteShoppingItem = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("shopping_items").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const clearChecked = createServerFn({ method: "POST" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("shopping_items").delete().eq("checked", true);
  if (error) throw error;
  return { ok: true as const };
});

export const setBudget = createServerFn({ method: "POST" })
  .validator((data) => z.object({ monthly: z.number().nonnegative() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: "budget", value: { monthly: data.monthly } });
    if (error) throw error;
    return { ok: true as const };
  });