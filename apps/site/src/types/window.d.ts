/**
 * TypeScript declarations for MetaMask window.ethereum object
 */

interface RequestArguments {
  method: string;
  params?: any;
}

interface MetaMaskEthereumProvider {
  request(args: RequestArguments): Promise<any>;
  isMetaMask?: boolean;
}

interface Window {
  ethereum?: MetaMaskEthereumProvider;
}
