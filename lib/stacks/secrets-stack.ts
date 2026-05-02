import { CfnOutput, RemovalPolicy, SecretValue, Stack, type StackProps } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { resolve } from 'node:path';
import { getSourceRootFromCdkDir, resolveKalshiSecretNames } from '../config/runtime-env';

const SOURCE_ROOT = getSourceRootFromCdkDir(resolve(__dirname, '..', '..'));

export interface SecretsStackProps extends StackProps {}

export class SecretsStack extends Stack {
  public readonly prodSecret: Secret;
  public readonly demoSecret: Secret;

  constructor(scope: Construct, id: string, props: SecretsStackProps = {}) {
    super(scope, id, props);

    const { prodSecretName, demoSecretName } = resolveKalshiSecretNames(SOURCE_ROOT);

    this.prodSecret = new Secret(this, 'KalshiProdSecret', {
      secretName: prodSecretName,
      description: 'Delphi production Kalshi credentials',
      removalPolicy: RemovalPolicy.RETAIN,
      secretObjectValue: {
        apiKey: SecretValue.unsafePlainText('replace-me'),
        apiSecret: SecretValue.unsafePlainText('replace-me'),
      },
    });

    this.demoSecret = new Secret(this, 'KalshiDemoSecret', {
      secretName: demoSecretName,
      description: 'Delphi demo Kalshi credentials',
      removalPolicy: RemovalPolicy.RETAIN,
      secretObjectValue: {
        apiKey: SecretValue.unsafePlainText('replace-me'),
        apiSecret: SecretValue.unsafePlainText('replace-me'),
      },
    });

    new CfnOutput(this, 'KalshiProdSecretName', { value: this.prodSecret.secretName });
    new CfnOutput(this, 'KalshiDemoSecretName', { value: this.demoSecret.secretName });
  }
}
