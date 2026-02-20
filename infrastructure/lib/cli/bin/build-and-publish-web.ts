#!/usr/bin/env ts-node
import { program } from 'commander';
import { handleBuildAndPublishWeb } from '../commands/build-and-publish-web';

program
  .name('build-and-publish-web')
  .description('Build Next.js frontend and publish to S3')
  .option('-v, --verbose', 'Enable verbose output', false)
  .action(async (options) => {
    try {
      await handleBuildAndPublishWeb(options.verbose);
    } catch (error) {
      console.error('Build and publish failed:', error);
      process.exit(1);
    }
  });

program.parse();
