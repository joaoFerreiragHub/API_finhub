# FinHub — SSR + Vike: Problemas Encontrados e Soluções

> Contexto: migração de `vite-plugin-ssr` para **Vike 0.4.255**.
> Frontend: React 19 + Vite 6 + Vike (SSR) + React Router v6 + Zustand.
> Commits de referência: `02aa430`, `c9d6019`, `3e9f88b`

---

## Sumário dos Problemas

| # | Problema | Sintoma | Ficheiro principal |
|---|----------|---------|-------------------|
| 1 | CSS não era injetado | Páginas sem estilos em SSR | `+onRenderHtml.tsx`, `index.css` |
| 2 | Hydration mismatch por Zustand | Páginas "mortas" (sem interatividade) | `PageShell.tsx` |
| 3 | Ambiguidade de export do `Page` | Crash no render (server + client) | `resolvePageComponent.ts` |
| 4 | Root React recriado em cada navegação | Erro silencioso, estado perdido | `+onRenderClient.tsx` |
| 5 | Dupla navegação React Router + Vike | Redirects duplicados, loop de navegação | `PageShell.tsx`, `+onRenderClient.tsx` |
| 6 | `react-helmet-async` CJS/ESM interop | Crash em SSR (`HelmetProvider is not a function`) | `src/lib/helmet.ts`, `vite.config.ts` |
| 7 | Ordem dos `@import` no CSS | Design tokens não aplicados | `index.css`, `globals.css` |

---

## Problema 1 — CSS não era injetado

### O que acontecia

Após a migração para Vike, as páginas renderizadas pelo servidor chegavam ao browser **sem estilos**. O Tailwind e os design tokens não eram aplicados.

### Causa

O Vike injeta automaticamente as folhas de estilo na `<head>` quando deteta que um ficheiro CSS foi importado **dentro dos ficheiros de renderização** (`+onRenderHtml.tsx`, `+onRenderClient.tsx`). Como o `index.css` não estava importado nesses ficheiros, o Vike não sabia que tinha de o incluir.

Adicionalmente, dentro do `index.css`, o `@import` do `design-tokens.css` estava **depois** das diretivas `@tailwind`, o que fazia com que as CSS custom properties (`--background`, `--card`, etc.) não estivessem disponíveis quando o Tailwind processava as classes.

### Solução

**`src/pages/+onRenderHtml.tsx`** e **`src/pages/+onRenderClient.tsx`** — adicionar o import:
```ts
import '../index.css'
```

