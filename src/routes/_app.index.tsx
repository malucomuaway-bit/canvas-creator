import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Wallet, Package, ShoppingCart, History, ChevronRight, AlertTriangle } from "lucide-react";
import { listShopping } from "@/lib/shopping.functions";
import { listStock } from "@/lib/stock.functions";
import { listHistory } from "@/lib/history.functions";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Início — Casa Organizada" },
      { name: "description", content: "Painel da casa: orçamento, estoque, lista e histórico." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData({ queryKey: ["shopping"], queryFn: () => listShopping() });
    context.queryClient.ensureQueryData({ queryKey: ["stock"], queryFn: () => listStock() });
    context.queryClient.ensureQueryData({ queryKey: ["history"], queryFn: () => listHistory() });
  },
  component: Dashboard,
});

function Dashboard() {
  useLiveRefresh([["shopping"], ["stock"], ["history"]], 5000);
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Bem-vindos</p>
        <h1 className="text-3xl font-bold tracking-tight">Casa Organizada</h1>
      </header>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted" />}>
        <Cards />
      </Suspense>
    </div>
  );
}

function Cards() {
  const { data: shop } = useSuspenseQuery({ queryKey: ["shopping"], queryFn: () => listShopping() });
  const { data: stock } = useSuspenseQuery({ queryKey: ["stock"], queryFn: () => listStock() });
  const { data: hist } = useSuspenseQuery({ queryKey: ["history"], queryFn: () => listHistory() });

  const pending = shop.items.filter((i) => !i.checked);
  const estimated = pending.reduce((s, i) => s + (i.estimated_price ?? 0) * (i.quantity ?? 1), 0);
  const monthSpent = hist
    .filter((h) => {
      const d = new Date(h.purchased_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, h) => s + Number(h.total), 0);
  const remaining = Math.max(0, shop.budget - monthSpent);

  const expiring = stock.filter((i) => {
    if (!i.expires_at) return false;
    const d = Math.floor(
      (new Date(i.expires_at + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return d <= 7;
  }).length;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card
        to="/historico"
        icon={<Wallet className="h-5 w-5" />}
        title="Orçamento"
        value={`R$ ${remaining.toFixed(2)}`}
        subtitle={`de R$ ${shop.budget.toFixed(2)}`}
        tone="primary"
      />
      <Card
        to="/compras"
        icon={<ShoppingCart className="h-5 w-5" />}
        title="Lista"
        value={`${pending.length} itens`}
        subtitle={`~ R$ ${estimated.toFixed(2)}`}
        tone="accent"
      />
      <Card
        to="/estoque"
        icon={<Package className="h-5 w-5" />}
        title="Estoque"
        value={`${stock.length} itens`}
        subtitle={
          expiring > 0 ? `${expiring} vencendo` : "OK"
        }
        tone={expiring > 0 ? "warn" : "muted"}
        badge={expiring > 0 ? <AlertTriangle className="h-3 w-3" /> : undefined}
      />
      <Card
        to="/historico"
        icon={<History className="h-5 w-5" />}
        title="Este mês"
        value={`R$ ${monthSpent.toFixed(2)}`}
        subtitle={`${hist.length} compras`}
        tone="muted"
      />
    </div>
  );
}

function Card({
  to,
  icon,
  title,
  value,
  subtitle,
  tone,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  tone: "primary" | "accent" | "muted" | "warn";
  badge?: React.ReactNode;
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <Link
      to={to}
      className="group flex min-h-11 flex-col justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${toneClasses}`}>
          {icon}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground">
          {badge}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}
