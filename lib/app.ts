#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { AppConfigStack } from './stacks/app-config-stack';
import { LambdaStack } from './stacks/lambda-stack';
import { LAMBDA_IMAGE_TAG } from './config/lambda-config';
import { STRATEGY_DEFAULT_NAME, SCHEDULE_DEFAULT_INTERVAL_MINUTES } from './config/constants';

const app = new App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

const appConfigStack = new AppConfigStack(app, 'DelphiAppConfigStack', {
  env,
});

new LambdaStack(app, 'DelphiLambdaStack', {
  env,
  imageTag: LAMBDA_IMAGE_TAG,
  // Override defaults via: cdk deploy -c strategy=time-event-comparison -c scheduleMinutes=15
  strategyName:    STRATEGY_DEFAULT_NAME,
  scheduleMinutes: Number(app.node.tryGetContext('scheduleMinutes') ?? SCHEDULE_DEFAULT_INTERVAL_MINUTES),
  appConfigStack,
});
