import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import {
  CfnApplication,
  CfnConfigurationProfile,
  CfnDeployment,
  CfnEnvironment,
  CfnHostedConfigurationVersion,
} from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';
import { ENVIRONMENT_NAME, APP_CONFIG_APPLICATION_NAME, APP_CONFIG_PROFILE_NAME, APP_CONFIG_DEPLOYMENT_STRATEGY_ID } from '../config/constants';

export interface AppConfigStackProps extends StackProps {}

export class AppConfigStack extends Stack {
  /** AppConfig application ID — pass to LambdaStack for IAM + env vars. */
  public readonly applicationId: string;
  /** AppConfig environment ID. */
  public readonly environmentId: string;
  /** AppConfig configuration profile ID for the tickers config. */
  public readonly tickersProfileId: string;

  constructor(scope: Construct, id: string, props: AppConfigStackProps = {}) {
    super(scope, id, props);

    const application = new CfnApplication(this, 'DelphiConfigApp', {
      name: APP_CONFIG_APPLICATION_NAME,
    });

    const environment = new CfnEnvironment(this, 'DelphiConfigEnv', {
      applicationId: application.ref,
      name: ENVIRONMENT_NAME,
    });

    const tickersProfile = new CfnConfigurationProfile(this, 'TickersProfile', {
      applicationId: application.ref,
      name: APP_CONFIG_PROFILE_NAME,
      locationUri: 'hosted',
    });

    const configVersion = new CfnHostedConfigurationVersion(this, 'TickersConfig', {
      applicationId: application.ref,
      configurationProfileId: tickersProfile.ref,
      contentType: 'application/json',
      content: JSON.stringify({ tickers: [] }),
    });

    // AppConfig.AllAtOnce is a predefined strategy — no need to create one.
    new CfnDeployment(this, 'TickersDeployment', {
      applicationId: application.ref,
      configurationProfileId: tickersProfile.ref,
      configurationVersion: configVersion.ref,
      deploymentStrategyId: APP_CONFIG_DEPLOYMENT_STRATEGY_ID,
      environmentId: environment.ref,
    });

    this.applicationId  = application.ref;
    this.environmentId   = environment.ref;
    this.tickersProfileId = tickersProfile.ref;

    new CfnOutput(this, 'AppConfigApplicationId',  { value: application.ref });
    new CfnOutput(this, 'AppConfigEnvironmentId',  { value: environment.ref });
    new CfnOutput(this, 'AppConfigTickersProfileId', { value: tickersProfile.ref });
  }
}
