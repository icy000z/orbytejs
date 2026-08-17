import type { Orbyte } from './orbyte';
import type { Abi } from 'viem';

/**
 * Orbyte — Agent Module
 * 
 * Exposes Orbyte's capabilities as standard AI tool schemas (OpenAI / Anthropic compatible).
 * This makes Orbyte the ultimate framework for AI Agents building Web3 projects.
 */
export class OrbyteAgent {
  constructor(private app: Orbyte) {}

  /**
   * Generates a list of AI function schemas for all core Orbyte capabilities.
   */
  getCoreTools() {
    return [
      {
        type: "function",
        function: {
          name: "get_wallet_balance",
          description: "Get the native token balance of a specific Web3 wallet address.",
          parameters: {
            type: "object",
            properties: {
              address: { type: "string", description: "The 0x address of the wallet" }
            },
            required: ["address"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_native_token",
          description: "Transfer native tokens to a specific address using human-readable amounts (e.g., '1.5 eth').",
          parameters: {
            type: "object",
            properties: {
              to: { type: "string", description: "The destination 0x address" },
              amount: { type: "string", description: "The amount to send as a string, e.g., '0.1 eth' or '100'" }
            },
            required: ["to", "amount"]
          }
        }
      }
    ];
  }

  /**
   * Automatically generate an AI tool schema for any smart contract based on its ABI!
   */
  generateContractTools(contractName: string, contractAddress: string, abi: Abi) {
    const tools: any[] = [];
    
    // Parse ABI and generate tools for read/write functions
    for (const item of abi) {
      if (item.type === 'function') {
        const properties: Record<string, any> = {};
        const required: string[] = [];

        if (item.inputs) {
          for (const input of item.inputs) {
            const paramName = input.name || 'arg';
            properties[paramName] = { 
              type: "string", 
              description: \`Smart contract parameter of type \${input.type}\` 
            };
            required.push(paramName);
          }
        }

        tools.push({
          type: "function",
          function: {
            name: \`\${contractName}_\${item.name}\`,
            description: \`Call the \${item.name} function on the \${contractName} smart contract (\${contractAddress}). Mutability: \${item.stateMutability}\`,
            parameters: {
              type: "object",
              properties,
              required
            }
          }
        });
      }
    }

    return tools;
  }

  /**
   * Helper for the AI agent to execute a tool call dynamically
   */
  async executeTool(name: string, args: Record<string, any>) {
    if (name === 'get_wallet_balance') {
      const bal = await this.app.wallet.balanceOf(args.address as any);
      return `Balance: ${bal.formatted} ${bal.symbol}`;
    }
    
    if (name === 'transfer_native_token') {
      if (!this.app.wallet.isConnected) {
        return `Simulation successful: Transfer of ${args.amount} to ${args.to} (Wallet not connected for real transfer)`;
      }
      try {
        const tx = await this.app.tx.sendNative(args.to as any, args.amount);
        return `Successfully transferred ${args.amount} to ${args.to}. Transaction Hash: ${tx.hash}`;
      } catch (error) {
        return `Failed to transfer: ${error instanceof Error ? error.message : error}`;
      }
    }
    
    return `Unknown tool: ${name}`;
  }
}
