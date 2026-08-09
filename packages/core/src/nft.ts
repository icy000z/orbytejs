/**
 * Orbyte — NFT Module
 *
 * ERC721 NFT operations with metadata auto-fetching.
 */

import type { Address, Chain, PublicClient, Transport } from 'viem';
import { ERC721_ABI } from './contract.js';
import type { WalletModule } from './wallet.js';
import type { NFTMetadata, OrbyteNFT, OrbyteTransaction } from './types.js';
import { ContractError, WalletError } from './errors.js';

export function createNFTModule(
  publicClient: PublicClient<Transport, Chain>,
  walletModule: WalletModule,
) {
  /**
   * Create an NFT (ERC721) interface.
   *
   * @example
   * ```ts
   * const nft = app.nft('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D');
   * const owner = await nft.ownerOf(1234);
   * const meta = await nft.metadata(1234);
   * ```
   */
  function nft(contractAddress: Address): OrbyteNFT {
    function requireWallet() {
      const client = walletModule.client;
      if (!client) throw new WalletError('No wallet connected.');
      return client;
    }

    return {
      address: contractAddress,

      async ownerOf(tokenId: bigint | number): Promise<Address> {
        return publicClient.readContract({
          address: contractAddress, abi: ERC721_ABI,
          functionName: 'ownerOf', args: [BigInt(tokenId)],
        }) as Promise<Address>;
      },

      async balanceOf(address: Address): Promise<bigint> {
        return publicClient.readContract({
          address: contractAddress, abi: ERC721_ABI,
          functionName: 'balanceOf', args: [address],
        }) as Promise<bigint>;
      },

      async tokenURI(tokenId: bigint | number): Promise<string> {
        return publicClient.readContract({
          address: contractAddress, abi: ERC721_ABI,
          functionName: 'tokenURI', args: [BigInt(tokenId)],
        }) as Promise<string>;
      },

      async metadata(tokenId: bigint | number): Promise<NFTMetadata> {
        const uri = await publicClient.readContract({
          address: contractAddress, abi: ERC721_ABI,
          functionName: 'tokenURI', args: [BigInt(tokenId)],
        }) as string;

        // Resolve IPFS URIs
        let fetchUrl = uri;
        if (uri.startsWith('ipfs://')) {
          fetchUrl = `https://ipfs.io/ipfs/${uri.slice(7)}`;
        }

        try {
          const response = await fetch(fetchUrl);
          const raw = await response.json() as Record<string, unknown>;
          return {
            tokenId: BigInt(tokenId),
            name: raw.name as string | undefined,
            description: raw.description as string | undefined,
            image: raw.image as string | undefined,
            attributes: raw.attributes as NFTMetadata['attributes'],
            raw,
          };
        } catch (error) {
          throw new ContractError(
            `Failed to fetch metadata from ${fetchUrl}: ${error instanceof Error ? error.message : error}`,
            contractAddress, 'metadata',
          );
        }
      },

      async transfer(from: Address, to: Address, tokenId: bigint | number): Promise<OrbyteTransaction> {
        const client = requireWallet();
        const { request } = await publicClient.simulateContract({
          address: contractAddress, abi: ERC721_ABI,
          functionName: 'transferFrom',
          args: [from, to, BigInt(tokenId)], account: client.account,
        });
        const hash = await client.writeContract(request);
        return { hash, async wait(opts) { return publicClient.waitForTransactionReceipt({ hash, confirmations: opts?.confirmations }); } };
      },

      async approve(to: Address, tokenId: bigint | number): Promise<OrbyteTransaction> {
        const client = requireWallet();
        const { request } = await publicClient.simulateContract({
          address: contractAddress, abi: ERC721_ABI,
          functionName: 'approve',
          args: [to, BigInt(tokenId)], account: client.account,
        });
        const hash = await client.writeContract(request);
        return { hash, async wait(opts) { return publicClient.waitForTransactionReceipt({ hash, confirmations: opts?.confirmations }); } };
      },
    } satisfies OrbyteNFT;
  }

  return nft;
}

export type NFTModule = ReturnType<typeof createNFTModule>;
