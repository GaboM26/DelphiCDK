#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DelphiCdkStack } from '../lib/delphi_cdk-stack';

const app = new cdk.App();
new DelphiCdkStack(app, 'DelphiCdkStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
