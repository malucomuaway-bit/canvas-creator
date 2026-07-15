import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listMarkets, addMarket, deleteMarket } from "@/lib/markets.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/mercados")({
  head: () => ({
    meta: [
      { title: "Mercados — Casa Organizada" },
      { name: "description", content: "Gerencie os mercados usados no modo Feira." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["markets"], queryFn: () => listMarkets() }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-lg p-6 text-center">
      <p className="text-sm text-muted-foreground">Erro ao carregar mercados.</p>
      <p className="mt-1 text-xs text-muted-foreground/70">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Tentar de novo</Button>
    </div>
  ),
  component: MarketsPage,
});

function MarketsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Mercados</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <MarketsList />
      </Suspense>
    </div>
  );
}

function MarketsList() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: ["markets"], queryFn: () => listMarkets() });
  const add = useServerFn(addMarket);
  const del = useServerFn(deleteMarket);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#16a34a");

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await add({ data: { name: name.trim(), color } });
      toast.success(`"${name.trim()}" adicionado`);
      setName("");
      await qc.invalidateQueries({ queryKey: ["markets"] });
    } catch (err) {
      toast.error("Erro ao adicionar", { description: String(err) });
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="flex gap-2 rounded-xl border bg-card p-3">
        <Input
          placeholder="Nome do mercado"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          aria-label="Nome do mercado"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border"
          aria-label="Cor do mercado"
        />
        <Button type="submit" size="icon" aria-label="Adicionar mercado">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {data.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-muted/20 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <p className="mt-3 font-medium">Nenhum mercado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione os mercados que você frequenta pra separar suas compras.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <span
                className="h-6 w-6 flex-shrink-0 rounded-full"
                style={{ backgroundColor: m.color }}
                aria-hidden
              />
              <p className="min-w-0 flex-1 truncate font-medium">{m.name}</p>
              <button
                type="button"
                aria-label={`Remover ${m.name}`}
                onClick={async () => {
                  await del({ data: { id: m.id } });
                  toast(`Removido: ${m.name}`);
                  await qc.invalidateQueries({ queryKey: ["markets"] });
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
