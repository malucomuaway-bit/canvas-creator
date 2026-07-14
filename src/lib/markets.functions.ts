import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUnlocked } from "./gate.server";

export type Market = { id: string; name: string; color: string };

export const listMarkets = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("markets")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Market[];
});

export const addMarket = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        name: z.string().trim().min(1).max(60),
        color: z.string().max(20).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("markets")
      .insert({ name: data.name, color: data.color ?? "#64748b" });
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteMarket = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("markets").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
