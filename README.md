# DelphiCDK
Delphi app CDK resources

This is a TypeScript CDK project for deploying Delphi application resources on AWS.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Project Structure

* `bin/delphi-cdk.ts` — App entry point; instantiates the stacks
* `lib/sample-stack.ts` — `SampleStack` placeholder; replace with your Delphi resource stacks
* `test/` — Jest unit tests for your CDK stacks

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
