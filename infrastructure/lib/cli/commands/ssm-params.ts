/**
 * SSM params command.
 * Requires @loxosceles/cdk-cli-core — install it and wire up this command.
 * Responsibilities: upload / export SSM parameters for the project
 */
export async function handleSsmParams(_action: 'upload' | 'export'): Promise<void> {
  throw new Error('Not implemented. See docs/guides/deployment.md.');
}
