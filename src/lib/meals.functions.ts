import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUnlocked } from "./gate.server";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Meal = {
  id: string;
  day_of_week: number;
  meal_type: MealType;
  name: string;
  ingredients: string[];
  notes: string | null;
};

export const listMeals = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("meals")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("meal_type", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((m) => ({
    ...m,
    ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
  })) as Meal[];
});

export const addMeal = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        day_of_week: z.number().int().min(0).max(6),
        meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        name: z.string().trim().min(1).max(100),
        ingredients: z.array(z.string().trim().min(1)).default([]),
        notes: z.string().max(500).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("meals").insert(data);
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteMeal = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("meals").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

// Manda os ingredientes de uma refeição pra lista de compras
export const mealToShopping = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    const { data: meal, error: e1 } = await s.from("meals").select("*").eq("id", data.id).maybeSingle();
    if (e1) throw e1;
    if (!meal) return { ok: false as const, count: 0 };
    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
    if (ingredients.length === 0) return { ok: true as const, count: 0 };
    const rows = ingredients.map((name: string) => ({ name: String(name).slice(0, 100), quantity: 1 }));
    const { error: e2 } = await s.from("shopping_items").insert(rows);
    if (e2) throw e2;
    return { ok: true as const, count: rows.length };
  });
