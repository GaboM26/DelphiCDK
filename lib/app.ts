#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { AppConfigStack } from './stacks/app-config-stack';
import { LambdaStack } from './stacks/lambda-stack';
import { STRATEGY_DEFAULT_NAME, SCHEDULE_DEFAULT_INTERVAL_MINUTES } from './config/constants';

function parseBooleanContext(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'y', 'on'].includes(normalizedValue)) {
      return true;
    }

    if (['false', '0', 'no', 'n', 'off'].includes(normalizedValue)) {
      return false;
    }
  }

  throw new Error(`Invalid boolean context value: ${String(value)}`);
}

const app = new App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };
const strategyName = app.node.tryGetContext('strategy') ?? STRATEGY_DEFAULT_NAME;
const scheduleMinutes = Number(app.node.tryGetContext('scheduleMinutes') ?? SCHEDULE_DEFAULT_INTERVAL_MINUTES);
const scheduleEnabled = parseBooleanContext(app.node.tryGetContext('scheduleEnabled'), true);

const appConfigStack = new AppConfigStack(app, 'DelphiAppConfigStack', {
  env,
});

new LambdaStack(app, 'DelphiLambdaStack', {
  env,
  // Override defaults via: cdk deploy -c strategy=time-event-comparison -c scheduleMinutes=15 -c scheduleEnabled=false
  strategyName,
  scheduleMinutes,
  scheduleEnabled,
  appConfigStack,
});