**`src/index.css`** e **`src/styles/globals.css`** — mover o `@import` de tokens para **antes** das diretivas `@tailwind`:
```css
/* CORRETO — tokens primeiro */
@import './styles/design-tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Problema 2 — Hydration mismatch por Zustand

### O que acontecia

As páginas carregavam visualmente mas **não respondiam a cliques**, navegação ou qualquer interação. O React ficava "morto" após hidratação.

### Causa

O Zustand persiste o estado de autenticação no `localStorage` (via `zustand/middleware/persist`). No servidor, o utilizador é sempre `null` → o servidor renderiza `PublicLayout`. No cliente, quando o React arranca, o Zustand já leu o `localStorage` e sabe que o utilizador está autenticado → o cliente tenta renderizar `UserLayout`.

Esta divergência de estrutura HTML entre servidor e cliente faz o React falhar silenciosamente na hidratação. A árvore DOM fica "desatualizada" e os event handlers não são anexados.

### Solução

**`src/renderer/PageShell.tsx`** — adiar a decisão de layout até depois da primeira montagem no cliente:

```tsx
export function PageShell({ children, pageContext }: Props) {
  const { user, isAuthenticated } = useAuthStore()

  // O servidor nunca tem utilizador → sempre PublicLayout.
  // Só após mount é que lemos o Zustand. Assim servidor e cliente
  // renderizam PublicLayout na primeira passagem — hydration OK.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const role = user?.role ?? UserRole.VISITOR
  const useAuthLayout = mounted && isAuthenticated && role !== UserRole.VISITOR
  const Layout = useAuthLayout ? UserLayout : PublicLayout

  return <Layout>...</Layout>
}
```

**Regra:** Qualquer leitura de `localStorage` / estado persistido que afete estrutura do HTML **tem de ser deferida** com `useState(false)` + `useEffect`. O servidor nunca tem acesso a `localStorage`.

---

## Problema 3 — Ambiguidade de export do `Page`

### O que acontecia

Crash no render (tanto server como client) com erro do tipo `Page is not a function` ou `Cannot read properties of undefined`.

### Causa

Os ficheiros de página do Vike (`+Page.tsx`) podem exportar o componente de formas diferentes:
- `export default function Page()` → o Vike expõe como `{ default: fn }`
- `export function Page()` (named export) → exposto como `{ Page: fn }`
- Combinações de re-exports e barris podiam criar shapes como `{ default: { Page: fn } }`

Antes não havia nenhuma lógica de resolução — assumia-se sempre que `pageContext.Page` era diretamente o componente.

### Solução

Criar **`src/renderer/resolvePageComponent.ts`** — função que normaliza todos os shapes possíveis:

```ts
export const resolvePageComponent = (rawPage: unknown): ResolvedPageComponent => {
  // Caso 1: já é uma função diretamente
  if (isRenderablePageComponent(rawPage)) return rawPage

  if (isRecord(rawPage)) {
    // Caso 2: { Page: fn }
    if (isRenderablePageComponent(rawPage.Page)) return rawPage.Page

    // Caso 3: { default: { Page: fn } }
    if (isRecord(rawPage.default)) {
      if (isRenderablePageComponent(rawPage.default.Page)) return rawPage.default.Page
    }

    // Caso 4: { default: fn }
    if (isRenderablePageComponent(rawPage.default)) return rawPage.default
  }

  throw new Error('Page component inválido no runtime SSR/client.')
}
```

Usada em ambos `+onRenderHtml.tsx` e `+onRenderClient.tsx`:
```ts
const ResolvedPage = resolvePageComponent(Page as unknown)
```

---

## Problema 4 — Root React recriado em cada navegação

### O que acontecia

Após navegação client-side (link, programática), a página renderizava mas o estado React (QueryClient cache, providers, etc.) era reiniciado. Em casos mais graves, aparecia o erro do React:

> `Cannot update an unmounted root`

### Causa

O Vike chama `onRenderClient` a cada navegação. A implementação anterior chamava `createRoot()` ou `hydrateRoot()` em **cada** invocação. O React não permite criar múltiplas roots no mesmo elemento DOM — a segunda invocação destruía silenciosamente a primeira.

### Solução

**`src/pages/+onRenderClient.tsx`** — guardar a root num módulo singleton e reutilizá-la:

```ts
// Module-level — sobrevive entre navegações
let root: Root | null = null

function onRenderClient(pageContext: PageContext) {
  if (!root) {
    // Primeira renderização: hidrata ou CSR
    const hasServerHtml = appElement.innerHTML.trim().length > 0
    if (hasServerHtml) {
      root = hydrateRoot(appElement, app, { onRecoverableError: ... })
    } else {
      root = createRoot(appElement)
      root.render(app)
    }
  } else {
    // Navegações seguintes: atualiza a root existente
    root.render(app)
  }
}
```

---

## Problema 5 — Dupla navegação React Router + Vike

### O que acontecia

Clicar num `<Link>` do React Router resultava em **duas navegações**: uma pelo React Router (atualiza o histórico) e outra pelo Vike (interceta o click e faz `navigate()`). Isto causava redirects inesperados, loops de navegação ou perda do estado correto do URL.

### Causa

O Vike tem um mecanismo de interceção automática de clicks em `<a>` para fazer navegação client-side. O React Router também faz isso. Ambos estavam ativos simultaneamente.

Adicionalmente, o React Router precisa de um `<Router>` que conheça a localização atual. Como o Vike controla o routing, o `BrowserRouter` (que lê `window.location`) estava em conflito com o router do Vike.

### Solução

Duas partes:

**1. Desativar a interceção automática do Vike** em `+onRenderClient.tsx`:
```ts
// React Router bridges navigations to vikeNavigate() via PageShell.
// Disable Vike automatic click interception to avoid duplicate navigations.
window._disableAutomaticLinkInterception = true
```

**2. Criar `VikeRouter`** em `PageShell.tsx` — um `<Router>` do React Router que delega navegação ao Vike:

```tsx
function VikeRouter({ pageContext, children }) {
  const location = toRouterLocation(pageContext) // lê do pageContext, não do window

  const navigator = useMemo<Navigator>(() => ({
    push(to) {
      // React Router quer navegar → delega ao Vike
      void vikeNavigate(toHref(to))
    },
    replace(to) {
      void vikeNavigate(toHref(to), { overwriteLastHistoryEntry: true })
    },
    go(delta) {
      window.history.go(delta)
    },
    createHref(to) { return toHref(to) },
  }), [])

  return (
    <Router location={location} navigationType="POP" navigator={navigator}>
      {children}
    </Router>
  )
}
```

A localização é derivada do `pageContext.urlOriginal` do Vike (disponível tanto no servidor como no cliente) em vez de `window.location` (que não existe no servidor).

O estado do histórico (`router.state.location.state`) é persistido via `window.history.replaceState` usando a chave `usr` — padrão do React Router.

---

## Problema 6 — `react-helmet-async` CJS/ESM interop em SSR

### O que acontecia

Crash no servidor com:
> `TypeError: HelmetProvider is not a function`

### Causa

`react-helmet-async` publica um bundle CJS. O Vite, em modo SSR, trata módulos externos como `require()` do Node. O resultado é que `import { HelmetProvider } from 'react-helmet-async'` resolvia para `undefined` porque o módulo exportava tudo como `module.exports.default`.

Em modo cliente (com o dep optimizer do Vite), o mesmo import funcionava porque o Vite converte o CJS para ESM com named exports.

### Solução

**Duas partes:**

**`vite.config.ts`** — forçar o Vite a **bundlar** `react-helmet-async` em SSR (em vez de usar o `require()` do Node):
```ts
export default defineConfig({
  ssr: {
    // Força bundling — Vite resolve o interop CJS/ESM
    noExternal: ['react-helmet-async'],
  },
})
```

**`src/lib/helmet.ts`** — wrapper que resolve os dois casos de forma segura:
```ts
import * as _mod from 'react-helmet-async'
const _any = _mod as any

