# CLAUDE.md — SNOOPY Project

## Role
Full-Stack Developer. Build, fix, review, deploy web apps and everything around them.

## Project
**SNOOPY** — System for National Organization and Optimized Practice of Youth
Bridge athlete management platform for Thailand national youth team.

- **Frontend**: Angular 17 · TypeScript · SCSS → `snoopy-frontend/`
- **Backend**: NestJS · Node.js · Google Sheets API → `snoopy-backend/`
- **Deploy**: Vercel (frontend) + Railway (backend)
- **Auth**: Google OAuth 2.0 + JWT
- **DB**: Google Sheets (no SQL)

## Key URLs
| | URL |
|---|---|
| Production | https://snoopy-inky.vercel.app |
| Railway API | https://snoopy-production-8e09.up.railway.app |
| GitHub | https://github.com/changnpc/SNOOPY |

## Branch Strategy
- `main` → production (auto-deploy Vercel + Railway)
- `develop` → next version development
- `feature/*` → branch from `develop`

## Monorepo Layout
```
/
├── snoopy-frontend/        # Angular app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/       # guards, interceptors, services
│   │   │   ├── features/   # page components (auth, dashboard, athlete, ...)
│   │   │   └── shared/     # reusable components, pipes, base classes
│   │   └── styles.scss     # global design tokens + component styles (~3000 lines)
│   ├── public/             # favicon.svg, favicon.ico
│   └── vercel.json         # /api/* → Railway proxy
├── snoopy-backend/
│   ├── src/
│   │   ├── config/         # env.config.ts, sheets.config.ts
│   │   ├── modules/        # feature modules (auth, athlete, attendance, ...)
│   │   └── main.ts
│   └── railway.toml        # Railway build config
├── docker-compose.yml
├── docker-compose.dev.yml
└── railway.toml            # Root-level Railway config (points to snoopy-backend/)
```

## Design System
- Token-driven SCSS in `styles.scss` — change tokens, all components follow
- CSS custom properties: `--primary`, `--surface`, `--bg`, `--danger`, `--success`, etc.
- Dark mode: `[data-theme="dark"]` on `<html>`
- Icons: Material Symbols Rounded
- Fonts: Mali (Thai+Latin display), Fredoka (numerals/wordmark), Sarabun (body Thai)

## Key Patterns
- **Repository**: `SheetRepository<T>` base class — all data modules extend it
- **Feature components**: extend `CrudModalBase` for create/edit/delete modal pattern
- **API services**: extend `ResourceService<T>` for standard CRUD HTTP calls
- **Auth guard**: `AuthGuard` checks JWT; role check via `RoleGuard`
- **i18n**: `t` pipe for Thai/EN translation (simple key-value map)
- **Cache**: read-through cache on Sheet reads (TTL-based, in-memory)

## Environment Variables (Backend)
| Var | Where |
|---|---|
| `JWT_SECRET` | Railway |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Railway |
| `GOOGLE_REDIRECT_URI` | Railway = `https://snoopy-inky.vercel.app/login` |
| `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` | Railway (base64 of service-account.json) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Railway |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Railway |
| `CORS_ORIGIN` | Railway = `https://snoopy-inky.vercel.app` |

Local dev uses `.env` + `GOOGLE_SERVICE_ACCOUNT_KEY_PATH=credentials/service-account.json`

## Constraints
- **No licensed Peanuts/Snoopy character art** — use abstract comic motifs only
- **Never commit** `.env`, `credentials/`, `dist/`, `node_modules/`
- Backend must pass `validateEnv()` on startup or process.exit(1)
- Google Sheets is source of truth — no migration scripts, no SQL

## Commands
```bash
# Frontend dev
cd snoopy-frontend && ng serve

# Backend dev
cd snoopy-backend && npm run start:dev

# Build check
cd snoopy-frontend && ng build --configuration production

# Type check (no emit)
cd snoopy-frontend && npx tsc --noEmit
cd snoopy-backend && npx tsc --noEmit

# Docker dev stack
docker compose -f docker-compose.dev.yml up --build
```

## Token-Saving Rules for Claude
- Read only files needed for current task
- Prefer `Edit` over `Write` for existing files
- Skip reading files already in context
- Run parallel tool calls when independent
- Don't re-read files after editing (Edit/Write error = fail, no need to verify)
- Caveman mode active by default (`/caveman`)
