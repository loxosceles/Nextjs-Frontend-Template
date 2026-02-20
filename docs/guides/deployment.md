# Deployment

## Prerequisites

- AWS CDK bootstrapped in target account/region: `cdk bootstrap aws://<account>/<region>`
- Bootstrap config in `infrastructure/.env.{stage}` (local) or CI environment variables

## Bootstrap Config

`infrastructure/.env.dev` (gitignored):
```sh
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=eu-west-1
```

`infrastructure/.env.prod` (gitignored) — additionally requires:
```sh
PROD_DOMAIN_NAME=example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/...
```

> Note: `CERTIFICATE_ARN` must be in `us-east-1` (CloudFront requirement).

## Deploy

```sh
pnpm deploy:dev   # ENVIRONMENT=dev CDK deploy + Next.js build + S3 upload
pnpm deploy:prod  # ENVIRONMENT=prod
```

## CI/CD Flow

```
feature/* → dev    PR merge → CodePipeline dev (buildspec.yml)
dev → main         PR merge → version-and-tag → CodePipeline prod
```

CodePipeline runs `buildspec.yml` which:
1. Fetches bootstrap config from SSM (pre-populated by `ssm-params upload`)
2. Validates all required params
3. Runs CDK deploy
4. Builds Next.js and uploads to S3
5. Invalidates CloudFront

## SSM Runtime Outputs

After first deploy, these SSM parameters are available:

| Parameter | Description |
|-----------|-------------|
| `/{project}/{stage}/cloudfront-domain` | CloudFront distribution domain |
| `/{project}/{stage}/cloudfront-distribution-id` | Distribution ID (for invalidation) |
| `/{project}/{stage}/bucket-name` | S3 bucket name |
