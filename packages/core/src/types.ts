/**
 * Orbyte — The Web3 Framework for JavaScript
 *
 * Core type definitions used across all modules.
 */

import type {
  Abi,
  Account,
  Address,
  Chain,
  Hash,
  Hex,
  PublicClient,
  TransactionReceipt,
  Transport,
  WalletClient,
} from 'viem';

// ─── Chain Configuration ─────────────────────────────────────────────

/** Shorthand chain names supported by Orbyte */
export type ChainName =
  | 'ethereum'
  | 'goerli'
  | 'sepolia'
  | 'polygon'
  | 'polygon-amoy'
  | 'arbitrum'
  | 'arbitrum-sepolia'
  | 'optimism'
  | 'optimism-sepolia'
  | 'base'
  | 'base-sepolia'
  | 'bsc'
  | 'bsc-testnet'
  | 'avalanche'
  | 'avalanche-fuji'
  | 'linea'
  | 'zksync'
  | 'fantom'
  | 'celo'
  | 'gnosis';

/** Configuration for the Orbyte app instance */
export interface OrbyteConfig {
  /** Chain name or viem Chain object */
  chain: ChainName | Chain;
  /** Custom RPC URL (optional — public RPCs used by default) */
  rpc?: string;
  /** Private key for server-side / scripting use */
  privateKey?: Hex;
  /** Plugins to install */
  plugins?: OrbytePlugin[];
  /**
   * Etherscan or Block explorer API key for auto ABI fetching.
   */
  etherscanApiKey?: string;

  /**
   * Enable verbose RPC and debugging logs
   */
  debug?: boolean;

  /**
   * Optional plugins to extend Orbyte.
   */
  gas?: GasConfig;
}

/** Gas estimation configuration */
export interface GasConfig {
  /** Gas price multiplier for safety margin (default: 1.2 = 20% buffer) */
  multiplier?: number;
  /** Maximum gas price in gwei — transactions above this will error */
  maxGwei?: number;
}

// ─── Plugin System ───────────────────────────────────────────────────

/** Plugin interface for extending Orbyte */
export interface OrbytePlugin {
  /** Unique plugin name */
  name: string;
  /** Called when the plugin is installed */
  install(app: OrbyteApp): void | Promise<void>;
}

/** The public interface of a Orbyte app (used by plugins) */
export interface OrbyteApp {
  readonly config: OrbyteConfig;
  readonly publicClient: PublicClient<Transport, Chain>;
  readonly walletClient: WalletClient<Transport, Chain, Account> | null;
  extend<T>(namespace: string, methods: T): void;
}

// ─── Wallet Types ────────────────────────────────────────────────────

/** Wallet balance result */
export interface WalletBalance {
  /** Human-readable balance (e.g., "1.5") */
  formatted: string;
  /** Balance in wei as bigint */
  wei: bigint;
  /** Native currency symbol (e.g., "ETH") */
  symbol: string;
}

/** Wallet info */
export interface WalletInfo {
  address: Address;
  balance: () => Promise<WalletBalance>;
  nonce: () => Promise<number>;
  chainId: () => Promise<number>;
}

// ─── Contract Types ──────────────────────────────────────────────────

/** Options for loading a contract */
export interface ContractOptions {
  /** Contract ABI — optional if the contract is verified on-chain */
  abi?: Abi;
  /** Override the chain for this contract */
  chain?: ChainName;
}

/** A Orbyte contract wrapper */
export interface OrbyteContract<TAbi extends Abi = Abi> {
  /** Contract address */
  address: Address;
  /** Contract ABI */
  abi: TAbi;
  /** Read-only contract calls (no gas, no signing) */
  read: ContractReader<TAbi>;
  /** Write contract calls (auto gas, auto signing) */
  write: ContractWriter<TAbi>;
  /** Listen for contract events */
  on: EventSubscriber<TAbi>;
  /** One-shot event listener */
  once: EventSubscriber<TAbi>;
}

/** Dynamic contract reader — maps ABI function names to callable methods */
export type ContractReader<TAbi extends Abi = Abi> = {
  [K in ExtractFunctionNames<TAbi, 'view' | 'pure'>]: (...args: unknown[]) => Promise<unknown>;
};

/** Dynamic contract writer — maps ABI function names to callable methods */
export type ContractWriter<TAbi extends Abi = Abi> = {
  [K in ExtractFunctionNames<TAbi, 'nonpayable' | 'payable'>]: (
    ...args: unknown[]
  ) => Promise<OrbyteTransaction>;
};

/** Dynamic event subscriber */
export type EventSubscriber<TAbi extends Abi = Abi> = {
  (eventName: string, callback: (...args: unknown[]) => void): () => void;
  (eventName: string, filter: Record<string, unknown>, callback: (...args: unknown[]) => void): () => void;
};

/** Extract function names from ABI by state mutability */
type ExtractFunctionNames<
  TAbi extends Abi,
  TStateMutability extends string,
> = Extract<
  TAbi[number],
  { type: 'function'; stateMutability: TStateMutability }
> extends { name: infer TName extends string }
  ? TName
  : string;

// ─── Transaction Types ───────────────────────────────────────────────

/** A pending Orbyte transaction */
export interface OrbyteTransaction {
  /** Transaction hash */
  hash: Hash;
  /** Wait for confirmations */
  wait(options?: { confirmations?: number }): Promise<TransactionReceipt>;
}

/** Options for sending a transaction */
export interface SendTransactionOptions {
  /** Recipient address */
  to: Address;
  /** Value to send (supports human-readable: "0.5 eth", "100 gwei") */
  value?: string | bigint;
  /** Calldata */
  data?: Hex;
  /** Gas limit override */
  gasLimit?: bigint;
  /** Nonce override */
  nonce?: number;
}

/** Gas estimate result */
export interface GasEstimate {
  /** Gas limit */
  gasLimit: bigint;
  /** Gas price in gwei */
  gasPriceGwei: string;
  /** Total cost in native currency */
  formatted: string;
  /** Total cost in wei */
  wei: bigint;
}

// ─── Token Types ─────────────────────────────────────────────────────

/** ERC20 token info */
export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

/** ERC20 token interface */
export interface OrbyteERC20 {
  address: Address;
  info(): Promise<TokenInfo>;
  balanceOf(address: Address): Promise<string>;
  transfer(to: Address, amount: string): Promise<OrbyteTransaction>;
  approve(spender: Address, amount: string): Promise<OrbyteTransaction>;
  allowance(owner: Address, spender: Address): Promise<string>;
  totalSupply(): Promise<string>;
}

// ─── NFT Types ───────────────────────────────────────────────────────

/** NFT metadata */
export interface NFTMetadata {
  tokenId: bigint;
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  raw: Record<string, unknown>;
}

/** ERC721 NFT interface */
export interface OrbyteNFT {
  address: Address;
  ownerOf(tokenId: bigint | number): Promise<Address>;
  balanceOf(address: Address): Promise<bigint>;
  metadata(tokenId: bigint | number): Promise<NFTMetadata>;
  transfer(from: Address, to: Address, tokenId: bigint | number): Promise<OrbyteTransaction>;
  approve(to: Address, tokenId: bigint | number): Promise<OrbyteTransaction>;
  tokenURI(tokenId: bigint | number): Promise<string>;
}

// ─── Chain Info Types ────────────────────────────────────────────────

/** Chain information */
export interface ChainInfo {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockNumber: () => Promise<bigint>;
  gasPrice: () => Promise<{ gwei: string; wei: bigint }>;
}
