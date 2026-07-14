import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useMemo, useState } from "react";
import { Plus, Search, ShoppingCart, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import {
  listStock,
  addStockItem,
  updateStockItem,
  deleteStockItem,
  stockToShopping,
} from "@/lib/stock.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SwipeableItem } from "@/components/SwipeableItem";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

export const Route = createFileRoute("/_app/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Casa Organizada" },
      { name: "description", content: "Controle de estoque com alerta de validade." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["stock"], queryFn: () => listStock() }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-lg p-6 text-center">
      <p className="text-sm text-muted-foreground">Erro ao carregar estoque.</p>
      <p className="mt-1 text-xs text-muted-foreground/70">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Tentar de novo</Button>
    </div>
  ),
  component: EstoquePage,
});

function EstoquePage() {
  useLiveRefresh([["stock"]]);
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Estoque</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <StockList />
      </Suspense>
    </div>
  );
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00").getTime();
  return Math.floor((d - Date.now()) / (1000 * 60 * 60 * 24));
}

function StockList() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery({ queryKey: ["stock"], queryFn: () => listStock() });
  const add = useServerFn(addStockItem);
  const update = useServerFn(updateStockItem);
  const del = useServerFn(deleteStockItem);
  const toShop = useServerFn(stockToShopping);

  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [expires, setExpires] = useState("");
  const [search, setSearch] = useState("");

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["stock"] });
    await qc.invalidateQueries({ queryKey: ["shopping"] });
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await add({
        data: {
          name: name.trim(),
          quantity: Number(qty) || 1,
          expires_at: expires || null,
          min_quantity: 0,
        },
      });
      toast.success(`"${name.trim()}" no estoque`);
      setName("");
      setQty("1");
      setExpires("");
      await refresh();
    } catch (err) {
      toast.error("Erro ao adicionar", { description: String(err) });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [items, search]);

  const expiring = items.filter((i) => {
    const d = daysUntil(i.expires_at);
    return d !== null && d <= 7;
  });

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Item (ex: Leite)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            aria-label="Nome do item"
          />
          <Input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-16"
            aria-label="Quantidade"
            min="0"
            step="0.1"
          />
          <Button type="submit" size="icon" aria-label="Adicionar ao estoque">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Input
          type="date"
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
          aria-label="Validade (opcional)"
          className="text-sm"
        />
      </form>

      {expiring.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {expiring.length} item(s) vencendo em 7 dias
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
          aria-label="Buscar no estoque"
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-muted/20 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Package className="h-6 w-6" />
          </div>
          <p className="mt-3 font-medium">Estoque vazio</p>
          <p className="mt-1 text-sm text-muted-foreground">Adicione o que já tem em casa.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const d = daysUntil(item.expires_at);
            const expiringSoon = d !== null && d <= 7;
            return (
              <li key={item.id}>
                <SwipeableItem
                  onDelete={async () => {
                    await del({ data: { id: item.id } });
                    toast(`Removido: ${item.name}`);
                    await refresh();
                  }}
                >
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{Number(item.quantity)}{item.unit ? ` ${item.unit}` : ""}</span>
                        {item.expires_at && (
                          <span className={expiringSoon ? "text-amber-600 dark:text-amber-400" : ""}>
                            vence em {d} dia(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Diminuir ${item.name}`}
                        onClick={async () => {
                          const nq = Math.max(0, Number(item.quantity) - 1);
                          await update({ data: { id: item.id, quantity: nq } });
                          await refresh();
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md border text-lg"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        aria-label={`Aumentar ${item.name}`}
                        onClick={async () => {
                          await update({ data: { id: item.id, quantity: Number(item.quantity) + 1 } });
                          await refresh();
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md border text-lg"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label={`Mandar ${item.name} pra lista de compras`}
                        onClick={async () => {
                          await toShop({ data: { id: item.id } });
                          toast.success(`"${item.name}" na lista`);
                          await refresh();
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md border text-primary"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </SwipeableItem>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
