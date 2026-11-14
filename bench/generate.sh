#!/bin/sh
# Regenerates the code of the two libraries that need a schema compiler: bebopc comes with bebop-tools, flatc with
# flatc-wasm. Both are devDependencies.
set -e
cd "$(dirname "$0")"

node_modules/bebop-tools/tools/linux/x64/bebopc --config bebop/bebop.json build
bun build --no-bundle bebop/generated.ts --outfile bebop/generated.mjs
rm bebop/generated.ts

rm -rf flatbuffers/ts
node flatbuffers/generate.mjs flatbuffers/ts
bun build flatbuffers/ts/bench.ts --outfile flatbuffers/generated.mjs --format esm --external flatbuffers
rm -rf flatbuffers/ts
