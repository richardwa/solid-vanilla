#!/bin/sh
# Build steps run inside the build container (see Containerfile.build).
# Emits the three outputs to $OUTPUT:
#   solid-vanilla-0.1.0.tgz       — solid-vanilla-core (the reactive framework)
#   solid-vanilla-ui-0.1.0.tgz    — reusable components
#   solid-vanilla-server-0.1.0.tgz — Express-based API helper
#
# Tarballs are produced by `bun pm pack`, so each is a publish-ready npm
# package (package.json at the base, dist/ contents per the files field).
set -e
: "${OUTPUT:?OUTPUT must be set to the artifact output dir}"

# real install, run with the full tree present: bun creates per-package
# node_modules (with the .bin links tsc/prettier need) only now. The deps
# layer's premature install left empty node_modules dirs that make bun skip
# linking, so remove them first (the cache stays warm, so this is fast)
rm -rf node_modules solid-vanilla-*/node_modules
bun install --frozen-lockfile

# one gate for all packages: tsup bundle + tsc typecheck (bun run build) and
# bun test (core). The dist/ output is what bun pm pack ships below.
bun run build
bun run test

# pack each package from its own dir so the tarball is the exact artifact
# `bun publish` would ship (bun pm pack also resolves workspace:* deps)
(cd solid-vanilla-core   && bun pm pack --destination "$OUTPUT")
(cd solid-vanilla-ui     && bun pm pack --destination "$OUTPUT")
(cd solid-vanilla-server && bun pm pack --destination "$OUTPUT")
