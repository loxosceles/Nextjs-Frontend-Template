# nextjs-static-template

Project template for Next.js + AWS CDK (static export via S3/CloudFront).

## Usage

```bash
mkdir my-project && cd my-project
curl -fsSL https://raw.githubusercontent.com/loxosceles/nextjs-static-template/main/setup.sh | bash
```

## Structure

- `setup.sh` — Bootstrap script (runs on host)
- `scaffold/` — Project files extracted into new projects
- `devcontainer-defaults.env.template` — Host config reference

## Host Config

Copy `devcontainer-defaults.env.template` to `~/.config/devcontainer-defaults.env` and fill in values. The setup script reads this to auto-configure mounts and credentials.
