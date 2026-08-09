/**
 * Orbyte — Utility Functions
 *
 * Human-readable value parsing, formatting, and shared helpers.
 */

import { formatEther, formatGwei, formatUnits, parseEther, parseGwei, parseUnits } from 'viem';

/**
 * Parse a human-readable value string into wei (bigint).
 *
 * Supports formats like:
 *   - "1.5 eth"     → 1500000000000000000n
 *   - "100 gwei"    → 100000000000n
 *   - "1000000"     → 1000000n (raw wei)
 *   - "0.5"         → treated as ether
 *
 * @example
 * ```ts
 * parseValue("1.5 eth")    // 1500000000000000000n
 * parseValue("100 gwei")   // 100000000000n
 * parseValue("1000000")    // 1000000n
 * ```
 */
export function parseValue(value: string | bigint): bigint {
  if (typeof value === 'bigint') return value;

  const trimmed = value.trim().toLowerCase();

  // "1.5 eth" or "1.5 ether"
  const ethMatch = trimmed.match(/^([\d.]+)\s*(eth|ether)$/);
  if (ethMatch) return parseEther(ethMatch[1]);

  // "100 gwei"
  const gweiMatch = trimmed.match(/^([\d.]+)\s*gwei$/);
  if (gweiMatch) return parseGwei(gweiMatch[1]);

  // "1000 wei"
  const weiMatch = trimmed.match(/^(\d+)\s*wei$/);
  if (weiMatch) return BigInt(weiMatch[1]);

  // Plain number — if it has a decimal, treat as ether; otherwise as wei
  if (/^[\d.]+$/.test(trimmed)) {
    if (trimmed.includes('.')) {
      return parseEther(trimmed);
    }
    return BigInt(trimmed);
  }

  throw new OrbyteParseError(
    `Cannot parse value "${value}". Use formats like "1.5 eth", "100 gwei", or a raw bigint.`
  );
}

/**
 * Format a wei value into a human-readable string.
 *
 * @example
 * ```ts
 * formatValue(1500000000000000000n)  // "1.5"
 * formatValue(1500000000000000000n, "ETH")  // "1.5 ETH"
 * ```
 */
export function formatValue(wei: bigint, symbol?: string): string {
  const formatted = formatEther(wei);
  // Trim trailing zeros but keep at least one decimal
  const clean = trimDecimals(formatted);
  return symbol ? `${clean} ${symbol}` : clean;
}

/**
 * Format a token amount with custom decimals.
 *
 * @example
 * ```ts
 * formatTokenAmount(1000000n, 6)  // "1.0"
 * formatTokenAmount(1500000n, 6)  // "1.5"
 * ```
 */
export function formatTokenAmount(raw: bigint, decimals: number): string {
  const formatted = formatUnits(raw, decimals);
  return trimDecimals(formatted);
}

/**
 * Parse a human-readable token amount into raw units.
 *
 * @example
 * ```ts
 * parseTokenAmount("100.50", 6)  // 100500000n
 * parseTokenAmount("1.0", 18)    // 1000000000000000000n
 * ```
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

/**
 * Format gas price in gwei.
 */
export function formatGasPrice(wei: bigint): string {
  return trimDecimals(formatGwei(wei));
}

/**
 * Trim unnecessary trailing zeros from a decimal string.
 * "1.500000" → "1.5"
 * "1.000000" → "1.0"
 * "100" → "100"
 */
function trimDecimals(value: string): string {
  if (!value.includes('.')) return value;
  // Remove trailing zeros but keep at least one decimal digit
  const trimmed = value.replace(/0+$/, '');
  if (trimmed.endsWith('.')) return trimmed + '0';
  return trimmed;
}

/**
 * Shorten an address for display: 0x1234...abcd
 */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number; backoff?: number } = {},
): Promise<T> {
  const { attempts = 3, delayMs = 1000, backoff = 2 } = options;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await sleep(delayMs * Math.pow(backoff, i));
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error('Retry exhausted');
}

/** Custom error for parsing issues */
export class OrbyteParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrbyteParseError';
  }
}
