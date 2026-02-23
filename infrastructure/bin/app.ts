#!/usr/bin/env ts-node
import * as cdk from 'aws-cdk-lib';
import { WebStack } from '../lib/stacks/web-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';
import { EnvironmentManager } from '../lib/core/environment-manager';
import { SUPPORTED_STAGES, Stage, PROJECT_NAME, GITHUB_TOKEN_SECRET_NAME } from '../configs/project.config';

const stage = process.env.ENVIRONMENT as Stage;
if (!stage || !SUPPORTED_STAGES.includes(stage)) {
  throw new Error(`ENVIRONMENT is required. Must be one of: ${SUPPORTED_STAGES.join(', ')}`);
}

const bootstrap = new EnvironmentManager(stage).load();
const app = new cdk.App();
const env = { account: bootstrap.cdkDefaultAccount, region: bootstrap.cdkDefaultRegion };

new WebStack(app, `${PROJECT_NAME}-web-${stage}`, { env, stage, bootstrap });

if (bootstrap.githubOwner && bootstrap.githubRepo) {
  new PipelineStack(app, `${PROJECT_NAME}-pipeline-${stage}`, {
    env,
    projectName: PROJECT_NAME,
    stage,
    githubOwner: bootstrap.githubOwner,
    githubRepo: bootstrap.githubRepo,
    githubBranch: stage === 'prod' ? 'main' : 'dev',
    githubTokenSecretName: GITHUB_TOKEN_SECRET_NAME
  });
}
