/**
 * Orbyte — Solana Module
 * 
 * Bringing Orbyte's simple Developer Experience to the Solana ecosystem.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  type Cluster
} from '@solana/web3.js';
import {
  getMint,
  getAccount,
  getAssociatedTokenAddress,
  createTransferInstruction
} from '@solana/spl-token';
import bs58 from 'bs58';

export interface OrbyteSolanaConfig {
  network?: Cluster | 'localnet';
  rpc?: string;
  privateKey?: string | Uint8Array;
}

export class OrbyteSolana {
  public connection: Connection;
  public wallet: Keypair | null = null;
  public network: string;

  constructor(config: OrbyteSolanaConfig = {}) {
    this.network = config.network || 'mainnet-beta';
    const rpcUrl = config.rpc || (this.network === 'localnet' ? 'http://127.0.0.1:8899' : clusterApiUrl(this.network as Cluster));
    
    this.connection = new Connection(rpcUrl, 'confirmed');

    if (config.privateKey) {
      if (typeof config.privateKey === 'string') {
        this.wallet = Keypair.fromSecretKey(bs58.decode(config.privateKey));
      } else {
        this.wallet = Keypair.fromSecretKey(config.privateKey);
      }
    }
  }

  /**
   * Wallet operations
   */
  get account() {
    const connection = this.connection;
    const wallet = this.wallet;
    
    return {
      get address() {
        if (!wallet) throw new Error('No wallet configured');
        return wallet.publicKey.toBase58();
      },
      
      async balance(address?: string) {
        const pubKey = address ? new PublicKey(address) : wallet?.publicKey;
        if (!pubKey) throw new Error('Address required');
        
        const lamports = await connection.getBalance(pubKey);
        return {
          formatted: (lamports / LAMPORTS_PER_SOL).toString(),
          lamports,
          symbol: 'SOL'
        };
      },

      async sendSol(to: string, amountSol: number | string) {
        if (!wallet) throw new Error('Wallet required to send SOL');
        
        const toPubkey = new PublicKey(to);
        const amount = typeof amountSol === 'string' ? parseFloat(amountSol) : amountSol;
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey,
            lamports,
          })
        );

        const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
        return signature;
      }
    };
  }

  /**
   * SPL Token operations
   */
  get spl() {
    const connection = this.connection;
    const wallet = this.wallet;

    return (mintAddress: string) => {
      const mintPubKey = new PublicKey(mintAddress);

      return {
        async info() {
          const mint = await getMint(connection, mintPubKey);
          return {
            address: mintAddress,
            decimals: mint.decimals,
            supply: (Number(mint.supply) / Math.pow(10, mint.decimals)).toString(),
          };
        },

        async balance(ownerAddress: string) {
          const ownerPubKey = new PublicKey(ownerAddress);
          const ata = await getAssociatedTokenAddress(mintPubKey, ownerPubKey);
          
          try {
            const account = await getAccount(connection, ata);
            const mintInfo = await getMint(connection, mintPubKey);
            return (Number(account.amount) / Math.pow(10, mintInfo.decimals)).toString();
          } catch (e) {
            return "0";
          }
        },

        async transfer(to: string, amountHuman: string | number) {
          if (!wallet) throw new Error('Wallet required for transfer');
          
          const toPubKey = new PublicKey(to);
          const mintInfo = await getMint(connection, mintPubKey);
          
          const amount = typeof amountHuman === 'string' ? parseFloat(amountHuman) : amountHuman;
          const rawAmount = Math.floor(amount * Math.pow(10, mintInfo.decimals));

          const fromAta = await getAssociatedTokenAddress(mintPubKey, wallet.publicKey);
          const toAta = await getAssociatedTokenAddress(mintPubKey, toPubKey);

          const tx = new Transaction().add(
            createTransferInstruction(
              fromAta,
              toAta,
              wallet.publicKey,
              rawAmount
            )
          );

          return sendAndConfirmTransaction(connection, tx, [wallet]);
        }
      };
    };
  }
}
