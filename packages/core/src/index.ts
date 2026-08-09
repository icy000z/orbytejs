/**
 * Orbyte — The Web3 Framework for JavaScript
 *
 * @packageDocumentation
 *
 * @example
 * ```ts
 * import { Orbyte } from 'orbytejs';
 *
 * const app = new Orbyte({ chain: 'ethereum' });
 *
 * // Read any wallet's balance
 * const balance = await app.wallet.balanceOf('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
 * console.log(balance.formatted, balance.symbol);  // "1.5 ETH"
 *
 * // Interact with tokens using human-readable amounts
 * const usdc = app.tokens.erc20('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
 * const info = await usdc.info();
 * console.log(info.name, info.symbol);  // "USD Coin" "USDC"
 * ```
 */

// ── Main Class ──────────────────────────────────────────────────────
export { Orbyte } from './orbyte.js';

// ── Types ───────────────────────────────────────────────────────────
export type {
  ChainName,
  OrbyteConfig,
  OrbytePlugin,
  OrbyteApp,
  OrbyteContract,
  OrbyteTransaction,
  OrbyteERC20,
  OrbyteNFT,
  WalletBalance,
  WalletInfo,
  ContractOptions,
  SendTransactionOptions,
  GasEstimate,
  GasConfig,
  TokenInfo,
  NFTMetadata,
  ChainInfo,
} from './types.js';

// ── Errors ──────────────────────────────────────────────────────────
export {
  OrbyteError,
  WalletError,
  ContractError,
  TransactionError,
  ConfigError,
  PluginError,
} from './errors.js';

// ── Chain Utilities ─────────────────────────────────────────────────
export {
  chainRegistry,
  resolveChain,
  getChainName,
  getExplorerApi,
  supportedChains,
} from './chains.js';

// ── ABIs ────────────────────────────────────────────────────────────
export { ERC20_ABI, ERC721_ABI } from './contract.js';

// ── Utility Functions ───────────────────────────────────────────────
export {
  parseValue,
  formatValue,
  formatTokenAmount,
  parseTokenAmount,
  formatGasPrice,
  shortenAddress,
  retry,
} from './utils.js';
export * from './agent.js';
