#!/usr/bin/env ts-node
import { program } from 'commander';
import { handleSsmParams } from '../commands/ssm-params';

program
  .name('ssm-params')
  .description('Upload or export SSM parameters')
  .command('upload').description('Upload parameters to SSM').action(async () => {
    await handleSsmParams('upload');
  });

program
  .command('export').description('Export parameters from SSM').action(async () => {
    await handleSsmParams('export');
  });

program.parse();
