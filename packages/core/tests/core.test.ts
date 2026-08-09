/**
 * Orbyte — Unit Tests
 *
 * Tests for utility functions and core module instantiation.
 */

import { describe, it, expect } from 'vitest';
import { parseValue, formatValue, formatTokenAmount, parseTokenAmount, shortenAddress } from '../src/utils.js';
import { resolveChain, supportedChains, getChainName } from '../src/chains.js';
import { Orbyte } from '../src/orbyte.js';

// ── Value Parsing ───────────────────────────────────────────────────

describe('parseValue', () => {
  it('parses ether values', () => {
    expect(parseValue('1 eth')).toBe(1000000000000000000n);
    expect(parseValue('0.5 eth')).toBe(500000000000000000n);
    expect(parseValue('1.5 ether')).toBe(1500000000000000000n);
  });

  it('parses gwei values', () => {
    expect(parseValue('100 gwei')).toBe(100000000000n);
    expect(parseValue('25.5 gwei')).toBe(25500000000n);
  });

  it('parses wei values', () => {
    expect(parseValue('1000000 wei')).toBe(1000000n);
  });

  it('parses plain numbers', () => {
    // Plain integer → wei
    expect(parseValue('1000000')).toBe(1000000n);
    // Decimal → ether
    expect(parseValue('1.5')).toBe(1500000000000000000n);
  });

  it('passes through bigints', () => {
    expect(parseValue(42n)).toBe(42n);
  });

  it('throws on invalid values', () => {
    expect(() => parseValue('hello')).toThrow();
    expect(() => parseValue('abc eth')).toThrow();
  });
});

// ── Value Formatting ────────────────────────────────────────────────

describe('formatValue', () => {
  it('formats wei to ether', () => {
    expect(formatValue(1000000000000000000n)).toBe('1.0');
    expect(formatValue(1500000000000000000n)).toBe('1.5');
  });

  it('includes symbol if provided', () => {
    expect(formatValue(1000000000000000000n, 'ETH')).toBe('1.0 ETH');
  });
});

// ── Token Amount Formatting ─────────────────────────────────────────

describe('formatTokenAmount', () => {
  it('formats with custom decimals', () => {
    expect(formatTokenAmount(1000000n, 6)).toBe('1.0');
    expect(formatTokenAmount(1500000n, 6)).toBe('1.5');
    expect(formatTokenAmount(100000000000000000000n, 18)).toBe('100.0');
  });
});

describe('parseTokenAmount', () => {
  it('parses human amounts to raw units', () => {
    expect(parseTokenAmount('100.0', 6)).toBe(100000000n);
    expect(parseTokenAmount('1.5', 18)).toBe(1500000000000000000n);
  });
});

// ── Address Shortening ──────────────────────────────────────────────

describe('shortenAddress', () => {
  it('shortens addresses', () => {
    const addr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    expect(shortenAddress(addr)).toBe('0xd8dA...6045');
  });

  it('handles custom char count', () => {
    const addr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    expect(shortenAddress(addr, 6)).toBe('0xd8dA6B...A96045');
  });
});

// ── Chain Resolution ────────────────────────────────────────────────

describe('resolveChain', () => {
  it('resolves chain names', () => {
    const chain = resolveChain('ethereum');
    expect(chain.id).toBe(1);
    expect(chain.name).toBe('Ethereum');
  });

  it('resolves polygon', () => {
    const chain = resolveChain('polygon');
    expect(chain.id).toBe(137);
  });

  it('resolves arbitrum', () => {
    const chain = resolveChain('arbitrum');
    expect(chain.id).toBe(42161);
  });

  it('throws on unknown chain', () => {
    expect(() => resolveChain('fakenet' as never)).toThrow('Unknown chain');
  });

  it('passes through chain objects', () => {
    const customChain = { id: 999, name: 'Custom', nativeCurrency: { name: 'TEST', symbol: 'TST', decimals: 18 }, rpcUrls: { default: { http: ['http://localhost'] } } };
    expect(resolveChain(customChain as never).id).toBe(999);
  });
});

describe('supportedChains', () => {
  it('returns all chain names', () => {
    const chains = supportedChains();
    expect(chains).toContain('ethereum');
    expect(chains).toContain('polygon');
    expect(chains).toContain('base');
    expect(chains.length).toBeGreaterThan(10);
  });
});

describe('getChainName', () => {
  it('reverse-resolves chain objects', () => {
    const chain = resolveChain('ethereum');
    expect(getChainName(chain)).toBe('ethereum');
  });
});

// ── Orbyte Instance ──────────────────────────────────────────────────

describe('Orbyte', () => {
  it('creates an instance with chain name', () => {
    const app = new Orbyte({ chain: 'ethereum' });
    expect(app.chain.id).toBe(1);
    expect(app.chain.name).toBe('Ethereum');
    expect(app.wallet.isConnected).toBe(false);
  });

  it('creates an instance with different chains', () => {
    const polygon = new Orbyte({ chain: 'polygon' });
    expect(polygon.chain.id).toBe(137);

    const base = new Orbyte({ chain: 'base' });
    expect(base.chain.id).toBe(8453);
  });

  it('exposes all modules', () => {
    const app = new Orbyte({ chain: 'sepolia' });
    expect(app.wallet).toBeDefined();
    expect(app.contract).toBeDefined();
    expect(app.tokens).toBeDefined();
    expect(app.nft).toBeDefined();
    expect(app.tx).toBeDefined();
    expect(app.chain).toBeDefined();
  });

  it('provides info', () => {
    const app = new Orbyte({ chain: 'ethereum' });
    const info = app.info();
    expect(info.chain).toBe('ethereum');
    expect(info.chainId).toBe(1);
    expect(info.walletConnected).toBe(false);
    expect(info.plugins).toEqual([]);
  });

  it('switches chains', () => {
    const app = new Orbyte({ chain: 'ethereum' });
    expect(app.chain.id).toBe(1);

    app.switchChain('polygon');
    expect(app.chain.id).toBe(137);
  });

  it('creates ERC20 token instance', () => {
    const app = new Orbyte({ chain: 'ethereum' });
    const usdc = app.tokens.erc20('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(usdc.address).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  });

  it('creates NFT instance', () => {
    const app = new Orbyte({ chain: 'ethereum' });
    const nft = app.nft('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D');
    expect(nft.address).toBe('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D');
  });

  it('installs plugins', async () => {
    const app = new Orbyte({ chain: 'ethereum' });
    const testPlugin = {
      name: 'test-plugin',
      install(appInstance: { extend: (ns: string, methods: unknown) => void }) {
        appInstance.extend('test', { hello: () => 'world' });
      },
    };

    await app.use(testPlugin);
    const info = app.info();
    expect(info.plugins).toContain('test-plugin');
  });

  it('rejects duplicate plugins', async () => {
    const app = new Orbyte({ chain: 'ethereum' });
    const plugin = { name: 'dupe', install() {} };
    await app.use(plugin);
    await expect(app.use(plugin)).rejects.toThrow('already installed');
  });
});
