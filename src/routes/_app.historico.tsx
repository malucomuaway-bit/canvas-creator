import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { History, Store } from "lucide-react";
import { listHistory } from "@/lib/history.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Casa Organizada" },
      { name: "description", content: "Histórico das compras fechadas com totais por mercado." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["history"], queryFn: () => listHistory() }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-lg p-6 text-center">
      <p className="text-sm text-muted-foreground">Erro ao carregar histórico.</p>
      <p className="mt-1 text-xs text-muted-foreground/70">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Tentar de novo</Button>
    </div>
  ),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Histórico</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <HistoryList />
      </Suspense>
    </div>
  );
}

function HistoryList() {
  const { data } = useSuspenseQuery({ queryKey: ["history"], queryFn: () => listHistory() });

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed bg-muted/20 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <History className="h-6 w-6" />
        </div>
        <p className="mt-3 font-medium">Nenhuma compra ainda</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Feche uma compra no modo Feira para vê-la aqui.
        </p>
      </div>
    );
  }

  const totalGeral = data.reduce((s, h) => s + Number(h.total), 0);

  return (
    <>
      <div className="mb-4 rounded-xl border bg-card p-3 text-sm">
        <p className="text-xs text-muted-foreground">Total gasto (últimas {data.length})</p>
        <p className="text-2xl font-bold">R$ {totalGeral.toFixed(2)}</p>
      </div>
      <ul className="space-y-3">
        {data.map((h) => (
          <li key={h.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  {new Date(h.purchased_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {h.market_name && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Store className="h-3 w-3" />
                    {h.market_name}
                  </p>
                )}
              </div>
              <p className="text-lg font-bold tabular-nums">R$ {Number(h.total).toFixed(2)}</p>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                {h.items.length} itens
              </summary>
              <ul className="mt-2 space-y-1 text-sm">
                {h.items.map((it, idx) => (
                  <li key={idx} className="flex justify-between gap-2 text-muted-foreground">
                    <span className="truncate">
                      {it.quantity > 1 ? `${it.quantity}× ` : ""}
                      {it.name}
                    </span>
                    {it.paid_price != null && (
                      <span className="tabular-nums">R$ {Number(it.paid_price).toFixed(2)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
