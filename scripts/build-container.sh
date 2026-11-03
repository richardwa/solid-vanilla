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

# one gate for all packages: tsup bundle + tsc typecheck and bun test (core).
# Built explicitly in dependency order — `bun run --filter '*'` runs the
# per-package builds concurrently, and ui's tsc would race core's dist/
# type output.
(cd solid-vanilla-core   && bun run build)
(cd solid-vanilla-ui     && bun run build)
(cd solid-vanilla-server && bun run build)
(cd solid-vanilla-starter && bun run build)
bun run test

# pack each package from its own dir so the tarball is the exact artifact
# `bun publish` would ship (bun pm pack also resolves workspace:* deps)
(cd solid-vanilla-core   && bun pm pack --destination "$OUTPUT")
(cd solid-vanilla-ui     && bun pm pack --destination "$OUTPUT")
(cd solid-vanilla-server && bun pm pack --destination "$OUTPUT")

# bun pm pack resolves the workspace devDependency and ships solid-vanilla
# as a REGULAR dependency of solid-vanilla-ui. Consumers install the
# framework from their own source (release tarball / git), so that pin
# would make every install look it up on the npm registry (404). Rewrite
# the packed manifest: the framework becomes an optional peerDependency,
# satisfied by the consumer's own copy.
fixui() {
  tar=$1
  tmp=$(mktemp -d)
  tar xzf "$tar" -C "$tmp" package/package.json
  # drop the baked-in regular dependency (from the resolved workspace
  # devDependency); idempotent in case the peer block is already there
  sed -i -e 's/"solid-vanilla": "0\.1\.0",\{0,1\}//' -e '/^[[:space:]]*$/d' "$tmp/package/package.json"
  sed -i 's/"@picocss\/pico": "\^2.1.1",/"@picocss\/pico": "^2.1.1"/' "$tmp/package/package.json"
  if ! grep -q '"peerDependencies"' "$tmp/package/package.json"; then
    sed -i 's/^  }$/  },\n  "peerDependencies": {\n    "solid-vanilla": "*"\n  },\n  "peerDependenciesMeta": {\n    "solid-vanilla": {\n      "optional": true\n    }\n  }/' "$tmp/package/package.json"
  fi
  tar czf "$tar" -C "$tmp" package
  rm -rf "$tmp"
}
fixui "$OUTPUT/solid-vanilla-ui-0.1.0.tgz"
