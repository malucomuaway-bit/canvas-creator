
# Plano — Casa Organizada v2

Você pediu **~20 features grandes** de uma vez (estoque, refeições, histórico, recorrência, múltiplos mercados, realtime, PWA, dark mode, swipe, busca, acessibilidade, SEO, observabilidade…). Isso é literalmente **um app novo**, não dá pra fazer tudo com qualidade num único turno — se eu tentar, cada feature fica meia-boca e o site quebra. Vou entregar em **5 fases**, testando cada uma antes de seguir. Você aprova esta fase 1 e eu executo; nas próximas mensagens eu sigo pras seguintes.

## Fase 1 — Núcleo funcional (ESTA MENSAGEM)
**Backend (migração)**
- Tabela `stock_items` (nome, quantidade, unidade, categoria, validade, min_qty p/ alerta).
- Tabela `purchase_history` (snapshot de compra: data, total, mercado, itens JSON).
- Tabela `markets` (nome, cor) + coluna `market_id` em `shopping_items`.
- Coluna `recurrence` em `shopping_items` (none/weekly/monthly) + `last_bought_at`.
- Habilitar Realtime em `shopping_items` e `stock_items`.
- RLS: liberado (site já é gated por senha — sem auth por usuário).

**Frontend**
- **Estoque real** (`/estoque`): listar, adicionar, editar, deletar, alerta de validade próxima, botão "acabou → jogar pra lista".
- **Histórico** (`/historico`): fecha compra no modo Feira → grava snapshot; página lista compras anteriores com total.
- **Múltiplos mercados**: seletor no modo Feira, filtro na lista.
- **Recorrência**: item marca-se sozinho pra voltar após X dias.
- **Realtime**: outra pessoa marca item, minha tela atualiza (via Supabase channel).
- **Feedback ao adicionar** (toast sonner) + **swipe pra deletar** (framer-motion).
- **Busca e filtro** na lista.
- Corrigir botão "Sair" → renomear "Bloquear" com ícone `Lock`.

## Fase 2 — UX / Mobile
- Refeições (planejador semanal + gerar lista da receita).
- Dark mode (toggle + `prefers-color-scheme`).
- Onboarding com estado vazio bonito (ilustração + CTA).
- PWA completo: manifest + ícones + install prompt (sem service worker offline — só home-screen; conforme regra do Lovable).

## Fase 3 — Qualidade
- SEO: `head()` por rota, og:image gerado, sitemap.xml, robots.txt.
- Acessibilidade: `aria-label` em todos os icon-buttons, `<main>` único, contraste, `h-dvh`.
- Performance: preload LCP, code-split rotas pesadas, imagens webp.

## Fase 4 — Observabilidade
- Error boundary global com log estruturado.
- `errorComponent` + `notFoundComponent` em toda rota.
- Toast de erro amigável em toda mutation.

## Fase 5 — Teste E2E
- Playwright: unlock → adiciona item → modo feira → fecha compra → aparece no histórico → estoque atualiza.
- Corrijo tudo que quebrar.

---

## Detalhes técnicos da Fase 1

**Migração SQL**: cria 3 tabelas + 2 colunas + GRANTs + RLS liberado + `ALTER PUBLICATION supabase_realtime ADD TABLE ...`.

**Novos arquivos**:
- `src/lib/stock.functions.ts`, `src/lib/history.functions.ts`, `src/lib/markets.functions.ts`
- `src/routes/_app.estoque.tsx`, `src/routes/_app.historico.tsx`
- `src/components/SwipeableItem.tsx` (framer-motion)
- `src/hooks/useRealtimeShopping.ts`

**Arquivos alterados**:
- `src/lib/shopping.functions.ts` — adiciona busca/filtro, recorrência, market_id.
- `src/routes/_app.compras.tsx` — busca, filtro, swipe, feedback.
- `src/routes/_app.feira.tsx` — seletor de mercado, botão "Fechar compra" → grava histórico.
- `src/routes/_app.index.tsx` — cards de estoque e histórico ativos.
- `src/routes/_app.tsx` — nav com Estoque + Histórico, botão "Bloquear".

**Dependências novas**: `framer-motion` (swipe).

## Confirmação

Respondendo "ok" ou "vai" eu executo a Fase 1 inteira agora (migração + código + teste Playwright). Depois seguimos pras próximas.

Quer mudar a ordem das fases ou remover algo? Fala antes que eu comece.
