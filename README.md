# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Dependencies & when to run `npm install`

- **When to run:** After any change to package.json or package-lock.json, after cloning or pulling the repo, after switching branches that modify dependencies, or when `node_modules` is removed.
- **Install command:** `npm install` — installs packages listed in `package.json` and updates `node_modules`.
- **Deterministic installs (CI / fresh clones):** use `npm ci` to install exactly from `package-lock.json`.
- **Avoid sudo:** Do not run `npm install` with `sudo` in your WSL user environment; prefer a per-user Node manager like `nvm`.
- **Permission errors:** If you get EACCES or cache permission errors, fix ownership and clear cache:

```bash
sudo chown -R "$(id -u):$(id -g)" ~/.npm
npm cache clean --force
npm install
```