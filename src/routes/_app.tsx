import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Home, ShoppingCart, ShoppingBasket, Package, History, Lock } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { checkUnlocked, lockSite } from "@/lib/gate.functions";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { unlocked } = await checkUnlocked();
    if (!unlocked) throw redirect({ to: "/unlock" });
  },
  component: AppLayout,
});

function AppLayout() {
  const router = useRouter();
  const lock = useServerFn(lockSite);

  async function handleLock() {
    await lock({});
    await router.navigate({ to: "/unlock" });
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <main>
        <Outlet />
      </main>
      <Toaster position="top-center" richColors closeButton />
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 items-center gap-1 px-1 py-2">
          <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Início" exact />
          <NavItem to="/compras" icon={<ShoppingCart className="h-5 w-5" />} label="Lista" />
          <NavItem to="/feira" icon={<ShoppingBasket className="h-5 w-5" />} label="Feira" />
          <NavItem to="/estoque" icon={<Package className="h-5 w-5" />} label="Estoque" />
          <NavItem to="/historico" icon={<History className="h-5 w-5" />} label="Hist." />
          <button
            type="button"
            onClick={handleLock}
            aria-label="Bloquear site"
            className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Lock className="h-5 w-5" />
            <span>Bloquear</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  exact,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: !!exact }}
      className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10px] font-medium text-muted-foreground transition-colors [&.active]:text-primary"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
