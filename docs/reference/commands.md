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
| `pnpm deploy:prod` | Deploy to prod |

## Setup Scripts

| Script | Description |
|--------|-------------|
| `pnpm github-vars` | Set GitHub repo variables for CI/CD (requires `gh auth login`) |

## Infrastructure CLI (`infrastructure/lib/infra.ts`)

Single entry point — 1-tier pattern. All commands via `ts-node lib/infra.ts <command>`.

| Command | Description |
|---------|-------------|
| `deploy` | CDK deploy + build frontend + S3 upload + CF invalidation |
| `publish` | Build frontend + S3 upload + CF invalidation (no CDK) |
| `ssm-upload` | Upload `.env.{stage}` params to SSM Parameter Store |
| `synth` | CDK synth |
| `destroy` | CDK destroy (blocked for prod) |
