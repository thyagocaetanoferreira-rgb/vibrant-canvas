# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estrutura do Monorepo

```
vibrant-canvas/
├── client/          # Frontend React (Vite + TypeScript)
│   ├── src/         # Código-fonte React
│   ├── public/      # Assets estáticos
│   ├── index.html   # Entry point
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── server/          # Backend Express (Node.js + TypeScript)
│   └── src/         # Código-fonte da API
├── database/        # Migrações PostgreSQL (SQL versionado)
│   └── migrations/
├── docker/          # Configs de infra (nginx)
├── Dockerfile       # Build multi-stage do frontend
├── docker-compose.yml
└── .env             # Variáveis VITE_* para dev local
```

## Commands

**Frontend (`client/`) — ou da raiz via scripts delegados:**
```bash
npm run dev           # Inicia dev server na porta 8080 (proxy /api e /uploads → localhost:4000)
npm run build         # Build de produção
npm run lint          # Validação ESLint
npm run test          # Executa testes (Vitest, single run)
```

**Direto em `client/`:**
```bash
cd client && npm run dev
cd client && npx shadcn@latest add <component>  # Adicionar componente shadcn/ui
```

**Backend (`server/`):**
```bash
cd server && npx tsx src/index.ts  # Inicia Express na porta 4000
```

**Docker (stack completa):**
```bash
cp docker/.env.example .env.docker
docker compose --env-file .env.docker up -d
```

## Architecture

**vibrant-canvas** is a React SPA + Node.js/Express backend for municipal administration (intraservice-vh). It manages deliveries, tasks, diagnostics, legal matters, risk, and compliance reporting for municipalities.

### Stack

- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind CSS, shadcn/ui, React Router 6, TanStack React Query 5
- **Backend:** Node.js + Express + TypeScript + `pg` (node-postgres) + bcryptjs + jsonwebtoken + multer
- **Database:** PostgreSQL 16 (migrations in `database/migrations/`)
- **Docker:** `db` (postgres) + `backend` (Express) + `frontend` (nginx SPA)

### App Shell (client/src/App.tsx)

```
QueryClientProvider (TanStack React Query)
└── BrowserRouter
    └── AppProvider (global context)
        └── Routes
            ├── Public: /login, /esqueci-senha, /reset-password
            └── ProtectedRoute → AppLayout (sidebar + topbar + outlet) → page components
```

### Global State (client/src/contexts/AppContext.tsx)

Single context holds everything cross-cutting:
- **Auth:** user record loaded from `GET /api/auth/me` using JWT stored in `vh_token` (localStorage)
- **Active municipality:** clienteId + municipioId + municipioNome, persisted to `vh_municipio_ativo`
- **Exercise year:** anoExercicio for fiscal year scoping, persisted to localStorage

Auth flow: `POST /api/auth/login` with `{ identifier, senha }` → returns `{ token, usuario, municipios }`. Token stored in localStorage. On reload, `GET /api/auth/me` validates the token and refreshes user+municipalities.

Role-based municipality access: admins see all active clients; others see only their linked municipalities via `usuario_municipios` table.

### Data Layer

All API calls go through `client/src/lib/api.ts` — a thin fetch wrapper that attaches the JWT `Authorization: Bearer <token>` header automatically. No Supabase client exists in the frontend.

API base URL: `VITE_API_URL` env var (defaults to `/api`). In development, Vite proxies `/api` and `/uploads` to `http://localhost:4000`. The `.env` file lives at the **project root**; Vite is configured with `envDir: ".."` to find it from `client/`.

### Backend Routes (`server/src/routes/`)

| File | Mount | Description |
|------|-------|-------------|
| `auth.ts` | `/api/auth` | Login, me, forgot-password, reset-password |
| `usuarios.ts` | `/api/usuarios` | CRUD + permissions + municipalities |
| `clientes.ts` | `/api/clientes` | CRUD + ERP password encryption |
| `municipios.ts` | `/api/municipios` | Search, modules, profile permissions |
| `lancamentos.ts` | `/api/lancamentos` | CRUD + batch import |
| `tcmgo.ts` | `/api/tcmgo` | TCM-GO sync integrations |
| `siconfi.ts` | `/api/siconfi` | SICONFI/CAUC integration |
| `upload.ts` | `/api/upload` | Photo upload (multer → `/uploads` volume) |

### UI Components

`client/src/components/ui/` contains shadcn/ui components (Radix UI + Tailwind). Use these for all base UI. Add new ones with `npx shadcn@latest add <component>` **from inside `client/`**.

### Routing Conventions

- Page components live in `client/src/pages/`
- Feature subdirectories: `pages/relatorios/`, `pages/diagnostico/`, `pages/usuarios/`, `pages/clientes/`
- Unimplemented modules use `<ModulePlaceholder>`

### Styling

Tailwind CSS with Sora font and HSL-based custom color tokens in `client/tailwind.config.ts`. Dark mode via `next-themes`. Use `cn()` from `client/src/lib/utils.ts` for conditional classNames.

### Environment Variables

**Frontend** (`VITE_*` prefix, lidos do `.env` na raiz):
```
VITE_API_URL=/api
```

**Backend** (runtime, via docker-compose ou shell):
```
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
JWT_SECRET=
ENCRYPTION_KEY=
SMTP_HOST= (optional)
```

See `docker/.env.example` for full list.
