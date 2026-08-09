/**
 * Orbyte — Main Application Class
 *
 * The central entry point for all Web3 operations.
 * Instantiate with a chain config and you're ready to go.
 */

import { createPublicClient, http, type Chain, type PublicClient, type Transport } from 'viem';
import { resolveChain, getChainName } from './chains.js';
import { createWalletModule, type WalletModule } from './wallet.js';
import { createContractModule, type ContractModule } from './contract.js';
import { createTokenModule, type TokenModule } from './tokens.js';
import { createNFTModule, type NFTModule } from './nft.js';
import { createTxModule, type TxModule } from './tx.js';
import { OrbyteAgent } from './agent.js';
import { formatGasPrice } from './utils.js';
import { ConfigError, PluginError } from './errors.js';
import type { ChainInfo, OrbyteConfig, OrbytePlugin } from './types.js';

export class Orbyte {
  /** The resolved viem Chain object */
  private _chain: Chain;
  /** The public client for read operations */
  private _publicClient: PublicClient<Transport, Chain>;
  /** User-provided config */
  private _config: OrbyteConfig;
  /** Installed plugin names (for deduplication) */
  private _plugins: Set<string> = new Set();
  /** Dynamic extensions added by plugins */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _extensions: Map<string, any> = new Map();

  /** Wallet management */
  public readonly wallet: WalletModule;
  /** Smart contract interactions */
  public readonly contract: ContractModule;
  /** ERC20 token operations */
  public readonly tokens: TokenModule;
  /** NFT (ERC721) operations */
  public readonly nft: NFTModule;
  /** Transaction utilities */
  public readonly tx: TxModule;
  /** AI Agent utilities */
  public readonly agent: OrbyteAgent;

  /**
   * Create a new Orbyte application instance.
   *
   * @example
   * ```ts
   * import { Orbyte } from 'orbytejs';
   *
   * const app = new Orbyte({ chain: 'ethereum', debug: true });
   * const balance = await app.wallet.balanceOf('0x...');
   * ```
   */
  constructor(config: OrbyteConfig) {
    this._config = config;
    this._chain = resolveChain(config.chain);

    if (config.debug) {
      console.log(`[Orbyte:DEBUG] Initializing framework on chain: ${this._chain.name}`);
      console.log(`[Orbyte:DEBUG] Using RPC URL: ${config.rpc || 'default public RPC'}`);
    }

    // Create the public client (read-only, no wallet needed)
    this._publicClient = createPublicClient({
      chain: this._chain,
      transport: http(config.rpc),
    });

    // Initialize modules
    this.wallet = createWalletModule(this._chain, this._publicClient, config.rpc);
    this.contract = createContractModule(this._publicClient, this.wallet);
    this.tokens = createTokenModule(this._publicClient, this.wallet);
    this.nft = createNFTModule(this._publicClient, this.wallet);
    this.tx = createTxModule(this._publicClient, this.wallet, this._chain);
    this.agent = new OrbyteAgent(this);

    // Auto-connect wallet if private key is provided
    if (config.privateKey) {
      this.wallet.fromKey(config.privateKey);
    }
  }

  /**
   * Chain information and utilities.
   */
  get chain(): ChainInfo {
    const chain = this._chain;
    const client = this._publicClient;

    return {
      id: chain.id,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      blockNumber: () => client.getBlockNumber(),
      gasPrice: async () => {
        const price = await client.getGasPrice();
        return { gwei: formatGasPrice(price), wei: price };
      },
    };
  }

  /**
   * Get the underlying viem public client for advanced operations.
   */
  get publicClient(): PublicClient<Transport, Chain> {
    return this._publicClient;
  }

  /**
   * Get the current config.
   */
  get config(): OrbyteConfig {
    return { ...this._config };
  }

  /**
   * Switch to a different chain at runtime.
   *
   * @example
   * ```ts
   * app.switchChain('polygon');
   * ```
   */
  switchChain(chain: OrbyteConfig['chain'], rpc?: string): void {
    this._chain = resolveChain(chain);
    this._publicClient = createPublicClient({
      chain: this._chain,
      transport: http(rpc ?? this._config.rpc),
    });
    this._config = { ...this._config, chain, rpc: rpc ?? this._config.rpc };

    // Re-initialize all modules with the new chain
    // Note: We use Object.assign to update the readonly references
    Object.assign(this, {
      wallet: createWalletModule(this._chain, this._publicClient, rpc ?? this._config.rpc),
      contract: createContractModule(this._publicClient, this.wallet),
      tokens: createTokenModule(this._publicClient, this.wallet),
      nft: createNFTModule(this._publicClient, this.wallet),
      tx: createTxModule(this._publicClient, this.wallet, this._chain),
    });

    // Re-connect wallet if private key was provided
    if (this._config.privateKey) {
      this.wallet.fromKey(this._config.privateKey);
    }
  }

  /**
   * Install plugins to extend Orbyte's functionality.
   *
   * @example
   * ```ts
   * app.use(ensPlugin());
   * app.use(ipfsPlugin({ gateway: 'https://...' }));
   * ```
   */
  async use(plugin: OrbytePlugin): Promise<void> {
    if (this._plugins.has(plugin.name)) {
      throw new PluginError(plugin.name, 'Plugin is already installed.');
    }

    try {
      await plugin.install({
        config: this._config,
        publicClient: this._publicClient,
        walletClient: this.wallet.client,
        extend: (namespace, methods) => {
          this._extensions.set(namespace, methods);
          // Make the extension accessible as app[namespace]
          Object.defineProperty(this, namespace, {
            get: () => this._extensions.get(namespace),
            configurable: true,
          });
        },
      });
      this._plugins.add(plugin.name);
    } catch (error) {
      throw new PluginError(
        plugin.name,
        `Failed to install: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Get info about the current Orbyte instance.
   */
  info() {
    const chainName = typeof this._config.chain === 'string'
      ? this._config.chain
      : getChainName(this._chain) ?? 'custom';

    return {
      chain: chainName,
      chainId: this._chain.id,
      chainName: this._chain.name,
      walletConnected: this.wallet.isConnected,
      plugins: Array.from(this._plugins),
      rpc: this._config.rpc ?? 'public (default)',
    };
  }
}
