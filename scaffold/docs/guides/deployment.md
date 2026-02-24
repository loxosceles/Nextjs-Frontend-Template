# Deployment

## Prerequisites

- AWS CDK bootstrapped in target account/region: `cdk bootstrap aws://<account>/<region>`
- Bootstrap config in `infrastructure/.env.{stage}` (local) or CI environment variables
- GitHub personal access token (PAT) with `repo` and `workflow` scopes stored in AWS Secrets Manager as `GH_AUTOMATION_TOKEN`. This is a shared secret used by all projects for CodePipeline source access:
  ```sh
  aws secretsmanager create-secret --name GH_AUTOMATION_TOKEN --secret-string <your-github-pat>
  ```

## Bootstrap Config

`infrastructure/.env.dev` (gitignored):
```sh
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=eu-west-1
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
```

`infrastructure/.env.prod` (gitignored) — additionally requires:
```sh
PROD_DOMAIN_NAME=example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/...
```

> Note: `CERTIFICATE_ARN` must be in `us-east-1` (CloudFront requirement).

## GitHub Repository Variables

Set these in GitHub → Settings → Secrets and variables → Actions → Variables.

| Variable | Description |
|----------|-------------|
| `PROJECT_NAME` | Project name (matches `project.config.ts`) |
| `AWS_ACCOUNT_ID` | AWS account ID |
| `AWS_REGION_DEFAULT` | AWS region (e.g. `eu-central-1`) |

Or run from inside the devcontainer:

```sh
gh auth login       # one-time setup
pnpm github-vars    # reads from project.config.ts and .env.dev
```

## Deploy

```sh
pnpm deploy:dev            # CDK deploy + Next.js build + S3 upload + CF invalidation
pnpm deploy:pipeline:dev   # Deploy CI/CD pipeline stack for dev
pnpm deploy:pipeline:prod  # Deploy CI/CD pipeline stack for prod
```

> Production web deployment is blocked locally — it must go through the CI/CD pipeline.

## CI/CD Flow

```
feature/* → dev    PR merge → CodePipeline dev (buildspec.yml)
dev → main         PR merge → version-and-tag → CodePipeline prod
```

CodePipeline runs `buildspec.yml` which:
1. Validates all required env vars (set by CodeBuild environment variables in pipeline-stack.ts)
2. Runs CDK deploy
3. Builds Next.js and uploads to S3
4. Invalidates CloudFront

## SSM Runtime Outputs

After first deploy, these SSM parameters are available:

| Parameter | Description |
|-----------|-------------|
| `/{project}/{stage}/cloudfront-domain` | CloudFront distribution domain |
| `/{project}/{stage}/cloudfront-distribution-id` | Distribution ID (for invalidation) |
| `/{project}/{stage}/bucket-name` | S3 bucket name |
