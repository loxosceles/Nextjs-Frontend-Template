#!/bin/sh
# Project-specific post-create hook — runs after common post_create.sh

TMUX_SESSION="vsc-$(basename "$PWD")"
export TMUX_SESSION
echo "export TMUX_SESSION=\"$TMUX_SESSION\"" >>"$HOME/.zshrc.local"

echo "✓ Project-specific setup complete"
