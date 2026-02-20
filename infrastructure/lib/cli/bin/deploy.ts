#!/usr/bin/env ts-node
import { program } from 'commander';
import { handleDeploy } from '../commands/deploy';

program
  .name('deploy')
  .description('Deploy infrastructure and publish frontend')
  .option('-v, --verbose', 'Enable verbose output', false)
  .action(async (options) => {
    try {
      await handleDeploy(options.verbose);
    } catch (error) {
      console.error('Deployment failed:', error);
      process.exit(1);
    }
  });

program.parse();
