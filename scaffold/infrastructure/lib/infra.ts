#!/usr/bin/env ts-node
/**
 * Infrastructure CLI — 1-tier pattern.
 * Single entry point for all infrastructure operations.
 *
 * Usage: ts-node lib/infra.ts <command>
 * Commands: deploy | publish | ssm-upload | synth | destroy
 */
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { IAMClient, ListOpenIDConnectProvidersCommand, CreateOpenIDConnectProviderCommand } from '@aws-sdk/client-iam';
import { EnvironmentManager, BootstrapEnv } from './core/environment-manager';
import { PROJECT_NAME, PROJECT_ROOT, FRONTEND_OUT_DIR } from '../configs/project.config';
import { getStackConfig } from '../configs/stack-config';

// ─── Stage validation ────────────────────────────────────────────────────────
const stage = EnvironmentManager.getStage();

const config = getStackConfig(stage);
let _bootstrap: BootstrapEnv | undefined;
function bootstrap(): BootstrapEnv {
  if (!_bootstrap) _bootstrap = new EnvironmentManager(stage).load();
  return _bootstrap;
}
function region(): string { return bootstrap().cdkDefaultRegion; }
const ssmPrefix = `/${PROJECT_NAME}/${stage}`;

// ─── Commands ────────────────────────────────────────────────────────────────
const [command] = process.argv.slice(2);

async function main() {
  switch (command) {
    case 'deploy':
      if (stage === 'prod') { console.error('Production deploy must go through CI/CD pipeline'); process.exit(1); }
      await deploy();
      break;
    case 'deploy:pipeline': await deployPipeline(); break;
    case 'publish':   await publish(); break;
    case 'ssm-upload': await ssmUpload(); break;
    case 'github-vars': await githubVars(); break;
    case 'setup-oidc': await setupOidc(); break;
    case 'synth':     await run('npx', ['cdk', 'synth']); break;
    case 'destroy':
      if (stage === 'prod') { console.error('Production destroy not allowed'); process.exit(1); }
      await run('npx', ['cdk', 'destroy', '--all', '--force']);
      break;
    default:
      console.log('Usage: ts-node lib/infra.ts <command>');
      console.log('Commands: deploy | deploy:pipeline | publish | ssm-upload | github-vars | setup-oidc | synth | destroy');
      process.exit(1);
  }
}

async function deployPipeline() {
  console.log(`🚀 Deploying pipeline stack for ${stage}...`);
  await run('npx', ['cdk', 'deploy', `${PROJECT_NAME}-pipeline-${stage}`, '--require-approval', 'never', '-c', 'deployTarget=pipeline']);
  console.log('✅ Pipeline stack deployed');
}

async function deploy() {
  console.log(`🚀 Deploying ${stage}...`);
  await run('npx', ['cdk', 'deploy', '--all', '--require-approval', 'never']);
  await publish();
  console.log(`\n✅ Deployment complete — https://${await getStackOutput('CloudfrontDomain')}`);
}

async function publish() {
  console.log('🏗️  Building frontend...');
  await run('pnpm', ['--filter', 'frontend', 'run', 'build'], PROJECT_ROOT);

  const bucketName = await getStackOutput('WebBucketName');
  console.log(`📤 Uploading to ${bucketName}...`);
  await syncToS3(FRONTEND_OUT_DIR, bucketName);

  const distId = await getStackOutput('CloudfrontDistributionId');
  console.log('🔄 Invalidating CloudFront cache...');
  await new CloudFrontClient({ region: region() }).send(new CreateInvalidationCommand({
    DistributionId: distId,
    InvalidationBatch: { Paths: { Quantity: 1, Items: ['/*'] }, CallerReference: `${Date.now()}` }
  }));

  console.log('✅ Frontend published');
}

async function ssmUpload() {
  const envPath = path.join(PROJECT_ROOT, 'infrastructure', `.env.${stage}`);
  console.log(`📤 Uploading bootstrap params from ${envPath}...`);

  const content = await fs.readFile(envPath, 'utf-8');
  const ssm = new SSMClient({ region: region() });

  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    const paramName = `${ssmPrefix}/stack/${key}`;
    await ssm.send(new PutParameterCommand({ Name: paramName, Value: value, Type: 'String', Overwrite: true }));
    console.log(`  ✓ ${paramName}`);
  }

  console.log('✅ SSM parameters uploaded');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function githubVars() {
  console.log('Setting GitHub repo variables...');
  const vars: Record<string, string> = {
    PROJECT_NAME,
    AWS_ACCOUNT_ID: bootstrap().cdkDefaultAccount,
    AWS_REGION_DEFAULT: bootstrap().cdkDefaultRegion
  };
  for (const [name, value] of Object.entries(vars)) {
    await run('gh', ['variable', 'set', name, '--body', value], PROJECT_ROOT);
  }
  console.log('✅ GitHub variables set');
  await run('gh', ['variable', 'list'], PROJECT_ROOT);
}

async function setupOidc() {
  const iam = new IAMClient({ region: region() });
  const providerUrl = 'token.actions.githubusercontent.com';
  const res = await iam.send(new ListOpenIDConnectProvidersCommand({}));
  const exists = res.OpenIDConnectProviderList?.some(
    (provider) => provider.Arn?.includes(providerUrl)
  );
  if (exists) {
    console.log('✅ GitHub OIDC provider already exists');
    return;
  }
  await iam.send(new CreateOpenIDConnectProviderCommand({
    Url: `https://${providerUrl}`,
    ClientIDList: ['sts.amazonaws.com'],
    ThumbprintList: ['1c58a3a8518e8759bf075b76b750d4f2df264fcd']
  }));
  console.log('✅ GitHub OIDC provider created');
}

async function getStackOutput(outputKey: string): Promise<string> {
  const cf = new CloudFormationClient({ region: region() });
  const res = await cf.send(new DescribeStacksCommand({ StackName: config.stackName }));
  const output = res.Stacks?.[0]?.Outputs?.find((o: { OutputKey?: string }) => o.OutputKey === outputKey);
  if (!output?.OutputValue) throw new Error(`Output ${outputKey} not found in ${config.stackName}`);
  return output.OutputValue;
}

async function syncToS3(dir: string, bucket: string) {
  const s3 = new S3Client({ region: region() });
  const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
    '.webp': 'image/webp', '.txt': 'text/plain', '.xml': 'application/xml',
  };

  async function upload(dirPath: string) {
    for (const entry of await fs.readdir(dirPath, { withFileTypes: true })) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) { await upload(full); continue; }
      const key = path.relative(dir, full).replace(/\\/g, '/');
      const ext = path.extname(full).toLowerCase();
      await s3.send(new PutObjectCommand({
        Bucket: bucket, Key: key, Body: await fs.readFile(full),
        ContentType: CONTENT_TYPES[ext] || 'application/octet-stream'
      }));
    }
  }
  await upload(dir);
}

function run(cmd: string, args: string[], cwd = path.join(PROJECT_ROOT, 'infrastructure')): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', cwd });
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)));
    proc.on('error', reject);
  });
}

main().catch(err => { console.error(err.message); process.exit(1); });
