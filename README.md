<div align="center">
  <h1> Orbyte </h1>
  <p><strong>The Ultimate, Ultra-Secure, AI-Ready Web3 Backend Framework.</strong></p>
  <p><em>Web3 development should feel as easy as building a REST API.</em></p>
</div>

---

**Orbyte** is a legendary JavaScript/TypeScript framework that makes building Web3 infrastructure radically simple. Whether you are building an ultra-secure REST API, an Unstoppable Decentralized P2P Swarm, or an AI Agent that trades tokens, Orbyte is the only backend framework you will ever need.

By combining military-grade security defaults, zero-boilerplate Web3 abstractions, and native LLM integration, Orbyte lets you write **3 lines of code** instead of 30.

---

## Installation & OPM

Orbyte comes with its own legendary package manager: **OPM (Orbyte Package Manager)**. Use it to scaffold your backend, install plugins, and download smart contract templates instantly!

### Scaffold a New Project
```bash
# Create a new Orbyte Backend Project instantly
npx opm create my-api --template backend

# List supported chains
npx opm chains
```

### Install Plugins & Smart Contracts
Why copy-paste Solidity from Etherscan? Let `opm` download production-ready templates directly into your project workspace.

```bash
# Install Web3 plugins (automatically adds them to your dependencies)
npx opm install moralis

# Download standard Smart Contract templates directly into your /contracts folder!
npx opm install erc20
npx opm install erc721
```

---

## The Dual-Mode Architecture

Orbyte allows developers to instantly toggle their server architecture using the `mode` parameter.

### Mode 1: Ultra-Secure REST API (`mode: 'normal'`)
Orbyte's native server (`@orbytejs/server`) provides **military-grade security** out of the box. It automatically applies `helmet` (Security Headers), Rate Limiting (DDoS protection), HTTP Parameter Pollution blocking, strict payload size limits, and automatic fallback from HTTPS (Production) to HTTP (Development).

```javascript
import { OrbyteServer } from '@orbytejs/server';

const app = new OrbyteServer({
  chain: 'ethereum',
  port: 3000,
  mode: 'normal', // Default
  debug: true // Enables transparent RPC tracing!
});

app.get('/balance/:address', async (req, res) => {
   const bal = await req.orbyte.wallet.balanceOf(req.params.address);
   res.json({ balance: bal.formatted });
});

app.listen();
```

### Mode 2: Unstoppable P2P Swarm (`mode: 'decentralized'`)
Want to build a decentralized backend without centralized servers or databases? Switch to `decentralized` mode. Your server instantly becomes a node in a decentralized DHT swarm (powered by Hyperswarm).

```javascript
const p2pNode = new OrbyteServer({ 
  chain: 'ethereum',
  mode: 'decentralized',
  p2p: { topic: 'my-dapp-network-v1' } 
});

await p2pNode.joinSwarm();

p2pNode.onP2PMessage((msg, peerKey) => {
  console.log(`Received message from decentralized peer!`, msg);
});

// Broadcast state to all nodes in the swarm!
p2pNode.broadcastP2P({ event: 'NEW_TRANSACTION_DETECTED' });
```

---

## The Agentic API (For AI Agents)

Orbyte is the world's first **Agentic Framework**. It natively translates all Web3 capabilities and Smart Contract ABIs into OpenAI and Anthropic compatible "function calling" JSON schemas!

You can give your LLM Agent direct, secure access to the blockchain.

```javascript
// 1. Export core framework tools for your AI Agent
const coreTools = app.agent.getCoreTools(); 

// 2. Instantly generate AI tools from ANY Smart Contract ABI!
const contractTools = app.agent.generateContractTools('MyToken', '0xabc...', abi);

// 3. When the AI Agent decides to execute a blockchain action:
const result = await app.agent.executeTool(toolName, args);
console.log(result);
```

---

## Auto-Generated Frontend SDK

Even though Orbyte is purely a backend framework, it bridges the gap to frontends flawlessly. Just call `app.serveSDK()` and your backend will generate and serve a typed JavaScript client SDK that your React/Vue frontend can consume instantly (similar to tRPC).

```javascript
const app = new OrbyteServer({ chain: 'ethereum' });

app.serveSDK('/orbyte-client.js'); 
// Your frontend can now import this file and communicate seamlessly with the backend!
```

---

## Zero-Boilerplate Web3 Engine

Built on top of `viem`, the `@orbytejs/core` engine abstracts away the pain points of Web3 interaction.

### Human-Readable Mathematics
Say goodbye to messy `BigInt` conversions. Send `1.5 eth` or read balances directly as human strings, and Orbyte handles the 18-decimal token math natively.

```javascript
import { Orbyte } from 'orbytejs';

const app = new Orbyte({ 
  chain: 'ethereum',
  privateKey: process.env.PRIVATE_KEY 
});

// Send native tokens safely
const tx = await app.tx.sendNative('0xRecipient...', '1.5 eth');

// Interact with ERC20 tokens
const usdc = app.tokens.erc20('0xA0b8...');
const info = await usdc.info();
console.log(`Name: ${info.name}, Balance: ${info.balance}`);
```

### Background Smart Contract Indexing
Listening to blockchain events should be easy. Orbyte acts as a background worker listening to smart contract emissions instantly.

```javascript
const myContract = app.contract('0xContract...', abi);

// Listen to an on-chain event forever
myContract.onEvent('Transfer', (event) => {
  console.log('New Transfer Detected:', event.args);
});
```

---

## Multi-Chain & Solana Support

Orbyte provides multi-chain switching on the fly. It natively supports 20+ EVM chains (Arbitrum, Optimism, Polygon, etc.) and provides a dedicated, identical paradigm for **Solana** via `@orbytejs/solana`.

```javascript
// Switch EVM Chains at runtime!
app.switchChain('polygon');

// Solana Support uses the exact same Developer Experience
import { OrbyteSolana } from '@orbytejs/solana';

const solApp = new OrbyteSolana({ network: 'mainnet-beta' });
const balance = await solApp.account.balance('vines1vzr...');
```

---

## Plugin System

Orbyte is infinitely extensible. Build your own plugins or use built-in ones like the Moralis Plugin to instantly query indexed blockchain data.

```javascript
import { moralisPlugin } from '@orbytejs/plugin-moralis';

const app = new Orbyte({
  chain: 'ethereum',
  plugins: [moralisPlugin({ apiKey: process.env.MORALIS_API_KEY })]
});

// Fetch all NFTs and tokens in one line!
const nfts = await app.moralis.getWalletNFTs('0xd8dA...');
```

---

## Why Orbyte?

| Feature | Raw viem | ethers.js | **Orbyte** |
|:--------|:---------|:----------|:----------|
| Lines to read a contract | ~15 | ~10 | **3** |
| Human-readable amounts | ❌ | ❌ | ✅ |
| Native API Server | ❌ | ❌ | ✅ |
| Decentralized Swarm (P2P)| ❌ | ❌ | ✅ |
| Native AI Agent Tools | ❌ | ❌ | ✅ |
| OPM CLI / Scaffolding | ❌ | ❌ | ✅ |

---

## License

MIT
