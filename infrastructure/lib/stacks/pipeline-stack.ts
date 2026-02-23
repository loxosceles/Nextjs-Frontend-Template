import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface PipelineStackProps extends cdk.StackProps {
  projectName: string;
  stage: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubTokenSecretName: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { projectName, stage, githubOwner, githubRepo, githubBranch, githubTokenSecretName } = props;

    // GitHub OIDC provider (one per account — must already exist)
    const oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this, 'GitHubOidc',
      `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
    );

    // IAM role for GitHub Actions to trigger this pipeline
    const ghRole = new iam.Role(this, 'GitHubActionsRole', {
      roleName: `${projectName}-github-actions-${stage}`,
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
        StringLike: { 'token.actions.githubusercontent.com:sub': `repo:${githubOwner}/${githubRepo}:*` }
      }),
      maxSessionDuration: cdk.Duration.hours(1)
    });

    ghRole.addToPolicy(new iam.PolicyStatement({
      actions: ['codepipeline:StartPipelineExecution'],
      resources: [`arn:aws:codepipeline:${this.region}:${this.account}:${projectName}-pipeline-${stage}`]
    }));

    // Artifacts bucket
    const artifactsBucket = new s3.Bucket(this, 'Artifacts', {
      bucketName: `${projectName}-pipeline-artifacts-${stage}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // CodeBuild role
    const buildRole = new iam.Role(this, 'CodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess')],
      inlinePolicies: {
        IAMPermissions: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            actions: [
              'iam:CreateRole', 'iam:DeleteRole', 'iam:AttachRolePolicy', 'iam:DetachRolePolicy',
              'iam:PutRolePolicy', 'iam:DeleteRolePolicy', 'iam:GetRole', 'iam:PassRole',
              'iam:TagRole', 'iam:UntagRole', 'iam:ListRolePolicies', 'iam:ListAttachedRolePolicies'
            ],
            resources: [`arn:aws:iam::${this.account}:role/${projectName}-*`]
          })]
        })
      }
    });

    // CodeBuild project
    const buildProject = new codebuild.Project(this, 'Build', {
      projectName: `${projectName}-build-${stage}`,
      role: buildRole,
      source: codebuild.Source.gitHub({ owner: githubOwner, repo: githubRepo, webhook: false }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      environmentVariables: {
        ENVIRONMENT: { value: stage },
        PROJECT_NAME: { value: projectName },
        CDK_DEFAULT_ACCOUNT: { value: this.account },
        CDK_DEFAULT_REGION: { value: this.region }
      }
    });

    // Pipeline
    const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');

    new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `${projectName}-pipeline-${stage}`,
      artifactBucket: artifactsBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [new codepipeline_actions.GitHubSourceAction({
            actionName: 'GitHub',
            owner: githubOwner,
            repo: githubRepo,
            branch: githubBranch,
            oauthToken: cdk.SecretValue.secretsManager(githubTokenSecretName),
            output: sourceOutput,
            trigger: codepipeline_actions.GitHubTrigger.NONE
          })]
        },
        {
          stageName: 'Build',
          actions: [new codepipeline_actions.CodeBuildAction({
            actionName: 'Deploy',
            project: buildProject,
            input: sourceOutput,
            outputs: [buildOutput]
          })]
        }
      ]
    });

    new cdk.CfnOutput(this, 'GitHubActionsRoleArn', { value: ghRole.roleArn });
  }
}
