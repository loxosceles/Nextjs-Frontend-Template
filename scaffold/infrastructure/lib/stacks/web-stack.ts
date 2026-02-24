import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Stage, PROJECT_NAME } from '../../configs/project.config';
import { BootstrapEnv } from '../core/environment-manager';
import { getStackConfig } from '../../configs/stack-config';

interface WebStackProps extends cdk.StackProps {
  stage: Stage;
  bootstrap: BootstrapEnv;
}

export class WebStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const config = getStackConfig(props.stage);
    const prefix = `/${PROJECT_NAME}/${props.stage}`;

    this.bucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: config.bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        props.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== 'prod'
    });

    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC');

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
          originAccessControl: oac
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/404.html' }
      ]
    });

    // ─── SSM outputs (runtime config for services / buildspec) ───────────────
    new ssm.StringParameter(this, 'SsmCloudfrontDomain', {
      parameterName: `${prefix}/cloudfront-domain`,
      stringValue: this.distribution.distributionDomainName
    });
    new ssm.StringParameter(this, 'SsmCloudfrontId', {
      parameterName: `${prefix}/cloudfront-distribution-id`,
      stringValue: this.distribution.distributionId
    });
    new ssm.StringParameter(this, 'SsmBucketName', {
      parameterName: `${prefix}/bucket-name`,
      stringValue: this.bucket.bucketName
    });

    // ─── CloudFormation outputs ───────────────────────────────────────────────
    new cdk.CfnOutput(this, 'CloudfrontDomain', {
      value: this.distribution.distributionDomainName
    });
    new cdk.CfnOutput(this, 'CloudfrontDistributionId', {
      value: this.distribution.distributionId
    });
    new cdk.CfnOutput(this, 'WebBucketName', {
      value: this.bucket.bucketName
    });
  }
}
