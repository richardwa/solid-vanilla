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

REPO_OWNER=richardwa
REPO_NAME=solid-vanilla

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

# --- rename the app + point the framework deps at the release tarballs ---
# Replace every solid-vanilla-starter self-reference with the project name,
# and swap the workspace:* deps for GitHub release tarballs (overrides keep
# the ui/server tarballs' own "solid-vanilla": "0.1.0" on the same release,
# like git-viewer's package.json).
version="$(awk -F'"' '/"version"/{print $4; exit}' "$repo/solid-vanilla-core/package.json")"
base="https://github.com/$REPO_OWNER/$REPO_NAME/releases/download/$tag"

grep -rl "solid-vanilla-starter" "$target" --include='*.md' --include='*.json' \
  | xargs -r sed -i "s/solid-vanilla-starter/$name/g"

# Swap the workspace:* deps for release tarballs and append an overrides
# block (keeps the ui/server tarballs' own "solid-vanilla": "0.1.0" on the
# same release, like git-viewer's package.json).
core="$base/solid-vanilla-$version.tgz"
ui="$base/solid-vanilla-ui-$version.tgz"
server="$base/solid-vanilla-server-$version.tgz"
awk -v core="$core" -v ui="$ui" -v server="$server" '
  {
    gsub(/"solid-vanilla": "workspace:\*"/, "\"solid-vanilla\": \"" core "\"")
    gsub(/"solid-vanilla-ui": "workspace:\*"/, "\"solid-vanilla-ui\": \"" ui "\"")
    gsub(/"solid-vanilla-server": "workspace:\*"/, "\"solid-vanilla-server\": \"" server "\"")
  }
  /"dependencies"/ { ind = 1 }
  ind && /^  \}$/ && !done {
    sub(/^  \}$/, "  },")
    print
    print "  \"overrides\": {"
    print "    \"solid-vanilla\": \"" core "\","
    print "    \"solid-vanilla-ui\": \"" ui "\","
    print "    \"solid-vanilla-server\": \"" server "\""
    print "  }"
    done = 1
    next
  }
  { print }
' "$target/package.json" > "$target/package.json.tmp" && mv "$target/package.json.tmp" "$target/package.json"

# --- ignore build output and installed packages -------------------------
cat > "$target/.gitignore" <<'EOF'
node_modules
dist
EOF

echo
echo "done: $target"
