/**
 * Orbyte — Error Classes
 *
 * Structured error types for better error handling and debugging.
 */

/** Base error class for all Orbyte errors */
export class OrbyteError extends Error {
  public readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OrbyteError';
    this.code = code;
  }
}

/** Wallet not connected or not available */
export class WalletError extends OrbyteError {
  constructor(message: string, options?: ErrorOptions) {
    super('WALLET_ERROR', message, options);
    this.name = 'WalletError';
  }
}

/** Contract call failed */
export class ContractError extends OrbyteError {
  public readonly contractAddress: string;
  public readonly functionName?: string;

  constructor(
    message: string,
    contractAddress: string,
    functionName?: string,
    options?: ErrorOptions,
  ) {
    super('CONTRACT_ERROR', message, options);
    this.name = 'ContractError';
    this.contractAddress = contractAddress;
    this.functionName = functionName;
  }
}

/** Transaction failed */
export class TransactionError extends OrbyteError {
  public readonly hash?: string;

  constructor(message: string, hash?: string, options?: ErrorOptions) {
    super('TX_ERROR', message, options);
    this.name = 'TransactionError';
    this.hash = hash;
  }
}

/** Configuration error */
export class ConfigError extends OrbyteError {
  constructor(message: string, options?: ErrorOptions) {
    super('CONFIG_ERROR', message, options);
    this.name = 'ConfigError';
  }
}

/** Plugin error */
export class PluginError extends OrbyteError {
  public readonly pluginName: string;

  constructor(pluginName: string, message: string, options?: ErrorOptions) {
    super('PLUGIN_ERROR', `[${pluginName}] ${message}`, options);
    this.name = 'PluginError';
    this.pluginName = pluginName;
  }
}
