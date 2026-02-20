#!/usr/bin/env ts-node
import * as cdk from 'aws-cdk-lib';
import { WebStack } from '../lib/stacks/web-stack';
import { EnvironmentManager } from '../lib/core/environment-manager';
import { SUPPORTED_STAGES, Stage } from '../configs/project.config';

const stage = (process.env.ENVIRONMENT ?? 'dev') as Stage;
if (!SUPPORTED_STAGES.includes(stage)) {
  throw new Error(`Invalid ENVIRONMENT "${stage}". Must be one of: ${SUPPORTED_STAGES.join(', ')}`);
}

const bootstrap = new EnvironmentManager(stage).load();
const app = new cdk.App();

new WebStack(app, `WebStack-${stage}`, {
  env: { account: bootstrap.cdkDefaultAccount, region: bootstrap.cdkDefaultRegion },
  stage,
  bootstrap
});
