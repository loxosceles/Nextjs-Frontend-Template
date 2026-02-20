import { PROJECT_NAME, Stage } from './project.config';

export interface StackConfig {
  stackName: string;
  bucketName: string;
}

export function getStackConfig(stage: Stage): StackConfig {
  return {
    stackName: `${PROJECT_NAME}-web-${stage}`,
    bucketName: `${PROJECT_NAME}-web-${stage}`
  };
}
