# Commands Reference

## Root

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server (port 3000) |
| `pnpm build` | Build static export to `frontend/out/` |
| `pnpm lint` | Run ESLint across all workspaces |
| `pnpm lint:fix` | Run ESLint with auto-fix |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check (used in CI) |
| `pnpm test` | Run all tests (frontend + infrastructure) |
| `pnpm test:frontend` | Frontend tests only |
| `pnpm test:infra` | Infrastructure tests only |
| `pnpm synth` | CDK synth (requires `infrastructure/.env.dev`) |
| `pnpm deploy:dev` | Deploy to dev (CDK + build + publish) |
| `pnpm deploy:pipeline:dev` | Deploy pipeline stack for dev |
| `pnpm deploy:pipeline:prod` | Deploy pipeline stack for prod |
| `pnpm github-vars` | Set GitHub repo variables for CI/CD (requires `gh auth login`) |
| `pnpm setup-oidc` | Create GitHub OIDC provider in AWS account (idempotent) |
| `pnpm destroy:dev` | Destroy dev stacks |

## Infrastructure CLI (`infrastructure/lib/infra.ts`)

Single entry point — 1-tier pattern. All commands via `ts-node lib/infra.ts <command>`.

| Command | Description |
|---------|-------------|
| `deploy` | CDK deploy + build frontend + S3 upload + CF invalidation (blocked for prod) |
| `deploy:pipeline` | Deploy pipeline stack only (any stage) |
| `publish` | Build frontend + S3 upload + CF invalidation (no CDK) |
| `ssm-upload` | Upload `.env.{stage}` params to SSM Parameter Store |
| `github-vars` | Set GitHub repo variables (PROJECT_NAME, AWS_ACCOUNT_ID, AWS_REGION_DEFAULT) |
| `setup-oidc` | Create GitHub OIDC provider in AWS (idempotent) |
| `synth` | CDK synth |
| `destroy` | CDK destroy (blocked for prod) |

## Environment Management

All `process.env` access is centralized in `EnvironmentManager`:

- `EnvironmentManager.getStage()` — reads `ENVIRONMENT` env var, validates against supported stages
- `new EnvironmentManager(stage).load(target)` — loads bootstrap config from `.env.{stage}` + CI env vars
  - `target='web'` (default): validates account, region; for prod also validates domain + cert
  - `target='pipeline'`: validates account, region only (no domain/cert needed)

## Deploy Targets

| Target | dev | prod |
|--------|-----|------|
| `web` | `pnpm deploy:dev` | CI/CD pipeline only |
| `pipeline` | `pnpm deploy:pipeline:dev` | `pnpm deploy:pipeline:prod` |
