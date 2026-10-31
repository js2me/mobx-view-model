#!/usr/bin/env bash
set -euo pipefail

project_root="$(git rev-parse --show-toplevel)"
# Match both the CI image and the exact @playwright/test version.
docker run --rm --init --ipc=host --platform linux/amd64 \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp --env CI=true \
  --volume "$project_root:/work" \
  --workdir /work/packages/devtools \
  mcr.microsoft.com/playwright:v1.63.0-noble@sha256:bc6ab0d6d44ff4826e4cb8c1e6d801e185bfc42bb0753f8e2a30efc70db054c7 \
  bash -lc 'node node_modules/@playwright/test/cli.js test "$@"' -- "$@"
