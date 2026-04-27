/**
 * Centralized configuration constants for Delphi CDK infrastructure.
 */

/** Environment name */
export const ENVIRONMENT_NAME = 'prod';

/** AppConfig application name */
export const APP_CONFIG_APPLICATION_NAME = 'DelphiConfig';

/** AppConfig profile name */
export const APP_CONFIG_PROFILE_NAME = 'tickers';

/** AppConfig deployment strategy ID */
export const APP_CONFIG_DEPLOYMENT_STRATEGY_ID = 'AppConfig.AllAtOnce';

/** Default strategy name */
export const STRATEGY_DEFAULT_NAME = 'time-event-comparison';

/** Default EventBridge schedule interval in minutes */
export const SCHEDULE_DEFAULT_INTERVAL_MINUTES = 15;
