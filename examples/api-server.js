import { OrbyteServer } from '../packages/server/dist/index.js';

const app = new OrbyteServer({ 
  chain: 'ethereum', 
  port: 8080,
  mode: 'normal'
});

app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;
  console.log(`[API] Fetching balance for ${address}...`);
  
  try {
    const balance = await req.orbyte.wallet.balanceOf(address);
    res.json({ 
      address, 
      balance: balance.formatted, 
      symbol: balance.symbol 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(() => {
  console.log('✅ Orbyte Demo API Server running at http://localhost:8080');
  console.log('👉 Try visiting: http://localhost:8080/api/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
});
