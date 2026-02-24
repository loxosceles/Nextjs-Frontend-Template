# Local Development

## Bootstrap a New Project

```sh
mkdir my-project && cd my-project
curl -fsSL https://raw.githubusercontent.com/loxosceles/nextjs-frontend-template/main/setup.sh | bash
```

The directory name becomes the project name. `setup.sh` will prompt for GitHub username, git
identity, SSH mode, and optional mounts.

## Host Config (Optional)

To pre-fill prompts on future projects, copy the template and fill in your values:

```sh
cp devcontainer-defaults.env.template ~/.config/devcontainer-defaults.env
```

## After Bootstrap

```sh
git remote add origin git@github.com:<username>/<project>.git
pnpm install
pnpm dev        # http://localhost:3000
```

## Devcontainer

Open the project in VS Code and click **Reopen in Container**. The devcontainer mounts
whatever you opted into during `setup.sh` (SSH, AWS credentials, ZSH config, etc.).

To add or change mounts after bootstrap, edit `.devcontainer/devcontainer.json` directly.

## Bootstrap Config

Create `infrastructure/.env.dev` (gitignored) before running CDK locally:

```sh
cp infrastructure/.env_TEMPLATE infrastructure/.env.dev
# fill in CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION
```
