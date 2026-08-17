/**
 * Orbyte — Transaction Module
 *
 * Simplified transaction sending with human-readable values.
 */

import type { Address, Chain, Hash, PublicClient, Transport } from 'viem';
import type { WalletModule } from './wallet.js';
import type { GasEstimate, SendTransactionOptions, OrbyteTransaction } from './types.js';
import { parseValue, formatValue, formatGasPrice } from './utils.js';
import { WalletError, TransactionError } from './errors.js';

export function createTxModule(
  publicClient: PublicClient<Transport, Chain>,
  walletModule: WalletModule,
  chain: Chain,
) {
  return {
    /**
     * Send native currency (ETH, MATIC, etc.) with human-readable values.
     *
     * @example
     * ```ts
     * const tx = await app.tx.send({ to: '0xBob...', value: '0.5 eth' });
     * await tx.wait();
     * ```
     */
    async send(options: SendTransactionOptions): Promise<OrbyteTransaction> {
      const client = walletModule.client;
      if (!client) throw new WalletError('No wallet connected.');

      const value = options.value ? parseValue(options.value) : 0n;

      const hash = await client.sendTransaction({
        to: options.to,
        value,
        data: options.data,
        gas: options.gasLimit,
        nonce: options.nonce,
        chain,
      });

      return {
        hash,
        async wait(opts) {
          return publicClient.waitForTransactionReceipt({
            hash, confirmations: opts?.confirmations,
          });
        },
      };
    },

    /**
     * Send native currency directly using positional arguments.
     * 
     * @example
     * ```ts
     * await app.tx.sendNative('0xRecipient...', '1.5 eth');
     * ```
     */
    async sendNative(to: Address, value: string): Promise<OrbyteTransaction> {
      return this.send({ to, value });
    },

    /**
     * Estimate the gas cost for a transaction.
     */
    async estimateGas(options: SendTransactionOptions): Promise<GasEstimate> {
      const value = options.value ? parseValue(options.value) : 0n;
      const account = walletModule.account;

      const [gasLimit, gasPrice] = await Promise.all([
        publicClient.estimateGas({
          to: options.to,
          value,
          data: options.data,
          account: account ?? undefined,
        }),
        publicClient.getGasPrice(),
      ]);

      const totalWei = gasLimit * gasPrice;
      const symbol = chain.nativeCurrency.symbol;

      return {
        gasLimit,
        gasPriceGwei: formatGasPrice(gasPrice),
        formatted: formatValue(totalWei, symbol),
        wei: totalWei,
      };
    },

    /**
     * Get a transaction receipt by hash.
     */
    async getReceipt(hash: Hash) {
      try {
        return await publicClient.getTransactionReceipt({ hash });
      } catch (error) {
        throw new TransactionError(
          `Failed to get receipt: ${error instanceof Error ? error.message : error}`,
          hash,
        );
      }
    },

    /**
     * Get transaction details by hash.
     */
    async get(hash: Hash) {
      return publicClient.getTransaction({ hash });
    },
  };
}

export type TxModule = ReturnType<typeof createTxModule>;
