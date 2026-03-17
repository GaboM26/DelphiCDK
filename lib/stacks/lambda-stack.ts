import { Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaTarget } from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { AppConfigStack } from './app-config-stack';
import { ECR_REPOSITORY_NAME } from '../config/constants';
import { LAMBDA_IMAGE_TAG, LAMBDA_FUNCTION_NAME, LAMBDA_MEMORY_MB, LAMBDA_TIMEOUT_SEC } from '../config/lambda-config';

export interface LambdaStackProps extends StackProps {
  /** Image tag to deploy. Default: 'latest' */
  imageTag: string;
  /** Strategy forwarded as event payload to the Lambda. Default: 'time-event-comparison' */
  strategyName: string;
  /** How often to trigger the Lambda in minutes. Default: 15 */
  scheduleMinutes: number;
  /** AppConfig stack whose IDs are injected into the Lambda as env vars. */
  appConfigStack?: AppConfigStack;
}

export class LambdaStack extends Stack {
  public readonly analysisFunction: DockerImageFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const {
      imageTag,
      strategyName,
      scheduleMinutes,
      appConfigStack,
    } = props;

    // Reference the ECR repo built and pushed by DelphiImageBuild.
    // The repo must already exist before running `cdk deploy`.
    const repo = Repository.fromRepositoryName(this, 'DelphiKalshiRepo', ECR_REPOSITORY_NAME);

    const appConfigEnv = appConfigStack
      ? {
          APPCONFIG_APP_ID:             appConfigStack.applicationId,
          APPCONFIG_ENV_ID:             appConfigStack.environmentId,
          APPCONFIG_TICKERS_PROFILE_ID: appConfigStack.tickersProfileId,
        }
      : undefined;

    this.analysisFunction = new DockerImageFunction(this, 'AnalysisFunction', {
      functionName: LAMBDA_FUNCTION_NAME,
      code: DockerImageCode.fromEcr(repo, { tagOrDigest: imageTag }),
      memorySize: LAMBDA_MEMORY_MB,
      timeout: Duration.seconds(LAMBDA_TIMEOUT_SEC),
      description: `Delphi Kalshi analysis — strategy: ${strategyName}`,
      environment: appConfigEnv,
    });

    if (appConfigStack) {
      this.analysisFunction.addToRolePolicy(new PolicyStatement({
        actions: [
          'appconfig:StartConfigurationSession',
          'appconfig:GetLatestConfiguration',
        ],
        resources: [
          `arn:aws:appconfig:*:*:application/${appConfigStack.applicationId}/environment/${appConfigStack.environmentId}/configuration/${appConfigStack.tickersProfileId}`,
        ],
      }));
    }

    // Build the event payload forwarded to the Lambda on each invocation.
    const eventPayload: Record<string, unknown> = { strategy: strategyName };

    const rule = new Rule(this, 'AnalysisSchedule', {
      ruleName: `delphi-analysis-schedule`,
      description: `Triggers Delphi analysis every ${scheduleMinutes} minute(s)`,
      schedule: Schedule.rate(Duration.minutes(scheduleMinutes)),
    });

    rule.addTarget(
      new LambdaTarget(this.analysisFunction, {
        event: RuleTargetInput.fromObject(eventPayload),
      }),
    );
  }
}
