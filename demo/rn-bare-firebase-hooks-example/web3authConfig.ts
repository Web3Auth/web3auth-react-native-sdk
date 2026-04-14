import {
  AccountAbstractionProvider,
  SafeSmartAccount,
} from '@web3auth/account-abstraction-provider';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from '@web3auth/react-native-sdk';
import { type Web3AuthContextConfig } from '@web3auth/react-native-sdk';

// IMP START - Dashboard Registration
const clientId =
  'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ';
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
    redirectUrl: 'web3authrnbarefirebase://auth',
    network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    privateKeyProvider,
    accountAbstractionProvider,
  },
};
// IMP END - SDK Initialization

export default web3AuthContextConfig;
