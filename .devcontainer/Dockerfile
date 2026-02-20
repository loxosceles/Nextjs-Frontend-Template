ARG VARIANT=22-bookworm
FROM mcr.microsoft.com/devcontainers/typescript-node:${VARIANT}

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    neovim ranger tmux direnv zsh \
    && apt-get clean

RUN chsh -s /usr/bin/zsh vscode

USER vscode
WORKDIR /home/vscode

COPY --chown=vscode:vscode post_create.sh /usr/src/
RUN chmod +x /usr/src/post_create.sh
