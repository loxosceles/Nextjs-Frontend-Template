import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Stage, SUPPORTED_STAGES, PROJECT_ROOT } from '../../configs/project.config';

export interface BootstrapEnv {
  cdkDefaultAccount: string;
  cdkDefaultRegion: string;
  githubOwner?: string;
  githubRepo?: string;
  prodDomainName?: string;
  certificateArn?: string;
}

/**
 * Loads bootstrap config for CDK synth.
 * Local: reads infrastructure/.env.{stage}
 * CI: process.env (set by GH Actions vars or pre-exported SSM params)
 * CI env vars always override file values.
 */
export class EnvironmentManager {
  constructor(private readonly stage: Stage) {}

  static getStage(): Stage {
    const stage = process.env.ENVIRONMENT as Stage;
    if (!stage || !SUPPORTED_STAGES.includes(stage)) {
      throw new Error(`Invalid ENVIRONMENT: ${stage}. Must be one of: ${SUPPORTED_STAGES.join(', ')}`);
    }
    return stage;
  }

  load(target: 'web' | 'pipeline' = 'web'): BootstrapEnv {
    const envPath = path.join(PROJECT_ROOT, 'infrastructure', `.env.${this.stage}`);
    let env: Record<string, string> = {};

    if (fs.existsSync(envPath)) {
      env = dotenv.parse(fs.readFileSync(envPath));
    }

    // CI env vars override file values
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) env[k] = v;
    }

    this.validate(env, target);

    return {
      cdkDefaultAccount: env.CDK_DEFAULT_ACCOUNT,
      cdkDefaultRegion: env.CDK_DEFAULT_REGION,
      githubOwner: env.GITHUB_OWNER,
      githubRepo: env.GITHUB_REPO,
      ...(this.stage === 'prod' && {
        prodDomainName: env.PROD_DOMAIN_NAME,
        certificateArn: env.CERTIFICATE_ARN
      })
    };
  }

  private validate(env: Record<string, string>, target: 'web' | 'pipeline'): void {
    const required = ['CDK_DEFAULT_ACCOUNT', 'CDK_DEFAULT_REGION'];
    if (this.stage === 'prod' && target === 'web') {
      required.push('PROD_DOMAIN_NAME', 'CERTIFICATE_ARN');
    }
    const missing = required.filter(k => !env[k]);
    if (missing.length > 0) {
      throw new Error(
        `Missing bootstrap config: ${missing.join(', ')}\n` +
          `Add to infrastructure/.env.${this.stage} or set in CI environment.`
      );
    }
  }
}
