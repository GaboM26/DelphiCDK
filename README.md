# DelphiCDK

AWS CDK app for deploying Delphi with three separate infrastructure stacks: Secrets Manager, AppConfig, and the analysis Lambda.

## What deploy uses now

`cdk deploy` builds the Lambda container image directly from the shared `src/` workspace using `src/DelphiImageBuild/Dockerfile`.

That means changes to:

- `src/Delphi/src/**`
- `src/Delphi/requirements.txt`
- `src/DelphiImageBuild/Dockerfile`

produce a new Docker asset hash, so the Lambda picks up the latest application code on every deploy without relying on a mutable `:latest` ECR tag.

## First deployment

Run these commands from `src/DelphiCDK/`:

```bash
npm install
npm run build
npx cdk bootstrap aws://ACCOUNT_ID/AWS_REGION
npx cdk deploy
```

If your AWS account and region are already exported in the shell, plain `npx cdk bootstrap` also works.

When you use `./deploy.sh`, it also mirrors local Kalshi credentials into AWS Secrets Manager before deployment and passes only the secret names to the Lambda runtime.

Or run the packaged deploy script:

```bash
./deploy.sh
```

The script runs `npm install`, `npm run build`, `cdk bootstrap`, deploys the secrets stack, syncs Kalshi values into those secrets, then deploys the AppConfig and Lambda stacks. It also supports the same context overrides:

```bash
./deploy.sh --account 123456789012 --region us-east-1
./deploy.sh --strategy yes-no-arbitrage --schedule-minutes 15
./deploy.sh --account 707859599298 --region us-east-1 --disable-schedule
./deploy.sh --skip-bootstrap
```

## Useful deploy commands

```bash
# Preview the synthesized template
npx cdk synth

# Review infrastructure changes before deploy
npx cdk diff

# Override the scheduled strategy and cadence
npx cdk deploy -c strategy=yes-no-arbitrage -c scheduleMinutes=15

# Deploy the Lambda stack without creating the EventBridge schedule
npx cdk deploy -c scheduleEnabled=false
```

## Notes

- The stack no longer depends on a manually managed Delphi ECR repository for deployment.
- `src/DelphiImageBuild/` is still useful for local/manual Docker smoke tests, but it is no longer required for `cdk deploy`.
- `DelphiSecretsStack` owns the Secrets Manager secret containers; `deploy.sh` updates their values from shell env or `src/Delphi/.env`.
- `DelphiLambdaStack` only receives secret names and IAM read access; the Python runtime fetches the actual Kalshi credentials from Secrets Manager.
- Store Kalshi credentials outside the repo and inject them through AWS configuration; do not commit secrets.
