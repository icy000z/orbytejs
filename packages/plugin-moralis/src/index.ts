import Moralis from 'moralis';
import type { OrbytePlugin, OrbyteApp } from 'orbytejs';
import { PluginError } from 'orbytejs';

export interface MoralisPluginOptions {
  apiKey: string;
}

/**
 * Orbyte Plugin: Moralis
 *
 * Adds powerful indexed data fetching capabilities to Orbyte apps.
 */
export function moralisPlugin(options: MoralisPluginOptions): OrbytePlugin {
  if (!options.apiKey) {
    throw new Error('Moralis API key is required');
  }

  return {
    name: 'moralis',
    async install(app: OrbyteApp) {
      try {
        if (!Moralis.Core.isStarted) {
          await Moralis.start({ apiKey: options.apiKey });
        }

        const methods = {
          /**
           * Get all tokens for a wallet address
           */
          async getWalletTokens(address: string, chainId?: number) {
            const chain = chainId ? `0x${chainId.toString(16)}` : `0x${app.publicClient.chain.id.toString(16)}`;
            const response = await Moralis.EvmApi.token.getWalletTokenBalances({
              address,
              chain,
            });
            return response.toJSON();
          },

          /**
           * Get all NFTs for a wallet address
           */
          async getWalletNFTs(address: string, chainId?: number) {
            const chain = chainId ? `0x${chainId.toString(16)}` : `0x${app.publicClient.chain.id.toString(16)}`;
            const response = await Moralis.EvmApi.nft.getWalletNFTs({
              address,
              chain,
            });
            return response.toJSON();
          },

          /**
           * Get the native balance for a wallet address
           */
          async getNativeBalance(address: string, chainId?: number) {
            const chain = chainId ? `0x${chainId.toString(16)}` : `0x${app.publicClient.chain.id.toString(16)}`;
            const response = await Moralis.EvmApi.balance.getNativeBalance({
              address,
              chain,
            });
            return response.toJSON();
          },
          
          /**
           * Access the raw Moralis SDK
           */
          sdk: Moralis,
        };

        app.extend('moralis', methods);
      } catch (error) {
        throw new PluginError(
          'moralis',
          `Failed to initialize Moralis: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  };
}

// Module augmentation for TypeScript support when using the plugin
declare module 'orbytejs' {
  interface Orbyte {
    moralis: {
      getWalletTokens(address: string, chainId?: number): Promise<any>;
      getWalletNFTs(address: string, chainId?: number): Promise<any>;
      getNativeBalance(address: string, chainId?: number): Promise<any>;
      sdk: typeof Moralis;
    };
  }
}
