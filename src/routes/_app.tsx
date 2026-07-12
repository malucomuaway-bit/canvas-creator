import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Home, ShoppingCart, ShoppingBasket, LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-background pb-24">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Início" />
          <NavItem to="/compras" icon={<ShoppingCart className="h-5 w-5" />} label="Lista" />
          <NavItem to="/feira" icon={<ShoppingBasket className="h-5 w-5" />} label="Feira" />
          <button
            type="button"
            onClick={handleLock}
            className="flex flex-1 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="flex flex-1 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors [&.active]:text-primary"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}