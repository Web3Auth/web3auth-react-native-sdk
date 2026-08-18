/**
 * Web3Auth React Native SDK - Solana setup
 *
 * Import this instead of `@web3auth/react-native-sdk/setup` when using
 * `@web3auth/react-native-sdk/solana`. Loads core setup first, then runtime
 * polyfills required by @solana/react-hooks and @wallet-standard/app on Hermes.
 *
 * Usage in index.js:
 *   import "@web3auth/react-native-sdk/setup-solana";
 */

require("./setup");
require("./solana-runtime-polyfills");
