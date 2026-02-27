#!/usr/bin/env ts-node
import * as cdk from 'aws-cdk-lib';
import { WebStack } from '../lib/stacks/web-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';
import { EnvironmentManager } from '../lib/core/environment-manager';
import { PROJECT_NAME } from '../configs/project.config';

const stage = EnvironmentManager.getStage();

const app = new cdk.App();
const target = (app.node.tryGetContext('deployTarget') || 'web') as 'web' | 'pipeline';
const bootstrap = new EnvironmentManager(stage).load(target);
const env = { account: bootstrap.cdkDefaultAccount, region: bootstrap.cdkDefaultRegion };

if (target === 'web') {
  new WebStack(app, `${PROJECT_NAME}-web-${stage}`, { env, stage, bootstrap });
}

if (bootstrap.githubOwner && bootstrap.githubRepo) {
  new PipelineStack(app, `${PROJECT_NAME}-pipeline-${stage}`, {
    env,
    projectName: PROJECT_NAME,
    stage,
    githubOwner: bootstrap.githubOwner,
    githubRepo: bootstrap.githubRepo,
    githubBranch: stage === 'prod' ? 'main' : 'dev'
  });
}
