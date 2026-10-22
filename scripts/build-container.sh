#!/bin/sh
# Build steps run inside the build container (see Containerfile.build).
# Emits the three outputs to $OUTPUT:
#   core/     solid-vanilla-core   — the reactive framework
#   ui/       solid-vanilla-ui     — reusable components
#   server/   solid-vanilla-server — Express-based API helper
#   core.zip / ui.zip / server.zip — each folder as one downloadable file
set -e
: "${OUTPUT:?OUTPUT must be set to the artifact output dir}"

# one gate for all packages: prettier + tsc typecheck (bun run build) and
# bun test (core). Packages compile noEmit — sources are the artifacts.
bun run build
bun run test

copy_pkg() {
  pkg=$1
  dest=$2
  mkdir -p "$OUTPUT/$dest"
  cp -r "$pkg/src" "$OUTPUT/$dest/src"
  cp "$pkg/package.json" "$pkg/tsconfig.json" "$OUTPUT/$dest/"
  [ -f "$pkg/readme.md" ] && cp "$pkg/readme.md" "$OUTPUT/$dest/"
  (cd "$OUTPUT" && zip -qr "$dest.zip" "$dest")
}

copy_pkg solid-vanilla-core core
copy_pkg solid-vanilla-ui ui
copy_pkg solid-vanilla-server server
