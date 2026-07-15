import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { Plus, ShoppingCart, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { listMeals, addMeal, deleteMeal, mealToShopping, type MealType } from "@/lib/meals.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Café",
  lunch: "Almoço",
  dinner: "Janta",
  snack: "Lanche",
};

export const Route = createFileRoute("/_app/refeicoes")({
  head: () => ({
    meta: [
      { title: "Refeições — Casa Organizada" },
      { name: "description", content: "Planejador semanal de refeições com envio pra lista." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["meals"], queryFn: () => listMeals() }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-lg p-6 text-center">
      <p className="text-sm text-muted-foreground">Erro ao carregar refeições.</p>
      <p className="mt-1 text-xs text-muted-foreground/70">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Tentar de novo</Button>
    </div>
  ),
  component: MealsPage,
});

function MealsPage() {
  useLiveRefresh([["meals"]]);
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Refeições da semana</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <MealsPlanner />
      </Suspense>
    </div>
  );
}

function MealsPlanner() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: ["meals"], queryFn: () => listMeals() });
  const add = useServerFn(addMeal);
  const del = useServerFn(deleteMeal);
  const send = useServerFn(mealToShopping);

  const [day, setDay] = useState(new Date().getDay());
  const [type, setType] = useState<MealType>("lunch");
  const [name, setName] = useState("");
  const [ings, setIngs] = useState("");

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["meals"] });
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await add({
        data: {
          day_of_week: day,
          meal_type: type,
          name: name.trim(),
          ingredients: ings
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          notes: null,
        },
      });
      toast.success(`"${name.trim()}" no cardápio`);
      setName("");
      setIngs("");
      await refresh();
    } catch (err) {
      toast.error("Erro ao adicionar", { description: String(err) });
    }
  }

  if (data.length === 0) {
    return (
      <>
        <MealForm {...{ day, setDay, type, setType, name, setName, ings, setIngs, onAdd }} />
        <div className="mt-6 rounded-2xl border-2 border-dashed bg-muted/20 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <p className="mt-3 font-medium">Nenhuma refeição planejada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Monte o cardápio da semana e mande os ingredientes direto pra lista.
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <MealForm {...{ day, setDay, type, setType, name, setName, ings, setIngs, onAdd }} />
      <ul className="space-y-3">
        {DAYS.map((label, idx) => {
          const meals = data.filter((m) => m.day_of_week === idx);
          if (meals.length === 0) return null;
          return (
            <li key={idx} className="rounded-xl border bg-card p-3">
              <h3 className="mb-2 text-sm font-semibold">{label}</h3>
              <ul className="space-y-2">
                {meals.map((m) => (
                  <li key={m.id} className="rounded-lg bg-muted/30 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase text-muted-foreground">{MEAL_LABEL[m.meal_type]}</p>
                        <p className="font-medium">{m.name}</p>
                        {m.ingredients.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {m.ingredients.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {m.ingredients.length > 0 && (
                          <button
                            type="button"
                            aria-label="Mandar ingredientes pra lista"
                            onClick={async () => {
                              const res = await send({ data: { id: m.id } });
                              toast.success(`${res.count} ingrediente(s) na lista`);
                              await qc.invalidateQueries({ queryKey: ["shopping"] });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border text-primary"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Remover refeição"
                          onClick={async () => {
                            await del({ data: { id: m.id } });
                            toast(`Removido: ${m.name}`);
                            await refresh();
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-md border text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MealForm(props: {
  day: number; setDay: (n: number) => void;
  type: MealType; setType: (t: MealType) => void;
  name: string; setName: (s: string) => void;
  ings: string; setIngs: (s: string) => void;
  onAdd: (e: React.FormEvent) => void;
}) {
  const { day, setDay, type, setType, name, setName, ings, setIngs, onAdd } = props;
  return (
    <form onSubmit={onAdd} className="space-y-2 rounded-xl border bg-card p-3">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="rounded-md border bg-background px-2 py-2 text-sm"
          aria-label="Dia da semana"
        >
          {DAYS.map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MealType)}
          className="rounded-md border bg-background px-2 py-2 text-sm"
          aria-label="Tipo de refeição"
        >
          <option value="breakfast">Café</option>
          <option value="lunch">Almoço</option>
          <option value="dinner">Janta</option>
          <option value="snack">Lanche</option>
        </select>
      </div>
      <Input
        placeholder="Ex: Feijão com arroz"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nome da refeição"
      />
      <Input
        placeholder="Ingredientes (separe por vírgula)"
        value={ings}
        onChange={(e) => setIngs(e.target.value)}
        aria-label="Ingredientes"
      />
      <Button type="submit" className="w-full">
        <Plus className="mr-1 h-4 w-4" />
        Adicionar refeição
      </Button>
    </form>
  );
}
