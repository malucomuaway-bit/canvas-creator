import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { Check } from "lucide-react";
import { listShopping, updateShoppingItem } from "@/lib/shopping.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/feira")({
  head: () => ({
    meta: [
      { title: "Modo Feira — Casa Organizada" },
      { name: "description", content: "Checklist rápido e calculadora no mercado." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["shopping"],
      queryFn: () => listShopping(),
    }),
  component: FeiraPage,
});

function FeiraPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Modo Feira</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <MarketMode />
      </Suspense>
    </div>
  );
}

function MarketMode() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["shopping"],
    queryFn: () => listShopping(),
  });
  const update = useServerFn(updateShoppingItem);
  const [priceById, setPriceById] = useState<Record<string, string>>({});

  const pending = data.items.filter((i) => !i.checked);
  const done = data.items.filter((i) => i.checked);
  const cartTotal = done.reduce((s, i) => s + (i.paid_price ?? 0) * (i.quantity ?? 1), 0);

  async function check(id: string, priceStr: string, fallback: number | null) {
    const paid = priceStr ? Number(priceStr.replace(",", ".")) : fallback;
    await update({
      data: { id, checked: true, paid_price: Number.isFinite(paid as number) ? (paid as number) : null },
    });
    setPriceById((p) => ({ ...p, [id]: "" }));
    await qc.invalidateQueries({ queryKey: ["shopping"] });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 rounded-b-2xl bg-primary px-4 py-4 text-primary-foreground shadow-lg">
        <p className="text-xs uppercase tracking-wide opacity-80">Carrinho</p>
        <p className="text-4xl font-bold tabular-nums">R$ {cartTotal.toFixed(2)}</p>
        <p className="mt-1 text-xs opacity-80">
          {done.length} de {data.items.length} itens
        </p>
      </div>

      <ul className="space-y-3">
        {pending.map((item) => (
          <li key={item.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{item.name}</p>
                {item.estimated_price != null && (
                  <p className="text-sm text-muted-foreground">
                    Estimado: R$ {Number(item.estimated_price).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                inputMode="decimal"
                placeholder="R$ pago"
                value={priceById[item.id] ?? ""}
                onChange={(e) =>
                  setPriceById((p) => ({ ...p, [item.id]: e.target.value }))
                }
                className="h-12 flex-1 text-lg"
              />
              <Button
                size="lg"
                className="h-12 px-6"
                onClick={() => check(item.id, priceById[item.id] ?? "", item.estimated_price)}
              >
                <Check className="mr-1 h-5 w-5" />
                Ok
              </Button>
            </div>
          </li>
        ))}
        {pending.length === 0 && (
          <li className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">
            Tudo comprado! 🎉
          </li>
        )}
      </ul>
    </div>
  );
}