#!/usr/bin/env bash
# clone-starter.sh — create a new project from the solid-vanilla-starter
# template.
#
# Usage:
#   scripts/clone-starter.sh <project-name>
#
# Creates a folder ./<project-name> containing a fresh copy of this
# repository. The starter package (solid-vanilla-starter/) is renamed to
# <project-name>/ and every reference to "solid-vanilla-starter" (package
# name, workspace list, Containerfile, AGENTS.md) is replaced with the
# project name. The framework packages keep their solid-vanilla* names —
# they are the libraries the app imports.
#
# The copy gets its own git history (cloned from the remote when configured,
# otherwise a snapshot of the working tree), a fresh bun.lock, and a first
# root-level build so the library dist/ outputs exist.
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <project-name>" >&2
  exit 1
fi

name="$1"
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

# Source: prefer the git remote (fresh checkout with history); fall back to
# copying the local working tree and initializing a new repo.
if remote="$(git -C "$repo" config --get remote.origin.url 2>/dev/null)"; then
  echo "cloning from $remote ..."
  git clone -q "$remote" "$target"
else
  echo "no git remote; copying working tree ..."
  mkdir "$target"
  (cd "$repo" && tar --exclude=node_modules --exclude=dist -cf - .) | tar -xf - -C "$target"
  git -C "$target" init -q
fi

cd "$target"

# Rename the starter package folder and rewrite all references to it.
mv solid-vanilla-starter "$name"
sed -i "s/solid-vanilla-starter/$name/g" \
  package.json \
  Containerfile.build \
  AGENTS.md \
  "$name/package.json" \
  "$name/AGENTS.md"

# Fresh workspace install (single root bun.lock) + first build so the
# library dist/ outputs exist for typechecking.
rm -f bun.lock
rm -rf node_modules "$name/node_modules" "$name/dist"
bun install
bun run build

git add -A
git commit -q -m "clone starter as $name" 2>/dev/null || true

echo
echo "done: $target"
echo "next: cd $target/$name && bun run dev   # http://localhost:5177"
