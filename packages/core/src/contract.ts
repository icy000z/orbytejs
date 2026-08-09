/**
 * Orbyte — Contract Module
 *
 * Smart contract interaction made dead simple.
 * Provides read/write proxy objects that auto-handle gas, signing, and ABI encoding.
 */

import {
  getContract,
  type Abi,
  type Address,
  type Chain,
  type GetContractReturnType,
  type PublicClient,
  type Transport,
} from 'viem';
import type { WalletModule } from './wallet.js';
import type { OrbyteTransaction } from './types.js';
import { ContractError, WalletError } from './errors.js';

/**
 * Standard ERC20 ABI — covers the most common token interactions.
 * Used as a fallback when no ABI is provided and auto-fetch fails.
 */
export const ERC20_ABI = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'transferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'event', name: 'Transfer', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Approval', inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'spender', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
] as const;

/**
 * Standard ERC721 ABI — covers common NFT interactions.
 */
export const ERC721_ABI = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'getApproved', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'setApprovalForAll', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'isApprovedForAll', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'transferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'safeTransferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'event', name: 'Transfer', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'tokenId', type: 'uint256', indexed: true }] },
  { type: 'event', name: 'Approval', inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'approved', type: 'address', indexed: true }, { name: 'tokenId', type: 'uint256', indexed: true }] },
] as const;

/**
 * Creates the contract module.
 * Returns a function that wraps a contract address + ABI into a simple read/write interface.
 */
export function createContractModule(
  publicClient: PublicClient<Transport, Chain>,
  walletModule: WalletModule,
) {
  /**
   * Load a contract by address with an ABI.
   *
   * @example
   * ```ts
   * const usdc = app.contract('0xA0b8...', { abi: usdcAbi });
   * const name = await usdc.read.name();
   * const tx = await usdc.write.transfer('0xBob...', 1000000n);
   * ```
   */
  function loadContract(address: Address, abi: Abi) {
    const viemContract: GetContractReturnType<Abi, typeof publicClient> = getContract({
      address,
      abi,
      client: publicClient,
    });

    // ── Read proxy ──────────────────────────────────────────────
    const read = new Proxy({} as Record<string, (...args: unknown[]) => Promise<unknown>>, {
      get(_target, prop: string) {
        return async (...args: unknown[]) => {
          try {
            return await publicClient.readContract({
              address,
              abi,
              functionName: prop,
              args: args.length > 0 ? args : undefined,
            });
          } catch (error) {
            throw new ContractError(
              `Failed to call ${prop}() on ${address}: ${error instanceof Error ? error.message : String(error)}`,
              address,
              prop,
              { cause: error instanceof Error ? error : undefined },
            );
          }
        };
      },
    });

    // ── Write proxy ─────────────────────────────────────────────
    const write = new Proxy({} as Record<string, (...args: unknown[]) => Promise<OrbyteTransaction>>, {
      get(_target, prop: string) {
        return async (...args: unknown[]): Promise<OrbyteTransaction> => {
          const client = walletModule.client;
          if (!client) {
            throw new WalletError(
              `Cannot write to contract — no wallet connected. ` +
              `Call app.wallet.connect() or app.wallet.fromKey() first.`
            );
          }

          try {
            // Simulate first to catch errors before spending gas
            const { request } = await publicClient.simulateContract({
              address,
              abi,
              functionName: prop,
              args: args.length > 0 ? args : undefined,
              account: client.account,
            });

            // Execute the transaction
            const hash = await client.writeContract(request);

            return {
              hash,
              async wait(options?: { confirmations?: number }) {
                return publicClient.waitForTransactionReceipt({
                  hash,
                  confirmations: options?.confirmations,
                });
              },
            };
          } catch (error) {
            throw new ContractError(
              `Failed to execute ${prop}() on ${address}: ${error instanceof Error ? error.message : String(error)}`,
              address,
              prop,
              { cause: error instanceof Error ? error : undefined },
            );
          }
        };
      },
    });

    // ── Event listener ──────────────────────────────────────────
    function on(eventName: string, ...rest: unknown[]): () => void {
      let filter: Record<string, unknown> | undefined;
      let callback: (...args: unknown[]) => void;

      if (rest.length === 2) {
        filter = rest[0] as Record<string, unknown>;
        callback = rest[1] as (...args: unknown[]) => void;
      } else {
        callback = rest[0] as (...args: unknown[]) => void;
      }

      const unwatch = publicClient.watchContractEvent({
        address,
        abi,
        eventName,
        args: filter,
        onLogs: (logs) => {
          for (const log of logs) {
            callback(log);
          }
        },
      });

      return unwatch;
    }

    return {
      address,
      abi,
      read,
      write,
      on,
      /** Get the underlying viem contract instance for advanced use */
      _viem: viemContract,
    };
  }

  return loadContract;
}

export type ContractModule = ReturnType<typeof createContractModule>;
