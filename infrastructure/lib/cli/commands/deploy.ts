/**
 * Deploy command.
 * Requires @loxosceles/cdk-cli-core — install it and wire up this command.
 * Responsibilities: CDK deploy → build frontend → S3 sync → CloudFront invalidation
 */
export async function handleDeploy(_verbose = false): Promise<void> {
  throw new Error('Not implemented. See docs/guides/deployment.md.');
}
