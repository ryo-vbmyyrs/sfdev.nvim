#!/usr/bin/env bash
# Local development helper script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Starting sfdev.nvim in development mode..."
echo "📁 Project directory: $PROJECT_DIR"

# Check dependencies
if ! command -v deno &> /dev/null; then
    echo "❌ Error: deno is not installed"
    exit 1
fi

if ! command -v nvim &> /dev/null; then
    echo "❌ Error: nvim is not installed"
    exit 1
fi

# Check if denops.vim exists (check multiple common paths)
DENOPS_PATH=""
POSSIBLE_PATHS=(
    "$HOME/.local/share/nvim/lazy/denops.vim"
    "$HOME/.local/share/nvim/site/pack/packer/start/denops.vim"
    "$HOME/.local/share/nvim/site/pack/packer/opt/denops.vim"
    "$HOME/.vim/plugged/denops.vim"
    "$HOME/.config/nvim/pack/*/start/denops.vim"
)

for path in "${POSSIBLE_PATHS[@]}"; do
    # Handle glob patterns
    for expanded_path in $path; do
        if [ -d "$expanded_path" ]; then
            DENOPS_PATH="$expanded_path"
            break 2
        fi
    done
done

if [ -z "$DENOPS_PATH" ]; then
    echo "❌ Error: denops.vim not found in any common location"
    echo "Please install denops.vim first or update the runtimepath in minimal_init files"
    exit 1
fi

echo "✅ All dependencies found"
echo ""

# Choose init file
if [ -f "$SCRIPT_DIR/minimal_init.lua" ]; then
    INIT_FILE="$SCRIPT_DIR/minimal_init.lua"
    echo "Using Lua config: $INIT_FILE"
else
    INIT_FILE="$SCRIPT_DIR/minimal_init.vim"
    echo "Using Vim config: $INIT_FILE"
fi

# Launch Neovim
cd "$PROJECT_DIR"
nvim -u "$INIT_FILE" "$@"
