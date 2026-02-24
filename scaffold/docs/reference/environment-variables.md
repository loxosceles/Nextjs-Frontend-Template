# Environment Variables

## Bootstrap (CDK synth inputs)

Stored in `infrastructure/.env.{stage}` locally or as CI environment variables.
Never committed. See `infrastructure/.env_TEMPLATE`.

Validation is per-stage AND per-target (controlled by `EnvironmentManager.load(target)`):

| Variable | dev/web | dev/pipeline | prod/web | prod/pipeline |
|----------|---------|--------------|----------|---------------|
| `CDK_DEFAULT_ACCOUNT` | ✅ | ✅ | ✅ | ✅ |
| `CDK_DEFAULT_REGION` | ✅ | ✅ | ✅ | ✅ |
| `PROD_DOMAIN_NAME` | — | — | ✅ | — |
| `CERTIFICATE_ARN` | — | — | ✅ | — |

| Variable | Required | Description |
|----------|----------|-------------|
| `CDK_DEFAULT_ACCOUNT` | Always | AWS account ID |
| `CDK_DEFAULT_REGION` | Always | Default AWS region |
| `GITHUB_OWNER` | For pipeline | GitHub username/org |
| `GITHUB_REPO` | For pipeline | GitHub repository name |
| `PROD_DOMAIN_NAME` | prod web only | Custom domain (e.g. `example.com`) |
| `CERTIFICATE_ARN` | prod web only | ACM cert ARN (must be in `us-east-1`) |

## Runtime (SSM Parameter Store outputs)

Written by CDK after deploy. Read by buildspec and services at runtime.

| SSM Path | Description |
|----------|-------------|
| `/{project}/{stage}/cloudfront-domain` | CloudFront domain |
| `/{project}/{stage}/cloudfront-distribution-id` | Distribution ID |
| `/{project}/{stage}/bucket-name` | S3 bucket name |

## Shell

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `dev` | Active stage — set by `.envrc` or CI. Read exclusively by `EnvironmentManager.getStage()` |

## Devcontainer

Set in `.devcontainer/.env` (gitignored). See `.devcontainer/.env_TEMPLATE`.

| Variable | Description |
|----------|-------------|
| `GITHUB_USERNAME` | Used by `post_create.sh` for dotfiles |
| `GIT_NAME` | Git identity inside container |
| `GIT_EMAIL` | Git identity inside container |
