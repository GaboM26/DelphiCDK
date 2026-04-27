import { basename, resolve } from 'node:path';
import { Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaTarget } from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { AppConfigStack } from './app-config-stack';
import { LAMBDA_FUNCTION_NAME, LAMBDA_MEMORY_MB, LAMBDA_TIMEOUT_SEC } from '../config/lambda-config';

const CDK_ROOT_OR_BUILD_DIR = resolve(__dirname, '..', '..');
const SOURCE_ROOT = basename(CDK_ROOT_OR_BUILD_DIR) === 'build'
  ? resolve(CDK_ROOT_OR_BUILD_DIR, '..', '..')
  : resolve(CDK_ROOT_OR_BUILD_DIR, '..');
const DOCKER_ASSET_EXCLUDES = [
  'Delphi/.git',
  'Delphi/.venv',
  'Delphi/.pytest_cache',
  'Delphi/.logs',
  'Delphi/tst',
  'Delphi/secrets',
  'DelphiCDK',
  'DelphiResearch',
  'DelphiImageBuild/README.md',
  'DelphiImageBuild/build.sh',
  'DelphiImageBuild/build.bat',
];

export interface LambdaStackProps extends StackProps {
  /** Strategy forwarded as event payload to the Lambda. Default: 'time-event-comparison' */
  strategyName: string;
  /** How often to trigger the Lambda in minutes. Default: 15 */
  scheduleMinutes: number;
  /** Whether to create and enable the EventBridge schedule. Default: true */
  scheduleEnabled: boolean;
  /** AppConfig stack whose IDs are injected into the Lambda as env vars. */
  appConfigStack?: AppConfigStack;
}

export class LambdaStack extends Stack {
  public readonly analysisFunction: DockerImageFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const {
      strategyName,
      scheduleMinutes,
      scheduleEnabled,
      appConfigStack,
    } = props;

    const appConfigEnv = appConfigStack
      ? {
          APPCONFIG_APP_ID:             appConfigStack.applicationId,
          APPCONFIG_ENV_ID:             appConfigStack.environmentId,
          APPCONFIG_TICKERS_PROFILE_ID: appConfigStack.tickersProfileId,
        }
      : undefined;

    this.analysisFunction = new DockerImageFunction(this, 'AnalysisFunction', {
      functionName: LAMBDA_FUNCTION_NAME,
      code: DockerImageCode.fromImageAsset(SOURCE_ROOT, {
        file: 'DelphiImageBuild/Dockerfile',
        exclude: DOCKER_ASSET_EXCLUDES,
      }),
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

    if (scheduleEnabled) {
      // Build the event payload forwarded to the Lambda on each invocation.
      const eventPayload: Record<string, unknown> = { strategy: strategyName };

      const rule = new Rule(this, 'AnalysisSchedule', {
        ruleName: 'delphi-analysis-schedule',
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
}
