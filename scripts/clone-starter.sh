#!/usr/bin/env bash
# clone-starter.sh — create a new standalone project from the
# solid-vanilla-starter template.
#
# Usage:
#   scripts/clone-starter.sh <project-name>
#
# Creates ./<project-name> containing ONLY the starter app (no monorepo).
# The framework packages (solid-vanilla, solid-vanilla-ui, solid-vanilla-server)
# are pulled in as a git submodule of the solid-vanilla repo, pinned to the
# current main; the app's package.json references them via file: paths.
# "can point to latest": cd into the submodule and run
#   git submodule update --remote
# to move it to the newest main, then bun install.
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
remote="$(git -C "$repo" config --get remote.origin.url 2>/dev/null || true)"

mkdir -p "$target"

# --- app files: the starter package only -------------------------------
src="$repo/solid-vanilla-starter"
for f in src vite.config.ts tsconfig.json package.json AGENTS.md readme.md; do
  [ -e "$src/$f" ] && cp -r "$src/$f" "$target/"
done
rm -rf "$target/dist" "$target/node_modules"

# Rename the app package and its self-references.
sed -i "s/solid-vanilla-starter/$name/g" \
  "$target/package.json" "$target/AGENTS.md"

# --- framework packages as a submodule ---------------------------------
sub="solid-vanilla"
if [ -n "$remote" ]; then
  echo "adding submodule $remote (branch main) ..."
  git -C "$target" init -q
  git -C "$target" submodule add -q -b main "$remote" "$sub"
  git -C "$target" -c protocol.file.allow=always submodule update --init --recursive -q 2>/dev/null || true
  # The submodule is a bun workspace; replace its workspace root manifest
  # with a minimal one so bun treats the inner packages as plain file:
  # deps, and rewrite the framework's own workspace:* cross-deps to file:
  # refs. The template's starter copy is redundant in a clone and its
  # workspace:* deps would break the standalone install.
  rm -rf "$target/$sub/solid-vanilla-starter"
  echo '{"name":"solid-vanilla-framework","private":true,"version":"0.0.0","type":"module"}' \
    > "$target/$sub/package.json"
  sed -i 's|"solid-vanilla": "workspace:\*"|"solid-vanilla": "file:../solid-vanilla-core"|g' \
    "$target/$sub/solid-vanilla-ui/package.json" \
    "$target/$sub/solid-vanilla-server/package.json"
  # Build the framework packages so their dist/ outputs (types + bundles)
  # exist; dist/ is gitignored, so a fresh submodule checkout lacks them.
  (cd "$target/$sub/solid-vanilla-core" && bun install >/dev/null 2>&1 && bun run build >/dev/null)
  (cd "$target/$sub/solid-vanilla-ui" && bun install >/dev/null 2>&1 && bun run build >/dev/null)
  (cd "$target/$sub/solid-vanilla-server" && bun install >/dev/null 2>&1 && bun run build >/dev/null)
else
  # No remote configured: copy the framework packages locally instead.
  echo "no git remote; copying framework packages locally ..."
  for p in solid-vanilla solid-vanilla-ui solid-vanilla-server; do
    cp -r "$repo/$p" "$target/$p"
    rm -rf "$target/$p/node_modules" "$target/$p/dist"
  done
  rm -f "$target/bun.lock"
fi

# --- dependencies: file: paths into the submodule -----------------------
python3 - "$target/package.json" <<'EOF'
import json, sys
path = sys.argv[1]
pkg = json.load(open(path))
deps = pkg["dependencies"]
for name in ("solid-vanilla", "solid-vanilla-ui", "solid-vanilla-server"):
    deps[name] = f"file:./solid-vanilla/{name if name != "solid-vanilla" else "solid-vanilla-core"}"
json.dump(pkg, open(path, "w"), indent=2)
open(path, "a").write("\n")
EOF

# --- install + first build ----------------------------------------------
cd "$target"
bun install
bun run build

# --- git snapshot ---------------------------------------------------------
git add -A
git commit -q -m "new project $name from solid-vanilla-starter" 2>/dev/null || true

echo
echo "done: $target"
echo "next: cd $target && bun run dev      # http://localhost:5177"
echo "latest framework: git submodule update --remote && bun install"
