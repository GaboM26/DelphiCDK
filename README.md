# DelphiCDK

AWS CDK app for deploying the Delphi analysis Lambda and its AppConfig resources.

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

Or run the packaged deploy script:

```bash
./deploy.sh
```

The script runs `npm install`, `npm run build`, `cdk bootstrap`, and `cdk deploy` for both stacks. It also supports the same context overrides:

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
- Store Kalshi credentials outside the repo and inject them through AWS configuration; do not commit secrets.
