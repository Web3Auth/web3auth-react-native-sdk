/**
 * Ambient module declarations for @web3auth/no-modal deep subpath imports.
 *
 * The no-modal barrel (index.js) eagerly requires @metamask/sdk which has multiple
 * incompatibilities in React Native. We import directly from internal dist paths to
 * skip the barrel. These declarations satisfy TypeScript's Node16 module resolver
 * while the runtime (Rollup / Metro) resolves the paths directly.
 */

declare module "@web3auth/no-modal/dist/lib.esm/providers/account-abstraction-provider/index.js" {
  export { accountAbstractionProvider, toEoaProvider } from "@web3auth/no-modal";
}

declare module "@web3auth/no-modal/dist/lib.esm/providers/base-provider/CommonJRPCProvider.js" {
  export { CommonJRPCProvider } from "@web3auth/no-modal";
}
