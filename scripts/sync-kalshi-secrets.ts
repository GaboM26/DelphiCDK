import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CreateSecretCommand,
  DescribeSecretCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { parse } from 'dotenv';
import { resolveKalshiSecretNames } from '../lib/config/runtime-env';

const cdkRoot = resolve(__dirname, '..');
const workspaceRoot = resolve(cdkRoot, '..');
const delphiRoot = resolve(workspaceRoot, 'Delphi');
const dotenvPath = resolve(delphiRoot, '.env');
const resolvedSecretNames = resolveKalshiSecretNames(workspaceRoot);

function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function loadDotenvEnv(): Record<string, string> {
  if (!isTruthy(process.env.DELPHI_LOAD_DOTENV)) {
    return {};
  }

  if (!existsSync(dotenvPath)) {
    return {};
  }

  return parse(readFileSync(dotenvPath));
}

const dotenvEnv = loadDotenvEnv();

function resolveEnvValue(key: string): string | undefined {
  const processValue = process.env[key]?.trim();
  if (processValue) {
    return processValue;
  }

  const dotenvValue = dotenvEnv[key]?.trim();
  return dotenvValue || undefined;
}

function resolveSecretContents(rawKey: string, pathKey: string): string | undefined {
  const inlineSecret = resolveEnvValue(rawKey);
  if (inlineSecret) {
    return inlineSecret;
  }

  const secretPath = resolveEnvValue(pathKey);
  if (!secretPath) {
    return undefined;
  }

  const absoluteSecretPath = resolve(
    secretPath.startsWith('/') ? secretPath : resolve(delphiRoot, secretPath),
  );
  if (!existsSync(absoluteSecretPath)) {
    throw new Error(`Kalshi secret file not found: ${absoluteSecretPath}`);
  }

  return readFileSync(absoluteSecretPath, 'utf8').trim();
}

async function upsertSecret(secretName: string, secretValue: string): Promise<void> {
  const client = new SecretsManagerClient({});

  try {
    await client.send(new DescribeSecretCommand({ SecretId: secretName }));
    await client.send(
      new PutSecretValueCommand({
        SecretId: secretName,
        SecretString: secretValue,
      }),
    );
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'ResourceNotFoundException') {
      throw error;
    }

    await client.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
      }),
    );
  }
}

interface KalshiSecretSyncOptions {
  label: string;
  defaultSecretName: string;
  secretNameEnvKey: string;
  apiKeyEnvKey: string;
  apiSecretEnvKey: string;
  apiSecretPathEnvKey: string;
}

async function syncKalshiSecret(options: KalshiSecretSyncOptions): Promise<string | undefined> {
  const {
    label,
    defaultSecretName,
    secretNameEnvKey,
    apiKeyEnvKey,
    apiSecretEnvKey,
    apiSecretPathEnvKey,
  } = options;
  const apiKey = resolveEnvValue(apiKeyEnvKey);
  const apiSecret = resolveSecretContents(apiSecretEnvKey, apiSecretPathEnvKey);

  if (!(apiKey && apiSecret)) {
    return undefined;
  }

  const secretName = resolveEnvValue(secretNameEnvKey) ?? defaultSecretName;
  const secretPayload = JSON.stringify({ apiKey, apiSecret });

  await upsertSecret(secretName, secretPayload);
  console.error(`Synced ${label} Kalshi credentials to Secrets Manager secret ${secretName}`);

  return secretName;
}

async function main(): Promise<void> {
  const syncedProdSecretName = await syncKalshiSecret({
    label: 'production',
    defaultSecretName: resolvedSecretNames.prodSecretName,
    secretNameEnvKey: 'KALSHI_SECRET_NAME',
    apiKeyEnvKey: 'KALSHI_API_KEY',
    apiSecretEnvKey: 'KALSHI_API_SECRET',
    apiSecretPathEnvKey: 'KALSHI_API_SECRET_PATH',
  });

  const syncedDemoSecretName = await syncKalshiSecret({
    label: 'demo',
    defaultSecretName: resolvedSecretNames.demoSecretName,
    secretNameEnvKey: 'KALSHI_DEMO_SECRET_NAME',
    apiKeyEnvKey: 'KALSHI_DEMO_API_KEY',
    apiSecretEnvKey: 'KALSHI_DEMO_API_SECRET',
    apiSecretPathEnvKey: 'KALSHI_DEMO_API_SECRET_PATH',
  });

  const exports: string[] = [];
  if (syncedProdSecretName) {
    exports.push(`export KALSHI_SECRET_NAME=${shellEscape(syncedProdSecretName)}`);
  }
  if (syncedDemoSecretName) {
    exports.push(`export KALSHI_DEMO_SECRET_NAME=${shellEscape(syncedDemoSecretName)}`);
  }

  if (exports.length > 0) {
    process.stdout.write(`${exports.join('\n')}\n`);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
