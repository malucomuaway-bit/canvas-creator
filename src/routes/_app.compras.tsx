import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import {
  listShopping,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  clearChecked,
} from "@/lib/shopping.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/compras")({
  head: () => ({
    meta: [
      { title: "Lista de Compras — Casa Organizada" },
      { name: "description", content: "Checklist com preço estimado e pago." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["shopping"],
      queryFn: () => listShopping(),
    }),
  component: ComprasPage,
});

function ComprasPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Lista de Compras</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <ShoppingList />
      </Suspense>
    </div>
  );
}

function ShoppingList() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["shopping"],
    queryFn: () => listShopping(),
  });
  const add = useServerFn(addShoppingItem);
  const update = useServerFn(updateShoppingItem);
  const del = useServerFn(deleteShoppingItem);
  const clear = useServerFn(clearChecked);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["shopping"] });
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await add({
      data: {
        name: name.trim(),
        quantity: 1,
        estimated_price: price ? Number(price.replace(",", ".")) : null,
      },
    });
    setName("");
    setPrice("");
    await refresh();
  }

  const pending = data.items.filter((i) => !i.checked);
  const done = data.items.filter((i) => i.checked);
  const estimatedTotal = pending.reduce(
    (s, i) => s + (i.estimated_price ?? 0) * (i.quantity ?? 1),
    0,
  );
  const paidTotal = done.reduce((s, i) => s + (i.paid_price ?? 0) * (i.quantity ?? 1), 0);

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="flex gap-2">
        <Input
          placeholder="Item (ex: Arroz)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="R$"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-20"
        />
        <Button type="submit" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Estimado</p>
          <p className="text-lg font-semibold">R$ {estimatedTotal.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pago</p>
          <p className="text-lg font-semibold text-primary">R$ {paidTotal.toFixed(2)}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {pending.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border bg-card p-3"
          >
            <button
              type="button"
              aria-label="Marcar"
              onClick={async () => {
                await update({ data: { id: item.id, checked: true, paid_price: item.estimated_price } });
                await refresh();
              }}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 hover:border-primary"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.name}</p>
              {item.estimated_price != null && (
                <p className="text-xs text-muted-foreground">
                  ~ R$ {Number(item.estimated_price).toFixed(2)}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Remover"
              onClick={async () => {
                await del({ data: { id: item.id } });
                await refresh();
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Comprados ({done.length})
            </h2>
            <button
              type="button"
              onClick={async () => {
                await clear({});
                await refresh();
              }}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Limpar
            </button>
          </div>
          <ul className="space-y-2">
            {done.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3"
              >
                <button
                  type="button"
                  onClick={async () => {
                    await update({ data: { id: item.id, checked: false } });
                    await refresh();
                  }}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium line-through opacity-60">{item.name}</p>
                  {item.paid_price != null && (
                    <p className="text-xs text-muted-foreground">
                      R$ {Number(item.paid_price).toFixed(2)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}