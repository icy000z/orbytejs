/**
 * Orbyte — ERC20 Token Module
 *
 * High-level ERC20 operations with human-readable amounts.
 */

import type { Address, Chain, PublicClient, Transport } from 'viem';
import { ERC20_ABI } from './contract.js';
import type { WalletModule } from './wallet.js';
import type { TokenInfo, OrbyteERC20, OrbyteTransaction } from './types.js';
import { formatTokenAmount, parseTokenAmount } from './utils.js';
import { ContractError, WalletError } from './errors.js';

export function createTokenModule(
  publicClient: PublicClient<Transport, Chain>,
  walletModule: WalletModule,
) {
  function erc20(tokenAddress: Address): OrbyteERC20 {
    let _decimals: number | null = null;

    async function getDecimals(): Promise<number> {
      if (_decimals !== null) return _decimals;
      _decimals = Number(
        await publicClient.readContract({
          address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals',
        })
      );
      return _decimals;
    }

    function requireWallet() {
      const client = walletModule.client;
      if (!client) {
        throw new WalletError('No wallet connected. Call app.wallet.fromKey() first.');
      }
      return client;
    }

    return {
      address: tokenAddress,

      async info(): Promise<TokenInfo> {
        try {
          const [name, symbol, decimals, totalSupply] = await Promise.all([
            publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'name' }),
            publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'symbol' }),
            publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals' }),
            publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'totalSupply' }),
          ]);
          const dec = Number(decimals);
          return {
            address: tokenAddress, name: name as string, symbol: symbol as string,
            decimals: dec, totalSupply: formatTokenAmount(totalSupply as bigint, dec),
          };
        } catch (error) {
          throw new ContractError(`Failed to fetch token info: ${error instanceof Error ? error.message : error}`, tokenAddress);
        }
      },

      async balanceOf(address: Address): Promise<string> {
        const [balance, decimals] = await Promise.all([
          publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
          getDecimals(),
        ]);
        return formatTokenAmount(balance, decimals);
      },

      async transfer(to: Address, amount: string): Promise<OrbyteTransaction> {
        const client = requireWallet();
        const decimals = await getDecimals();
        const rawAmount = parseTokenAmount(amount, decimals);
        const { request } = await publicClient.simulateContract({
          address: tokenAddress, abi: ERC20_ABI, functionName: 'transfer',
          args: [to, rawAmount], account: client.account,
        });
        const hash = await client.writeContract(request);
        return { hash, async wait(opts) { return publicClient.waitForTransactionReceipt({ hash, confirmations: opts?.confirmations }); } };
      },

      async approve(spender: Address, amount: string): Promise<OrbyteTransaction> {
        const client = requireWallet();
        const decimals = await getDecimals();
        const rawAmount = parseTokenAmount(amount, decimals);
        const { request } = await publicClient.simulateContract({
          address: tokenAddress, abi: ERC20_ABI, functionName: 'approve',
          args: [spender, rawAmount], account: client.account,
        });
        const hash = await client.writeContract(request);
        return { hash, async wait(opts) { return publicClient.waitForTransactionReceipt({ hash, confirmations: opts?.confirmations }); } };
      },

      async allowance(owner: Address, spender: Address): Promise<string> {
        const [allowed, decimals] = await Promise.all([
          publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'allowance', args: [owner, spender] }) as Promise<bigint>,
          getDecimals(),
        ]);
        return formatTokenAmount(allowed, decimals);
      },

      async totalSupply(): Promise<string> {
        const [supply, decimals] = await Promise.all([
          publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'totalSupply' }) as Promise<bigint>,
          getDecimals(),
        ]);
        return formatTokenAmount(supply, decimals);
      },
    } satisfies OrbyteERC20;
  }

  return { erc20 };
}

export type TokenModule = ReturnType<typeof createTokenModule>;
