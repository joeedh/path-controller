#!/bin/bash
esbuild genVectormath.ts --bundle=true --outdir=build --external:fs --target=node22 --format=esm --sourcemap=inline
node build/genVectormath.js

#swc genVectormath.ts -o genVectormath.js && node genVectormath.js && node genVectormath.js
#npx prettier vectormathNew.ts -w
