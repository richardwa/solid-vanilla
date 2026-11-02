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

# Package version carried in the release asset names (single source: the
# packages' package.json version).
version="$(python3 -c "import json;print(json.load(open('$repo/solid-vanilla-core/package.json'))['version'])")"
base="https://github.com/$REPO_OWNER/$REPO_NAME/releases/download/$tag"

# --- app files: the starter package only -------------------------------
src="$repo/solid-vanilla-starter"
mkdir -p "$target"
for f in src vite.config.ts tsconfig.json package.json AGENTS.md readme.md; do
  [ -e "$src/$f" ] && cp -r "$src/$f" "$target/"
done
rm -rf "$target/dist" "$target/node_modules"
sed -i "s/solid-vanilla-starter/$name/g" "$target/package.json" "$target/AGENTS.md"

# --- dependencies: GitHub release tarballs (git-viewer style) -----------
python3 - "$target/package.json" "$version" "$base" <<'EOF'
import json, sys
path, version, base = sys.argv[1], sys.argv[2], sys.argv[3]
urls = {name: f"{base}/{name}-{version}.tgz" for name in
        ("solid-vanilla", "solid-vanilla-ui", "solid-vanilla-server")}
pkg = json.load(open(path))
pkg["dependencies"].update(urls)
# overrides keep transitive resolution (ui/server's pinned
# "solid-vanilla": "0.1.0") on the release tarball instead of the npm
# registry, mirroring git-viewer's package.json.
pkg["overrides"] = urls
with open(path, "w") as f:
    json.dump(pkg, f, indent=2)
    f.write("\n")
EOF

# --- install + first build ----------------------------------------------
cd "$target"
bun install
bun run build

# --- git snapshot ---------------------------------------------------------
git init -q
git add -A
git commit -q -m "new project $name from solid-vanilla-starter (framework $tag)" 2>/dev/null || true

echo
echo "done: $target"
echo "next: cd $target && bun run dev      # http://localhost:5177"
echo "framework release: $tag   (pin exact: $0 $name build-<sha>)"
