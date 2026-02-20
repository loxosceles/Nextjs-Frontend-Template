import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vitest';
import { WebStack } from '../lib/stacks/web-stack';
import { BootstrapEnv } from '../lib/core/environment-manager';

const bootstrap: BootstrapEnv = {
  cdkDefaultAccount: '123456789012',
  cdkDefaultRegion: 'eu-west-1'
};

function buildTemplate(stage: 'dev' | 'prod') {
  const app = new cdk.App();
  const stack = new WebStack(app, `WebStack-${stage}`, {
    env: { account: bootstrap.cdkDefaultAccount, region: bootstrap.cdkDefaultRegion },
    stage,
    bootstrap
  });
  return Template.fromStack(stack);
}

describe('WebStack', () => {
  it('creates an S3 bucket and CloudFront distribution', () => {
    const t = buildTemplate('dev');
    t.resourceCountIs('AWS::S3::Bucket', 1);
    t.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  it('bucket uses DESTROY policy in dev', () => {
    buildTemplate('dev').hasResource('AWS::S3::Bucket', {
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete'
    });
  });

  it('bucket uses RETAIN policy in prod', () => {
    buildTemplate('prod').hasResource('AWS::S3::Bucket', {
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain'
    });
  });

  it('writes three SSM parameters', () => {
    buildTemplate('dev').resourceCountIs('AWS::SSM::Parameter', 3);
  });
});
