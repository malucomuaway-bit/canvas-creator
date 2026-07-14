import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUnlocked } from "./gate.server";

export type PurchaseHistory = {
  id: string;
  purchased_at: string;
  total: number;
  market_id: string | null;
  market_name: string | null;
  items: Array<{ name: string; quantity: number; paid_price: number | null }>;
};

export const listHistory = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("purchase_history")
    .select("*")
    .order("purchased_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as PurchaseHistory[];
});

// Fecha a compra em andamento: pega itens checked, cria snapshot,
// atualiza last_bought_at nos itens e limpa/mantém baseado em recorrência.
export const closePurchase = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        market_id: z.string().uuid().nullable().optional(),
        market_name: z.string().max(60).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    const { data: items, error: e1 } = await s
      .from("shopping_items")
      .select("*")
      .eq("checked", true);
    if (e1) throw e1;
    if (!items || items.length === 0) return { ok: false as const, reason: "empty" };

    const total = items.reduce(
      (sum: number, i: any) => sum + Number(i.paid_price ?? 0) * Number(i.quantity ?? 1),
      0,
    );

    const { error: e2 } = await s.from("purchase_history").insert({
      total,
      market_id: data.market_id ?? null,
      market_name: data.market_name ?? null,
      items: items.map((i: any) => ({
        name: i.name,
        quantity: Number(i.quantity ?? 1),
        paid_price: i.paid_price != null ? Number(i.paid_price) : null,
      })),
    });
    if (e2) throw e2;

    // Recorrentes: desmarca e atualiza last_bought_at (para voltar no próximo ciclo).
    // Não-recorrentes: deleta.
    const now = new Date().toISOString();
    const recurring = items.filter((i: any) => i.recurrence && i.recurrence !== "none");
    const oneShot = items.filter((i: any) => !i.recurrence || i.recurrence === "none");

    if (recurring.length) {
      const { error: e3 } = await s
        .from("shopping_items")
        .update({ checked: false, paid_price: null, last_bought_at: now })
        .in("id", recurring.map((i: any) => i.id));
      if (e3) throw e3;
    }
    if (oneShot.length) {
      const { error: e4 } = await s
        .from("shopping_items")
        .delete()
        .in("id", oneShot.map((i: any) => i.id));
      if (e4) throw e4;
    }

    return { ok: true as const, total, count: items.length };
  });
