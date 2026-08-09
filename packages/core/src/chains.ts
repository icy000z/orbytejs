/**
 * Orbyte — Chain Registry
 *
 * Maps human-friendly chain names to viem chain objects.
 * Provides built-in support for all major EVM chains and testnets.
 */

import {
  mainnet,
  goerli,
  sepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  base,
  baseSepolia,
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  linea,
  zkSync,
  fantom,
  celo,
  gnosis,
} from 'viem/chains';
import type { Chain } from 'viem';
import type { ChainName } from './types.js';

/**
 * Registry mapping chain shorthand names to viem Chain objects.
 * Users can reference chains by simple strings like 'ethereum' or 'polygon'.
 */
export const chainRegistry: Record<ChainName, Chain> = {
  ethereum: mainnet,
  goerli: goerli,
  sepolia: sepolia,
  polygon: polygon,
  'polygon-amoy': polygonAmoy,
  arbitrum: arbitrum,
  'arbitrum-sepolia': arbitrumSepolia,
  optimism: optimism,
  'optimism-sepolia': optimismSepolia,
  base: base,
  'base-sepolia': baseSepolia,
  bsc: bsc,
  'bsc-testnet': bscTestnet,
  avalanche: avalanche,
  'avalanche-fuji': avalancheFuji,
  linea: linea,
  zksync: zkSync,
  fantom: fantom,
  celo: celo,
  gnosis: gnosis,
};

/**
 * Block explorer API endpoints for auto ABI fetching.
 */
export const explorerApis: Partial<Record<ChainName, string>> = {
  ethereum: 'https://api.etherscan.io/api',
  goerli: 'https://api-goerli.etherscan.io/api',
  sepolia: 'https://api-sepolia.etherscan.io/api',
  polygon: 'https://api.polygonscan.com/api',
  arbitrum: 'https://api.arbiscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
  base: 'https://api.basescan.org/api',
  bsc: 'https://api.bscscan.com/api',
  avalanche: 'https://api.snowtrace.io/api',
  linea: 'https://api.lineascan.build/api',
  fantom: 'https://api.ftmscan.com/api',
};

/**
 * Resolve a chain name or Chain object into a viem Chain.
 * Throws a descriptive error if the chain name is not recognized.
 */
export function resolveChain(chain: ChainName | Chain): Chain {
  if (typeof chain === 'string') {
    const resolved = chainRegistry[chain];
    if (!resolved) {
      const available = Object.keys(chainRegistry).join(', ');
      throw new OrbyteChainError(
        `Unknown chain "${chain}". Available chains: ${available}`
      );
    }
    return resolved;
  }
  return chain;
}

/**
 * Get the chain name for a given chain (reverse lookup).
 */
export function getChainName(chain: Chain): ChainName | null {
  for (const [name, c] of Object.entries(chainRegistry)) {
    if (c.id === chain.id) return name as ChainName;
  }
  return null;
}

/**
 * Get the block explorer API URL for a chain.
 */
export function getExplorerApi(chain: ChainName | Chain): string | null {
  const name = typeof chain === 'string' ? chain : getChainName(chain);
  if (!name) return null;
  return explorerApis[name] ?? null;
}

/**
 * List all supported chain names.
 */
export function supportedChains(): ChainName[] {
  return Object.keys(chainRegistry) as ChainName[];
}

/** Custom error for chain-related issues */
export class OrbyteChainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrbyteChainError';
  }
}
