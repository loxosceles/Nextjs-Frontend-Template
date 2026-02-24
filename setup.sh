#!/usr/bin/env bash
set -euo pipefail

# ─── Source URLs ─────────────────────────────────────────────────────────────
DEVCONTAINER_TEMPLATES_URL="https://github.com/loxosceles/devcontainer-templates/archive/main.tar.gz"
VERSIONING_TEMPLATE_URL="https://github.com/loxosceles/github-versioning-template/archive/main.tar.gz"
TEMPLATE_REPO="https://github.com/loxosceles/nextjs-static-template/archive/main.tar.gz"

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
err()  { echo -e "${RED}✗ $*${NC}" >&2; }
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
info() { echo -e "${YELLOW}ℹ $*${NC}"; }

# ─── Portable sed -i ─────────────────────────────────────────────────────────
sedi() {
  if sed --version >/dev/null 2>&1; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

# ─── Guard: empty directory only ─────────────────────────────────────────────
shopt -s dotglob nullglob
files=(*)
shopt -u dotglob nullglob
non_git=()
for f in "${files[@]}"; do [[ "$f" != ".git" ]] && non_git+=("$f"); done
if [[ ${#non_git[@]} -gt 0 ]]; then
  err "Directory is not empty. Run setup.sh from an empty directory."
  err "Found: ${non_git[*]}"
  exit 1
fi

# ─── Project name ────────────────────────────────────────────────────────────
PROJECT_NAME="$(basename "$PWD")"
info "Project name: $PROJECT_NAME"

# ─── Load host config ────────────────────────────────────────────────────────
HOST_CONFIG="$HOME/.config/devcontainer-defaults.env"
[[ -f "$HOST_CONFIG" ]] && source "$HOST_CONFIG" && info "Loaded host config from $HOST_CONFIG"

# ─── Helpers ─────────────────────────────────────────────────────────────────
prompt() {
  local var="$1" label="$2" default="${3:-}"
  [[ -n "${!var:-}" ]] && return
  if [[ -n "$default" ]]; then
    read -rp "$label [$default]: " val </dev/tty
    printf -v "$var" '%s' "${val:-$default}"
  else
    read -rp "$label: " val </dev/tty
    printf -v "$var" '%s' "$val"
  fi
}

opt_mount() {
  local label="$1" flag_var="$2" path_var="$3" default_path="${4:-}"
  [[ "${SKIP_OPTIONAL_MOUNTS:-}" == "true" ]] && return
  # If path already known from host config, auto-enable without prompting
  if [[ -n "$default_path" ]]; then
    printf -v "$path_var" '%s' "$default_path"
    printf -v "$flag_var" 'true'
    return
  fi
  read -rp "$label? [y/N]: " ans </dev/tty
  if [[ "${ans,,}" == "y" ]]; then
    prompt "$path_var" "  Path" ""
    printf -v "$flag_var" 'true'
  fi
}

# ─── Collect config ──────────────────────────────────────────────────────────
prompt GITHUB_USERNAME "GitHub username" "${GITHUB_USERNAME:-}"
prompt GIT_NAME        "Git name"        "$(git config --global user.name 2>/dev/null || true)"
prompt GIT_EMAIL       "Git email"       "$(git config --global user.email 2>/dev/null || true)"

if [[ -z "${SSH_MODE:-}" ]]; then
  SSH_MODE="$([[ -d "$HOME/.ssh/contexts" ]] && echo contexts || echo default)"
fi
info "SSH mode: $SSH_MODE"
[[ "$SSH_MODE" == "contexts" ]] && prompt SSH_CONTEXT "SSH context name" "${SSH_CONTEXT:-$PROJECT_NAME}"

opt_mount "Mount AWS credentials"  MOUNT_AWS  AWS_CREDENTIALS_PATH  "${AWS_CREDENTIALS_PATH:-}"
opt_mount "Mount ZSH config"       MOUNT_ZSH  ZSH_CONFIG_PATH       "${ZSH_CONFIG_PATH:-}"
opt_mount "Mount tmux config"      MOUNT_TMUX TMUX_CONFIG_PATH      "${TMUX_CONFIG_PATH:-}"
opt_mount "Mount ZSH history"      MOUNT_HIST ZSH_HISTORY_PATH      "${ZSH_HISTORY_PATH:-}"
opt_mount "Mount coding standards" MOUNT_STD  CODING_STANDARDS_PATH "${CODING_STANDARDS_PATH:-}"

if [[ "${SKIP_MCP:-}" != "true" ]]; then
  if [[ -z "${GITHUB_MCP_TOKEN:-}" && -z "${TRELLO_API_KEY:-}" ]]; then
    read -rp "Configure MCP servers? [y/N]: " ans </dev/tty
    if [[ "${ans,,}" == "y" ]]; then
      read -rp "  GitHub MCP token (enter to skip): " GITHUB_MCP_TOKEN </dev/tty
      read -rp "  Trello API key (enter to skip): "   TRELLO_API_KEY </dev/tty
      read -rp "  Trello token (enter to skip): "     TRELLO_TOKEN </dev/tty
    fi
  else
    info "MCP credentials loaded from $HOST_CONFIG"
  fi
fi

# ─── Pull template files ──────────────────────────────────────────────────────
info "Downloading template files..."
curl -fsSL "$TEMPLATE_REPO" | tar -xz --strip-components=2 -C . "*/scaffold/"

# ─── Create Next.js app ───────────────────────────────────────────────────────
info "Creating Next.js app..."
# Stash our template additions, run create-next-app clean, restore additions
mv frontend frontend-additions
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-git --no-eslint --use-pnpm --skip-install --yes
[ -d frontend/.git ] && rm -rf frontend/.git  # create-next-app ignores --no-git (v16+)

# Patch next.config.ts for static export
cat > frontend/next.config.ts <<'NEXTCONF'
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
};

export default nextConfig;
NEXTCONF

# Exclude vitest.config.ts from Next.js type checking
sedi 's/"exclude": \["node_modules"\]/"exclude": ["node_modules", "vitest.config.ts"]/' frontend/tsconfig.json

# Restore template additions
cp -r frontend-additions/app/__tests__ frontend/app/
cp frontend-additions/vitest.config.ts frontend-additions/vitest.setup.ts frontend-additions/.gitignore frontend/
for d in components hooks lib shared; do
  [ -f "frontend-additions/$d/.gitkeep" ] && mkdir -p "frontend/$d" && cp "frontend-additions/$d/.gitkeep" "frontend/$d/"
done
rm -rf frontend-additions

# Patch testing dependencies into frontend/package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
pkg.devDependencies = {
  ...pkg.devDependencies,
  '@testing-library/jest-dom': '^6',
  '@testing-library/react': '^16',
  '@vitejs/plugin-react': '^5',
  'jsdom': '^26',
  'vitest': '^3'
};
fs.writeFileSync('frontend/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

info "Downloading devcontainer files..."
curl -fsSL "$DEVCONTAINER_TEMPLATES_URL" | tar -xz \
  --strip-components=2 -C .devcontainer \
  "devcontainer-templates-main/nextjs-frontend/Dockerfile" \
  "devcontainer-templates-main/nextjs-frontend/devcontainer.json" \
  "devcontainer-templates-main/common/post_create.sh"

info "Downloading versioning workflows..."
curl -fsSL "$VERSIONING_TEMPLATE_URL" | tar -xz \
  --strip-components=3 -C .github/workflows \
  "github-versioning-template-main/.github/workflows/validate-version-label.yml" \
  "github-versioning-template-main/.github/workflows/version-and-tag.yml"

# ─── Patch project name ───────────────────────────────────────────────────────
info "Patching project name..."
_sed() { sedi "s/__PROJECT_NAME__/${PROJECT_NAME}/g" "$1"; }
_sed infrastructure/configs/project.config.ts
_sed .github/workflows/trigger-pipeline.yml
_sed buildspec.yml
_sed package.json
_sed README.md

# ─── Generate devcontainer.json ───────────────────────────────────────────────
info "Generating devcontainer.json..."

CONTAINER_USER=$(grep -m1 '^USER ' .devcontainer/Dockerfile 2>/dev/null | awk '{print $2}' || true)
CONTAINER_USER="${CONTAINER_USER:-node}"
CONTAINER_HOME="/home/${CONTAINER_USER}"

if [[ "$SSH_MODE" == "contexts" ]]; then
  SSH_MOUNT="{\"type\":\"bind\",\"source\":\"\${localEnv:HOME}/.ssh/contexts/${SSH_CONTEXT}\",\"target\":\"${CONTAINER_HOME}/.ssh/contexts/${SSH_CONTEXT}\"}"
else
  SSH_MOUNT="{\"type\":\"bind\",\"source\":\"\${localEnv:HOME}/.ssh\",\"target\":\"${CONTAINER_HOME}/.ssh\"}"
fi

_rel_source() { echo "\${localEnv:HOME}/${1#"$HOME"/}"; }

MOUNTS="[$SSH_MOUNT"
[[ "${MOUNT_AWS:-}"  == "true" ]] && MOUNTS+=",{\"type\":\"bind\",\"source\":\"$(_rel_source "${AWS_CREDENTIALS_PATH}")\",\"target\":\"${CONTAINER_HOME}/.aws\"}"
[[ "${MOUNT_ZSH:-}"  == "true" ]] && MOUNTS+=",{\"type\":\"bind\",\"source\":\"$(_rel_source "${ZSH_CONFIG_PATH}")\",\"target\":\"${CONTAINER_HOME}/.config/zsh\"}"
[[ "${MOUNT_TMUX:-}" == "true" ]] && MOUNTS+=",{\"type\":\"bind\",\"source\":\"$(_rel_source "${TMUX_CONFIG_PATH}")\",\"target\":\"${CONTAINER_HOME}/.tmux\"}"
[[ "${MOUNT_HIST:-}" == "true" ]] && MOUNTS+=",{\"type\":\"bind\",\"source\":\"$(_rel_source "${ZSH_HISTORY_PATH}")\",\"target\":\"${CONTAINER_HOME}/.zsh_history\"}"
[[ "${MOUNT_STD:-}"  == "true" ]] && MOUNTS+=",{\"type\":\"bind\",\"source\":\"$(_rel_source "${CODING_STANDARDS_PATH}")\",\"target\":\"\${containerWorkspaceFolder}/docs/ai-dev-rules\"}"
MOUNTS+="]"

STATUS_COLOR=$(printf '#%02x%02x%02x' $((RANDOM%156+50)) $((RANDOM%156+50)) $((RANDOM%156+50)))

python3 - <<PYEOF
import json, re
with open('.devcontainer/devcontainer.json') as f:
    d = json.loads(re.sub(r'//[^\n]*', '', f.read()))
d['containerEnv']['SSH_CONTEXT'] = '${SSH_CONTEXT:-default}'
d['containerEnv']['GITHUB_USERNAME'] = '${GITHUB_USERNAME:-}'
d['containerEnv']['GIT_NAME'] = '${GIT_NAME:-}'
d['containerEnv']['GIT_EMAIL'] = '${GIT_EMAIL:-}'
d['mounts'] = json.loads('${MOUNTS}')
d.pop('runArgs', None)
with open('.devcontainer/devcontainer.json', 'w') as f:
    json.dump(d, f, indent=2)
PYEOF

# ─── .vscode/settings.json ───────────────────────────────────────────────────
mkdir -p .vscode
cat > .vscode/settings.json <<JSON
{
  "workbench.colorCustomizations": { "statusBar.background": "$STATUS_COLOR" },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.useFlatConfig": true,
  "[typescript][typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
JSON

# ─── MCP configs ─────────────────────────────────────────────────────────────
mkdir -p .amazonq
_mcp() {
  cat <<JSON
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_MCP_TOKEN}" }
    },
    "trello": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-trello"],
      "env": { "TRELLO_API_KEY": "${TRELLO_API_KEY}", "TRELLO_TOKEN": "${TRELLO_TOKEN}" }
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
JSON
}
_mcp > .vscode/mcp.json
_mcp > .amazonq/mcp.json

# ─── git init ────────────────────────────────────────────────────────────────
git init
[[ -n "${GIT_NAME:-}"  ]] && git config user.name "$GIT_NAME"
[[ -n "${GIT_EMAIL:-}" ]] && git config user.email "$GIT_EMAIL"

# ─── Save host config ────────────────────────────────────────────────────────
_upsert_config() {
  local key="$1" value="$2" file="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sedi "s|^${key}=.*|${key}=\"${value}\"|" "$file"
  else
    echo "${key}=\"${value}\"" >> "$file"
  fi
}

_write_host_config() {
  mkdir -p "$(dirname "$HOST_CONFIG")"
  touch "$HOST_CONFIG"
  _upsert_config GITHUB_USERNAME       "${GITHUB_USERNAME:-}"       "$HOST_CONFIG"
  _upsert_config GIT_NAME              "${GIT_NAME:-}"              "$HOST_CONFIG"
  _upsert_config GIT_EMAIL             "${GIT_EMAIL:-}"             "$HOST_CONFIG"
  _upsert_config SSH_MODE              "${SSH_MODE:-default}"       "$HOST_CONFIG"
  _upsert_config SSH_CONTEXT           "${SSH_CONTEXT:-}"           "$HOST_CONFIG"
  _upsert_config AWS_CREDENTIALS_PATH  "${AWS_CREDENTIALS_PATH:-}"  "$HOST_CONFIG"
  _upsert_config ZSH_CONFIG_PATH       "${ZSH_CONFIG_PATH:-}"       "$HOST_CONFIG"
  _upsert_config TMUX_CONFIG_PATH      "${TMUX_CONFIG_PATH:-}"      "$HOST_CONFIG"
  _upsert_config ZSH_HISTORY_PATH      "${ZSH_HISTORY_PATH:-}"      "$HOST_CONFIG"
  _upsert_config CODING_STANDARDS_PATH "${CODING_STANDARDS_PATH:-}" "$HOST_CONFIG"
  _upsert_config GITHUB_MCP_TOKEN      "${GITHUB_MCP_TOKEN:-}"      "$HOST_CONFIG"
  _upsert_config TRELLO_API_KEY        "${TRELLO_API_KEY:-}"        "$HOST_CONFIG"
  _upsert_config TRELLO_TOKEN          "${TRELLO_TOKEN:-}"          "$HOST_CONFIG"
  ok "Saved to $HOST_CONFIG"
}

_write_host_config

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
ok "Project '$PROJECT_NAME' is ready!"
echo ""
info "Next steps:"
echo "  1. git remote add origin git@github.com:${GITHUB_USERNAME}/${PROJECT_NAME}.git"
echo "  2. pnpm install"
echo "  3. code . → 'Reopen in Container'"
echo "  4. git add -A && git commit -m 'chore: initial scaffold'"
