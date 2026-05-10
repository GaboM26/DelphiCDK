#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_REGION="${AWS_REGION:-${CDK_DEFAULT_REGION:-$(aws configure get region 2>/dev/null || true)}}"
DEFAULT_ACCOUNT="${AWS_ACCOUNT_ID:-${CDK_DEFAULT_ACCOUNT:-}}"

AWS_ACCOUNT_ID="$DEFAULT_ACCOUNT"
AWS_REGION="$DEFAULT_REGION"
AWS_PROFILE_NAME="${AWS_PROFILE:-}"
STRATEGY_NAME=""
SCHEDULE_MINUTES=""
SCHEDULE_ENABLED=1
LAMBDA_ONLY=0
RUN_BOOTSTRAP=0
SKIP_INSTALL=0
REQUIRE_APPROVAL="broadening"
DEPLOYMENT_ARGS=()

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [options] [-- <extra cdk deploy args>]

Builds and deploys the Delphi CDK stacks from this package.

Options:
  --account ID              AWS account ID for bootstrap/deploy target
  --region REGION           AWS region for bootstrap/deploy target
  --profile NAME            AWS CLI profile to use
  --strategy NAME           CDK context override for the Lambda strategy
  --schedule-minutes N      CDK context override for the EventBridge schedule
  --disable-schedule        Deploy the Lambda without creating the EventBridge schedule
  --bootstrap               Run `cdk bootstrap` before deploy
  --lambda-only             Deploy only DelphiLambdaStack
  --skip-install            Skip `npm install`
  --require-approval MODE   CDK approval mode (default: broadening)
  -h, --help                Show this help

Examples:
  ./deploy.sh
  ./deploy.sh --bootstrap
  ./deploy.sh --account 123456789012 --region us-east-1
  ./deploy.sh --strategy yes-no-arbitrage --schedule-minutes 15
  ./deploy.sh --disable-schedule
  ./deploy.sh --lambda-only
  ./deploy.sh --bootstrap -- --verbose
EOF
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: required command '$command_name' is not installed or not on PATH." >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --account)
      AWS_ACCOUNT_ID="${2:-}"
      shift 2
      ;;
    --region)
      AWS_REGION="${2:-}"
      shift 2
      ;;
    --profile)
      AWS_PROFILE_NAME="${2:-}"
      shift 2
      ;;
    --strategy)
      STRATEGY_NAME="${2:-}"
      shift 2
      ;;
    --schedule-minutes)
      SCHEDULE_MINUTES="${2:-}"
      shift 2
      ;;
    --disable-schedule)
      SCHEDULE_ENABLED=0
      shift
      ;;
    --bootstrap)
      RUN_BOOTSTRAP=1
      shift
      ;;
    --lambda-only)
      LAMBDA_ONLY=1
      shift
      ;;
    --skip-bootstrap)
      echo "Warning: --skip-bootstrap is now the default and no longer needed." >&2
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --require-approval)
      REQUIRE_APPROVAL="${2:-}"
      shift 2
      ;;
    --)
      shift
      DEPLOYMENT_ARGS+=("$@")
      break
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown option '$1'." >&2
      usage
      exit 1
      ;;
  esac
done

require_command aws
require_command npm
require_command npx
require_command docker

cd "$SCRIPT_DIR"

if [[ -z "$AWS_REGION" ]]; then
  echo "Error: AWS region is not set. Pass --region or configure AWS CLI." >&2
  exit 1
fi

if [[ -n "$AWS_PROFILE_NAME" ]]; then
  export AWS_PROFILE="$AWS_PROFILE_NAME"
fi

export CDK_DEFAULT_REGION="$AWS_REGION"
export AWS_REGION

if [[ -z "$AWS_ACCOUNT_ID" ]]; then
  AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
fi

export CDK_DEFAULT_ACCOUNT="$AWS_ACCOUNT_ID"

echo "==> Delphi CDK deployment"
echo "    account: $AWS_ACCOUNT_ID"
echo "    region:  $AWS_REGION"
if [[ -n "$AWS_PROFILE_NAME" ]]; then
  echo "    profile: $AWS_PROFILE_NAME"
fi
if [[ -n "$STRATEGY_NAME" ]]; then
  echo "    strategy override: $STRATEGY_NAME"
fi
if [[ -n "$SCHEDULE_MINUTES" ]]; then
  echo "    schedule override: $SCHEDULE_MINUTES minute(s)"
fi
if [[ "$SCHEDULE_ENABLED" -eq 0 ]]; then
  echo "    schedule: disabled"
fi
if [[ "$LAMBDA_ONLY" -eq 1 ]]; then
  echo "    deployment mode: lambda-only"
fi

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "==> Installing CDK dependencies"
  npm install
fi

echo "==> Building CDK app"
npm run build

if [[ "$RUN_BOOTSTRAP" -eq 1 ]]; then
  echo "==> Bootstrapping CDK environment"
  npx cdk bootstrap "aws://$AWS_ACCOUNT_ID/$AWS_REGION"
fi

export DELPHI_LOAD_DOTENV=1

BASE_CDK_DEPLOY_CMD=(
  npx cdk deploy
  --require-approval "$REQUIRE_APPROVAL"
)

if [[ -n "$STRATEGY_NAME" ]]; then
  BASE_CDK_DEPLOY_CMD+=(-c "strategy=$STRATEGY_NAME")
fi

if [[ -n "$SCHEDULE_MINUTES" ]]; then
  BASE_CDK_DEPLOY_CMD+=(-c "scheduleMinutes=$SCHEDULE_MINUTES")
fi

if [[ "$SCHEDULE_ENABLED" -eq 0 ]]; then
  BASE_CDK_DEPLOY_CMD+=(-c "scheduleEnabled=false")
fi

if [[ ${#DEPLOYMENT_ARGS[@]} -gt 0 ]]; then
  BASE_CDK_DEPLOY_CMD+=("${DEPLOYMENT_ARGS[@]}")
fi

if [[ "$LAMBDA_ONLY" -eq 1 ]]; then
  echo "==> Deploying Lambda stack only"
  "${BASE_CDK_DEPLOY_CMD[@]}" DelphiLambdaStack
  exit 0
fi

echo "==> Deploying secrets stack"
"${BASE_CDK_DEPLOY_CMD[@]}" DelphiSecretsStack

echo "==> Syncing Kalshi runtime secrets"
SECRET_EXPORTS="$(npx ts-node scripts/sync-kalshi-secrets.ts)"
if [[ -n "$SECRET_EXPORTS" ]]; then
  eval "$SECRET_EXPORTS"
fi

echo "==> Deploying AppConfig and Lambda stacks"
"${BASE_CDK_DEPLOY_CMD[@]}" DelphiAppConfigStack DelphiLambdaStack
