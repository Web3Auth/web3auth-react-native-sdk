import {
  AccountAbstractionProvider,
  SafeSmartAccount,
} from '@web3auth/account-abstraction-provider';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from '@web3auth/react-native-sdk';
import { type Web3AuthContextConfig } from '@web3auth/react-native-sdk';

// IMP START - Dashboard Registration
const clientId =
  'BMAtt15LpfxIshlsX0fumPV99TNfJAEPkSTEbZR2KHyr2S8P-XKodZlcJaNUTbg0gYEbyJeqi-R6ssvG0yU5X1g';
// IMP END - Dashboard Registration

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: '0xaa36a7',
  rpcTarget: `https://api.web3auth.io/infura-service/v1/0xaa36a7/${clientId}`,
  displayName: 'Ethereum Sepolia Testnet',
  blockExplorerUrl: 'https://sepolia.etherscan.io',
  ticker: 'ETH',
  tickerName: 'Ethereum',
  decimals: 18,
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

// IMP START - Account Abstraction
// Remove accountAbstractionProvider from web3AuthOptions below to disable AA.
const accountAbstractionProvider = new AccountAbstractionProvider({
  config: {
    chainConfig,
    bundlerConfig: {
      url: 'https://api.pimlico.io/v2/11155111/rpc?apikey=pim_WDBELWbZeo9guUAr7HNFaF',
    },
    smartAccountInit: new SafeSmartAccount(),
  },
});
// IMP END - Account Abstraction

// IMP START - SDK Initialization
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    redirectUrl: 'rnbarehooksexample://auth',
    network: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    privateKeyProvider,
    accountAbstractionProvider, // remove this line to disable AA
  },
};
// IMP END - SDK Initialization

export default web3AuthContextConfig;
