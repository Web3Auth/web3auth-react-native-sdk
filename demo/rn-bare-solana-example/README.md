# Web3Auth React Native — Bare Solana Example

Shows how to use Web3Auth with **Solana**. The SDK derives an ed25519 keypair from the user's key shares and exposes it as a wallet-standard `Wallet` via `connection.solanaWallet`. Wrap the app in `SolanaProvider` from `@web3auth/react-native-sdk/solana` to use the signing hooks.

## What this example demonstrates

- Solana chain configuration from the Web3Auth Dashboard (fetched at SDK init)
- `@web3auth/react-native-sdk/setup-solana` as the single entry setup import (core + Solana runtime polyfills)
- Plain `withWeb3Auth(getDefaultConfig(...))` Metro config — no custom resolver aliases
- Nesting `SolanaProvider` inside `Web3AuthProvider`
- Accessing accounts and RPC via `useSolanaWallet()`
- Signing messages via `useSignMessage()` from `@web3auth/react-native-sdk/solana`

## File tour

| File | What it does |
|---|---|
| `web3authConfig.ts` | Client ID, redirect URL, network, and optional `defaultChainId` |
| `lib/solana.ts` | `getSolanaBalance` using the RPC client from `useSolanaWallet()` |
| `components/LoginView.tsx` | Email OTP login |
| `components/HomeView.tsx` | Solana hooks, Wallet Services, and balance helper |
| `components/Console.tsx` | Scrollable output box |
| `App.tsx` | `<Web3AuthProvider>` + `<SolanaProvider>` + login/home screen |
| `index.js` | Entry point — `@web3auth/react-native-sdk/setup-solana` must load before other imports |
| `metro.config.js` | `withWeb3Auth(getDefaultConfig(__dirname))` |

## Tech stack

- React Native `0.74.x` (bare workflow)
- `@web3auth/react-native-sdk` (local tarball from the SDK repo root)
- `@solana/react-hooks` `^1.4.x` (peer for `/solana` subpath)
- `@solana/kit` `^6.x`

## Prerequisites

- Node.js `>=18`, React Native CLI environment, Xcode / Android Studio
- A [Web3Auth Dashboard](https://dashboard.web3auth.io) project

## Dashboard setup

1. Create a project at [dashboard.web3auth.io](https://dashboard.web3auth.io).
2. Under **Allowed Origins**, add `solanarnexample://auth`.
3. Copy the **Client ID** into `web3authConfig.ts`.
4. Under **Chains**, add a Solana chain (e.g. Solana Devnet). The SDK fetches chain config from the dashboard at init.
5. If you set `defaultChainId` in `web3authConfig.ts`, it must match a dashboard Solana `chainId` (e.g. `0x66` for Devnet).

## Installation

```bash
cd demo/rn-bare-solana-example
npm install
cd ios && pod install && cd ..
```

The demo depends on `file:../../web3auth-react-native-sdk-10.0.0.tgz`. Re-run `npm pack` at the SDK repo root after SDK changes, then `npm install` here.

## Running the app

```bash
npm start
npm run ios      # or npm run android
```

## Troubleshooting

**`@solana/react-hooks` not found** — Install it explicitly: `npm install @solana/react-hooks@^1.4.1`.

**`AbortSignal.timeout` / `window.addEventListener` errors** — Import `@web3auth/react-native-sdk/setup-solana` first in `index.js`. Do not add a separate `polyfills.js` — the SDK owns those runtime gaps.

**Metro errors** — This demo uses plain `withWeb3Auth`. See [Metro Polyfill Troubleshooting](https://docs.metamask.io/embedded-wallets/troubleshooting/metro-issues/).

## Resources

- [Web3Auth React Native SDK](https://web3auth.io/docs/sdk/pnp/react-native)
- [Dashboard](https://dashboard.web3auth.io)
