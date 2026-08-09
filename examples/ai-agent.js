import { Orbyte } from '../packages/core/dist/index.js';

const app = new Orbyte({ chain: 'ethereum', debug: false });

async function runAgent() {
  console.log('🤖 Initializing Orbyte AI Agent Interface...\n');

  // 1. Get the JSON schemas that you would pass to OpenAI or Anthropic
  const tools = app.agent.getCoreTools();
  console.log('📦 Exported Function Tools for LLM:');
  console.log(JSON.stringify(tools, null, 2));

  console.log('\n' + '='.repeat(50) + '\n');

  // 2. Simulate the AI Agent receiving a prompt and deciding to call the tool
  console.log('🧠 AI Agent Prompt: "Check the Ethereum balance of Vitalik Buterin (0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)"');
  console.log('⚡ AI Agent executing tool: [get_wallet_balance]...');
  
  const result = await app.agent.executeTool('get_wallet_balance', { 
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' 
  });
  
  console.log(`\n🎯 AI Agent Result -> ${result}`);
}

runAgent().catch(console.error);
