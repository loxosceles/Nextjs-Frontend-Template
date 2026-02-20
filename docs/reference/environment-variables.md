# Environment Variables

## Bootstrap (CDK synth inputs)

Stored in `infrastructure/.env.{stage}` locally or as CI environment variables.
Never committed. See `infrastructure/.env_TEMPLATE`.

| Variable | Required | Description |
|----------|----------|-------------|
| `CDK_DEFAULT_ACCOUNT` | Always | AWS account ID |
| `CDK_DEFAULT_REGION` | Always | Default AWS region |
| `PROD_DOMAIN_NAME` | prod only | Custom domain (e.g. `example.com`) |
| `CERTIFICATE_ARN` | prod only | ACM cert ARN (must be in `us-east-1`) |

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
| `ENVIRONMENT` | `dev` | Active stage — set by `.envrc` |

## Devcontainer

Set in `.devcontainer/.env` (gitignored). See `.devcontainer/.env_TEMPLATE`.

| Variable | Description |
|----------|-------------|
| `GITHUB_USERNAME` | Used by `post_create.sh` for dotfiles |
| `GIT_NAME` | Git identity inside container |
| `GIT_EMAIL` | Git identity inside container |
