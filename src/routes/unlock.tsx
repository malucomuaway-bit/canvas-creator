import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock } from "lucide-react";
import { unlockSite } from "@/lib/gate.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Entrar — Casa Organizada" },
      { name: "description", content: "Digite a senha da casa para entrar." },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await unlock({ data: { password } });
      if (res.ok) {
        await router.navigate({ to: "/" });
      } else {
        setError(true);
        setPassword("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-lg"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Casa Organizada</h1>
            <p className="mt-1 text-sm text-muted-foreground">Digite a senha para entrar</p>
          </div>
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-center text-lg"
          />
          {error && (
            <p className="text-center text-sm text-destructive">Senha incorreta</p>
          )}
        </div>
        <Button type="submit" className="h-12 w-full text-base" disabled={loading || !password}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}