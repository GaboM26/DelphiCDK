import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { LAMBDA_FUNCTION_NAME, LAMBDA_MEMORY_MB, LAMBDA_TIMEOUT_SEC } from '../lib/config/lambda-config';
import { AppConfigStack } from '../lib/stacks/app-config-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';
import { SecretsStack } from '../lib/stacks/secrets-stack';

describe('LambdaStack', () => {
  const runtimeEnvKeys = [
    'KALSHI_DEMO',
    'STRATEGY_DEFAULT_TICKER',
    'LOG_LEVEL',
    'KALSHI_SECRET_NAME',
    'KALSHI_DEMO_SECRET_NAME',
  ] as const;

  const originalEnv = Object.fromEntries(runtimeEnvKeys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of runtimeEnvKeys) {
      const originalValue = originalEnv[key];
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  });

  test('deploys the analysis Lambda as a Docker asset and schedules it', () => {
    const app = new App();
    const secretsStack = new SecretsStack(app, 'SecretsTestStack');
    const appConfigStack = new AppConfigStack(app, 'AppConfigTestStack');
    const stack = new LambdaStack(app, 'LambdaTestStack', {
      strategyName: 'yes-no-arbitrage',
      scheduleMinutes: 15,
      scheduleEnabled: true,
      appConfigStack,
      secretsStack,
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
    const secretsStack = new SecretsStack(app, 'SecretsNoScheduleTestStack');
    const appConfigStack = new AppConfigStack(app, 'AppConfigNoScheduleTestStack');
    const stack = new LambdaStack(app, 'LambdaNoScheduleTestStack', {
      strategyName: 'yes-no-arbitrage',
      scheduleMinutes: 15,
      scheduleEnabled: false,
      appConfigStack,
      secretsStack,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: LAMBDA_FUNCTION_NAME,
      PackageType: 'Image',
    });

    template.resourceCountIs('AWS::Events::Rule', 0);
  });

  test('forwards runtime environment and secret references into the Lambda', () => {
    process.env.KALSHI_DEMO = 'true';
    process.env.STRATEGY_DEFAULT_TICKER = 'ENV-TICKER';
    process.env.LOG_LEVEL = 'DEBUG';
    process.env.KALSHI_SECRET_NAME = 'delphi/kalshi/prod';
    process.env.KALSHI_DEMO_SECRET_NAME = 'delphi/kalshi/demo';

    const app = new App();
    const secretsStack = new SecretsStack(app, 'SecretsEnvTestStack');
    const appConfigStack = new AppConfigStack(app, 'AppConfigEnvTestStack');
    const stack = new LambdaStack(app, 'LambdaEnvTestStack', {
      strategyName: 'time-event-comparison',
      scheduleMinutes: 15,
      scheduleEnabled: false,
      appConfigStack,
      secretsStack,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          KALSHI_DEMO: 'true',
          STRATEGY_DEFAULT_TICKER: 'ENV-TICKER',
          LOG_LEVEL: 'DEBUG',
          KALSHI_SECRET_NAME: Match.anyValue(),
          KALSHI_DEMO_SECRET_NAME: Match.anyValue(),
        }),
      },
    });

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'secretsmanager:GetSecretValue',
            ]),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});
