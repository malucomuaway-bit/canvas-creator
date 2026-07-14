import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useMemo, useState } from "react";
import { Plus, Check, Search, Repeat } from "lucide-react";
import { toast } from "sonner";
import {
  listShopping,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  clearChecked,
} from "@/lib/shopping.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SwipeableItem } from "@/components/SwipeableItem";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

export const Route = createFileRoute("/_app/compras")({
  head: () => ({
    meta: [
      { title: "Lista de Compras — Casa Organizada" },
      { name: "description", content: "Checklist com preço estimado, pago e recorrência." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["shopping"],
      queryFn: () => listShopping(),
    }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-lg p-6 text-center">
      <p className="text-sm text-muted-foreground">Não deu para carregar a lista.</p>
      <p className="mt-1 text-xs text-muted-foreground/70">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Tentar de novo</Button>
    </div>
  ),
  component: ComprasPage,
});

function ComprasPage() {
  useLiveRefresh([["shopping"]]);
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
  const [recurrence, setRecurrence] = useState<"none" | "weekly" | "monthly">("none");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["shopping"] });
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await add({
        data: {
          name: name.trim(),
          quantity: 1,
          estimated_price: price ? Number(price.replace(",", ".")) : null,
          recurrence,
        },
      });
      toast.success(`"${name.trim()}" adicionado`);
      setName("");
      setPrice("");
      await refresh();
    } catch (err) {
      toast.error("Não foi possível adicionar", { description: String(err) });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.items.filter((i) => {
      if (filter === "pending" && i.checked) return false;
      if (filter === "done" && !i.checked) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.items, search, filter]);

  const pending = filtered.filter((i) => !i.checked);
  const done = filtered.filter((i) => i.checked);
  const estimatedTotal = data.items
    .filter((i) => !i.checked)
    .reduce((s, i) => s + (i.estimated_price ?? 0) * (i.quantity ?? 1), 0);
  const paidTotal = data.items
    .filter((i) => i.checked)
    .reduce((s, i) => s + (i.paid_price ?? 0) * (i.quantity ?? 1), 0);

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Item (ex: Arroz)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            aria-label="Nome do item"
          />
          <Input
            placeholder="R$"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-20"
            aria-label="Preço estimado"
          />
          <Button type="submit" size="icon" aria-label="Adicionar item">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as any)}
            className="rounded-md border bg-background px-2 py-1"
            aria-label="Recorrência"
          >
            <option value="none">Sem recorrência</option>
            <option value="weekly">Toda semana</option>
            <option value="monthly">Todo mês</option>
          </select>
        </div>
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

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            aria-label="Buscar item"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-md border bg-background px-2 py-2 text-sm"
          aria-label="Filtrar"
        >
          <option value="all">Todos</option>
          <option value="pending">A comprar</option>
          <option value="done">Comprados</option>
        </select>
      </div>

      {data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="space-y-2">
            {pending.map((item) => (
              <li key={item.id}>
                <SwipeableItem
                  onDelete={async () => {
                    await del({ data: { id: item.id } });
                    toast(`Removido: ${item.name}`);
                    await refresh();
                  }}
                >
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <button
                      type="button"
                      aria-label={`Marcar ${item.name} como comprado`}
                      onClick={async () => {
                        await update({
                          data: { id: item.id, checked: true, paid_price: item.estimated_price },
                        });
                        await refresh();
                      }}
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 hover:border-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {item.estimated_price != null && (
                          <span>~ R$ {Number(item.estimated_price).toFixed(2)}</span>
                        )}
                        {item.recurrence !== "none" && (
                          <span className="inline-flex items-center gap-0.5">
                            <Repeat className="h-3 w-3" />
                            {item.recurrence === "weekly" ? "semanal" : "mensal"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </SwipeableItem>
              </li>
            ))}
            {pending.length === 0 && filter !== "done" && (
              <li className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Nada aqui. 🎉
              </li>
            )}
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
                    toast("Comprados limpos");
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
                      aria-label={`Desmarcar ${item.name}`}
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
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed bg-muted/20 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Plus className="h-6 w-6" />
      </div>
      <p className="mt-3 font-medium">Lista vazia</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Digite acima o primeiro item que precisa comprar.
      </p>
    </div>
  );
}
