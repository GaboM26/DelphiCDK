import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { SampleStack } from '../lib/sample-stack';

test('SampleStack synthesizes successfully', () => {
  const app = new cdk.App();
  const stack = new SampleStack(app, 'SampleStack');
  const template = Template.fromStack(stack);

  // The sample stack has no resources by default; verify it synthesizes without error.
  expect(template).toBeDefined();
});