// SSR (após bundling): _mod.HelmetProvider ou _mod.default.HelmetProvider
// Cliente (dep optimizer): _mod.HelmetProvider diretamente
const HelmetProvider = _any.HelmetProvider ?? _any.default?.HelmetProvider
const Helmet = _any.Helmet ?? _any.default?.Helmet

export { HelmetProvider, Helmet }
```

Todos os imports de `react-helmet-async` no projeto passam por este wrapper:
```ts
import { HelmetProvider, Helmet } from '@/lib/helmet'
```

---

## Ficheiros Chave do Sistema de Renderização

```
src/
├── pages/
│   ├── +onRenderHtml.tsx       → Renderização server-side (ReactDOMServer.renderToString)
│   └── +onRenderClient.tsx     → Hidratação + navegações client-side (root singleton)
├── renderer/
│   ├── PageShell.tsx           → Providers (QueryClient, Theme, Router, Helmet, Auth)
│   │                             + VikeRouter (bridge React Router ↔ Vike)
│   │                             + defer de layout até após mount
│   └── resolvePageComponent.ts → Normaliza o shape do export de cada +Page.tsx
├── lib/
│   └── helmet.ts               → Wrapper CJS/ESM para react-helmet-async
├── index.css                   → Entry CSS (tokens antes de @tailwind)
└── styles/
    └── globals.css             → Variáveis CSS, dark mode, classes utilitárias
```

---

## Regras a Seguir no Futuro

1. **Nunca ler `localStorage` ou Zustand persisted state no render path diretamente.** Sempre deferir com `useState(false)` + `useEffect` quando o valor afeta estrutura HTML.

2. **Nunca chamar `createRoot` ou `hydrateRoot` mais do que uma vez** no mesmo elemento. Usar o padrão singleton do `+onRenderClient.tsx`.

3. **Novos pacotes com problemas CJS/ESM em SSR** → adicionar a `ssr.noExternal` no `vite.config.ts` e criar wrapper em `src/lib/` se necessário.

4. **Não usar `BrowserRouter` ou `MemoryRouter`** — toda a navegação passa pelo `VikeRouter` em `PageShell.tsx`.

5. **CSS custom properties (`--variavel`) devem estar definidas antes do `@tailwind base`** — caso contrário, as variáveis não estão disponíveis durante o processamento do Tailwind.

6. **Imports de CSS nos ficheiros de render** (`+onRenderHtml.tsx`, `+onRenderClient.tsx`) são obrigatórios para o Vike injetar as folhas de estilo na `<head>`.

---

*Última atualização: 2026-03-21*
