/**
 * Orbyte — Wallet Module
 *
 * Backend wallet management using private keys.
 * Designed for server-side scripts, bots, and automated API backends.
 */

import {
  createWalletClient,
  http,
  type Account,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { formatValue } from './utils.js';
import { WalletError } from './errors.js';
import type { WalletBalance, WalletInfo } from './types.js';

/**
 * Creates a wallet module bound to the given chain and clients.
 */
export function createWalletModule(
  chain: Chain,
  publicClient: PublicClient<Transport, Chain>,
  rpcUrl?: string,
) {
  let _walletClient: WalletClient<Transport, Chain, Account> | null = null;
  let _account: Account | null = null;

  /**
   * Get the balance of any address.
   */
  async function getBalance(address: Address): Promise<WalletBalance> {
    const balance = await publicClient.getBalance({ address });
    const symbol = chain.nativeCurrency.symbol;
    return {
      formatted: formatValue(balance),
      wei: balance,
      symbol,
    };
  }

  /**
   * Get the transaction count (nonce) for an address.
   */
  async function getNonce(address: Address): Promise<number> {
    return publicClient.getTransactionCount({ address });
  }

  const walletModule = {
    /**
     * Create a wallet from a private key.
     * Best for server-side scripts, bots, and automation.
     *
     * @example
     * ```ts
     * const wallet = app.wallet.fromKey(process.env.PRIVATE_KEY);
     * console.log(wallet.address);
     * ```
     */
    fromKey(privateKey: Hex): WalletInfo {
      _account = privateKeyToAccount(privateKey);
      _walletClient = createWalletClient({
        account: _account,
        chain,
        transport: http(rpcUrl),
      });

      const address = _account.address;
      return {
        address,
        balance: () => getBalance(address),
        nonce: () => getNonce(address),
        chainId: async () => chain.id,
      };
    },

    balanceOf: getBalance,

    /**
     * Get the current wallet client (for internal use by other modules).
     * @internal
     */
    get client(): WalletClient<Transport, Chain, Account> | null {
      return _walletClient;
    },

    /**
     * Get the current account (for internal use by other modules).
     * @internal
     */
    get account(): Account | null {
      return _account;
    },

    /**
     * Check if a wallet is currently connected.
     */
    get isConnected(): boolean {
      return _walletClient !== null;
    },
  };

  return walletModule;
}

export type WalletModule = ReturnType<typeof createWalletModule>;
