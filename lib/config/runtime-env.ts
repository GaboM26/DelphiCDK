import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parse } from 'dotenv';
import { DEMO_KALSHI_SECRET_NAME, PROD_KALSHI_SECRET_NAME } from './constants';

const DELPHI_DOTENV_FLAG = 'DELPHI_LOAD_DOTENV';
const PROD_SECRET_NAME_ENV = 'KALSHI_SECRET_NAME';
const DEMO_SECRET_NAME_ENV = 'KALSHI_DEMO_SECRET_NAME';

const FORWARDED_RUNTIME_ENV_KEYS = [
  'DEBUG',
  'ENVIRONMENT',
  'KALSHI_DEMO',
  'KALSHI_RETRIES',
  'KALSHI_TIMEOUT',
  'LOG_LEVEL',
  'LOG_LOG_FILE',
  'LOG_ROTATION',
  'MULTI_EVENT_COUNT',
  'STRATEGY_DEFAULT_TICKER',
  'STRATEGY_MARKET_LIMIT',
  'STRATEGY_PROBABILITY_METHOD',
  'TICKER',
] as const;

export interface LambdaRuntimeConfig {
  lambdaEnvironment: Record<string, string>;
}

export interface KalshiSecretNames {
  prodSecretName: string;
  demoSecretName: string;
}

function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function getMergedEnvValue(dotenvEnv: Record<string, string>, key: string): string | undefined {
  const processValue = process.env[key]?.trim();
  if (processValue) {
    return processValue;
  }

  const dotenvValue = dotenvEnv[key]?.trim();
  return dotenvValue || undefined;
}

function loadSiblingDelphiDotenv(sourceRoot: string): Record<string, string> {
  if (!isTruthy(process.env[DELPHI_DOTENV_FLAG])) {
    return {};
  }

  const dotenvPath = resolve(sourceRoot, 'Delphi', '.env');
  if (!existsSync(dotenvPath)) {
    return {};
  }

  return parse(readFileSync(dotenvPath));
}

export function getSourceRootFromCdkDir(cdkRootOrBuildDir: string): string {
  return basename(cdkRootOrBuildDir) === 'build'
    ? resolve(cdkRootOrBuildDir, '..', '..')
    : resolve(cdkRootOrBuildDir, '..');
}

export function resolveLambdaRuntimeConfig(sourceRoot: string): LambdaRuntimeConfig {
  const dotenvEnv = loadSiblingDelphiDotenv(sourceRoot);
  const lambdaEnvironment: Record<string, string> = {};

  for (const key of FORWARDED_RUNTIME_ENV_KEYS) {
    const value = getMergedEnvValue(dotenvEnv, key);
    if (value) {
      lambdaEnvironment[key] = value;
    }
  }

  return { lambdaEnvironment };
}

export function resolveKalshiSecretNames(sourceRoot: string): KalshiSecretNames {
  const dotenvEnv = loadSiblingDelphiDotenv(sourceRoot);

  return {
    prodSecretName: getMergedEnvValue(dotenvEnv, PROD_SECRET_NAME_ENV) ?? PROD_KALSHI_SECRET_NAME,
    demoSecretName: getMergedEnvValue(dotenvEnv, DEMO_SECRET_NAME_ENV) ?? DEMO_KALSHI_SECRET_NAME,
  };
}
