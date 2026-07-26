/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IProvider } from "@web3auth/react-native-sdk";
import { type Address, createPublicClient, createWalletClient, custom, formatEther, type Hex, parseEther } from "viem";

const contractABI = [
  { inputs: [{ internalType: "string", name: "initMessage", type: "string" }], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "message", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ internalType: "string", name: "newMessage", type: "string" }],
    name: "update",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const contractAddress = "0x04cA407965D60C2B39d892a1DFB1d1d9C30d0334" as Address;

function createClients(provider: IProvider) {
  const transport = custom(provider);
  const publicClient = createPublicClient({ transport });
  const walletClient = createWalletClient({ transport });
  return { publicClient, walletClient };
}

export default class EthereumRpc {
  private provider: IProvider;

  constructor(provider: IProvider) {
    this.provider = provider;
  }

  async getChainId(): Promise<any> {
    try {
      const { publicClient } = createClients(this.provider);
      return (await publicClient.getChainId()).toString();
    } catch (error) {
      return error;
    }
  }

  async getAccounts(): Promise<any> {
    try {
      const { walletClient } = createClients(this.provider);
      const [address] = await walletClient.getAddresses();
      return address;
    } catch (error) {
      return error;
    }
  }

  async getBalance(): Promise<string> {
    try {
      const { publicClient, walletClient } = createClients(this.provider);
      const [address] = await walletClient.getAddresses();
      const balance = await publicClient.getBalance({ address });
      return formatEther(balance);
    } catch (error) {
      return error as string;
    }
  }

  async sendTransaction(): Promise<any> {
    try {
      const { publicClient, walletClient } = createClients(this.provider);
      const [account] = await walletClient.getAddresses();
      const hash = await walletClient.sendTransaction({
        account,
        to: "0x40e1c367Eca34250cAF1bc8330E9EddfD403fC56",
        value: parseEther("0.001"),
        maxPriorityFeePerGas: 5000000000n,
        maxFeePerGas: 6000000000000n,
        chain: null,
      });
      return await publicClient.waitForTransactionReceipt({ hash });
    } catch (error) {
      return error as string;
    }
  }

  async signMessage() {
    try {
      const { walletClient } = createClients(this.provider);
      const [account] = await walletClient.getAddresses();
      return await walletClient.signMessage({
        account,
        message: "YOUR_MESSAGE",
      });
    } catch (error) {
      return error as string;
    }
  }

  async readContract() {
    try {
      const { publicClient } = createClients(this.provider);
      return await publicClient.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: "message",
      });
    } catch (error) {
      return error as string;
    }
  }

  async writeContract() {
    try {
      const { publicClient, walletClient } = createClients(this.provider);
      const [account] = await walletClient.getAddresses();
      const number = Math.floor(Math.random() * 9000) + 1000;
      const hash = await walletClient.writeContract({
        account,
        address: contractAddress,
        abi: contractABI,
        functionName: "update",
        args: [`Web3Auth is awesome ${number} times!`],
        chain: null,
      });
      return await publicClient.waitForTransactionReceipt({ hash: hash as Hex });
    } catch (error) {
      return error as string;
    }
  }

  async getPrivateKey(): Promise<any> {
    try {
      return await this.provider.request({
        method: "eth_private_key",
      });
    } catch (error) {
      return error as string;
    }
  }
}
