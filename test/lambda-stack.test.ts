import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { LAMBDA_FUNCTION_NAME, LAMBDA_MEMORY_MB, LAMBDA_TIMEOUT_SEC } from '../lib/config/lambda-config';
import { AppConfigStack } from '../lib/stacks/app-config-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';

describe('LambdaStack', () => {
  test('deploys the analysis Lambda as a Docker asset and schedules it', () => {
    const app = new App();
    const appConfigStack = new AppConfigStack(app, 'AppConfigTestStack');
    const stack = new LambdaStack(app, 'LambdaTestStack', {
      strategyName: 'yes-no-arbitrage',
      scheduleMinutes: 15,
      scheduleEnabled: true,
      appConfigStack,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: LAMBDA_FUNCTION_NAME,
      PackageType: 'Image',
      MemorySize: LAMBDA_MEMORY_MB,
      Timeout: LAMBDA_TIMEOUT_SEC,
      Description: 'Delphi Kalshi analysis — strategy: yes-no-arbitrage',
      Code: {
        ImageUri: Match.anyValue(),
      },
    });

    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'rate(15 minutes)',
      Targets: Match.arrayWith([
        Match.objectLike({
          Input: '{"strategy":"yes-no-arbitrage"}',
        }),
      ]),
    });

    const synthesized = JSON.stringify(template.toJSON());
    expect(synthesized).not.toContain('delphi-kalshi');
    expect(synthesized).not.toContain(':latest');
  });

  test('can deploy the analysis Lambda without creating an EventBridge schedule', () => {
    const app = new App();
    const appConfigStack = new AppConfigStack(app, 'AppConfigNoScheduleTestStack');
    const stack = new LambdaStack(app, 'LambdaNoScheduleTestStack', {
      strategyName: 'yes-no-arbitrage',
      scheduleMinutes: 15,
      scheduleEnabled: false,
      appConfigStack,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: LAMBDA_FUNCTION_NAME,
      PackageType: 'Image',
    });

    template.resourceCountIs('AWS::Events::Rule', 0);
  });
});
