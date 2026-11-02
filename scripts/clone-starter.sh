#!/usr/bin/env bash
# clone-starter.sh — create a new standalone project from the
# solid-vanilla-starter template.
#
# Usage:
#   scripts/clone-starter.sh <project-name> [release-tag]
#
# Creates ./<project-name> containing ONLY the starter app (no monorepo).
# The framework packages (solid-vanilla, solid-vanilla-ui, solid-vanilla-server)
# are referenced as GitHub release tarballs, like git-viewer's package.json.
#
# [release-tag] selects which GitHub release to pin (default: "latest", the
# moving release that always points at the newest build). Use a per-commit
# tag (build-<sha>) to pin an exact version.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <project-name> [release-tag]" >&2
  exit 1
fi

name="$1"
tag="${2:-latest}"
if ! [[ "$name" =~ ^[a-z0-9][a-z0-9_-]*$ ]]; then
  echo "error: project name must be lowercase letters/digits/-/_ (got '$name')" >&2
  exit 1
fi

target="$name"
if [ -e "$target" ]; then
  echo "error: '$target' already exists" >&2
  exit 1
fi

repo="$(cd "$(dirname "$0")/.." && pwd)"

# --- app files: the starter package only -------------------------------
src="$repo/solid-vanilla-starter"
mkdir -p "$target"
rsync -av \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='dist' \
  "$repo/solid-vanilla-starter/" "$target"

grep -rl "solid-vanilla-starter" "$target" --include='*.md' --include='*.json' |
  xargs -r sed -i "s/solid-vanilla-starter/$name/g"

# Remove the workspace:* dependency lines, then re-add the framework
# packages from the GitHub release tarballs (bun add saves them).
sed -i '/"solid-vanilla\(-ui\|-server\)\?": "workspace:\*"/d' "$target/package.json"

# The ui/server tarballs pin "solid-vanilla": "0.1.0", which bun would
# look up on the npm registry (404); overrides point it at the same
# release tarball instead (git-viewer's package.json does the same).
base="https://github.com/richardwa/solid-vanilla/releases/download/latest"
sed -i -e 's/^  }$/  },/' -e '$i\
  "overrides": {\
    "solid-vanilla": "'"$base"'/solid-vanilla-0.1.0.tgz",\
    "solid-vanilla-ui": "'"$base"'/solid-vanilla-ui-0.1.0.tgz",\
    "solid-vanilla-server": "'"$base"'/solid-vanilla-server-0.1.0.tgz"\
  }' "$target/package.json"

# --- install -------------------------------------------------------------
cd "$target"
bun install
bun add \
  "https://github.com/richardwa/solid-vanilla/releases/download/latest/solid-vanilla-0.1.0.tgz" \
  "https://github.com/richardwa/solid-vanilla/releases/download/latest/solid-vanilla-ui-0.1.0.tgz" \
  "https://github.com/richardwa/solid-vanilla/releases/download/latest/solid-vanilla-server-0.1.0.tgz"

# --- ignore build output and installed packages -------------------------
cat >.gitignore <<'EOF'
node_modules
dist
EOF

echo
echo "done: $target"
