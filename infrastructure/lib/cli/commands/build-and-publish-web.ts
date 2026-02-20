/**
 * Build and publish web command.
 * Requires @loxosceles/cdk-cli-core — install it and wire up this command.
 * Responsibilities: build Next.js → S3 sync → CloudFront invalidation
 */
export async function handleBuildAndPublishWeb(_verbose = false): Promise<void> {
  throw new Error('Not implemented. See docs/guides/deployment.md.');
}
