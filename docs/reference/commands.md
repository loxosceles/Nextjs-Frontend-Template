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
| `pnpm deploy:dev` | Deploy to dev |
| `pnpm deploy:prod` | Deploy to prod |

## Infrastructure CLI (stubs — pending `@loxosceles/cdk-cli-core`)

| Command | Description |
|---------|-------------|
| `pnpm --filter=infrastructure deploy` | CDK deploy |
| `pnpm --filter=infrastructure build-and-publish-web` | Build + S3 upload + CF invalidation |
| `pnpm --filter=infrastructure ssm-params` | Manage SSM parameters |
