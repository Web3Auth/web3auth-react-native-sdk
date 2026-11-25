---
"@web3auth/react-native-sdk": major
---

Require Node `>=24.22.0` and npm `>=12`. Publish TypeScript declarations from `dist/lib.cjs/index.d.ts` instead of `dist/lib.cjs/types/index.d.ts`. The library build is Vite+ and still emits both `dist/lib.esm` and `dist/lib.cjs`. The `@babel/runtime` peer is removed because the Vite+ build does not emit `@babel/runtime` helpers.
