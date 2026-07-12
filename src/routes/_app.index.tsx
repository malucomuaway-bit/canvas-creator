import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Wallet, Package, ShoppingCart, UtensilsCrossed, ChevronRight } from "lucide-react";
import { listShopping } from "@/lib/shopping.functions";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Início — Casa Organizada" },
      { name: "description", content: "Painel da casa: orçamento, estoque, lista e refeições." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["shopping"],
      queryFn: () => listShopping(),
    }),
  component: Dashboard,
});

function Dashboard() {
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
  const { data } = useSuspenseQuery({
    queryKey: ["shopping"],
    queryFn: () => listShopping(),
  });

  const pending = data.items.filter((i) => !i.checked);
  const estimated = pending.reduce(
    (s, i) => s + (i.estimated_price ?? 0) * (i.quantity ?? 1),
    0,
  );
  const paid = data.items
    .filter((i) => i.checked)
    .reduce((s, i) => s + (i.paid_price ?? 0) * (i.quantity ?? 1), 0);
  const remaining = Math.max(0, data.budget - paid);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card
        to="/compras"
        icon={<Wallet className="h-5 w-5" />}
        title="Orçamento"
        value={`R$ ${remaining.toFixed(2)}`}
        subtitle={`de R$ ${data.budget.toFixed(2)}`}
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
        to="/compras"
        icon={<Package className="h-5 w-5" />}
        title="Estoque"
        value="Em breve"
        subtitle="Controle de validade"
        tone="muted"
      />
      <Card
        to="/compras"
        icon={<UtensilsCrossed className="h-5 w-5" />}
        title="Refeições"
        value="Em breve"
        subtitle="Planejamento semanal"
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
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  tone: "primary" | "accent" | "muted";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${toneClasses}`}>
          {icon}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}