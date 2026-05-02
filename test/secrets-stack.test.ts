import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecretsStack } from '../lib/stacks/secrets-stack';

describe('SecretsStack', () => {
  test('creates retained Secrets Manager secrets for prod and demo Kalshi credentials', () => {
    const app = new App();
    const stack = new SecretsStack(app, 'SecretsStackTest');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::SecretsManager::Secret', 2);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'delphi/kalshi/prod',
      Description: 'Delphi production Kalshi credentials',
    });
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'delphi/kalshi/demo',
      Description: 'Delphi demo Kalshi credentials',
    });
  });
});
