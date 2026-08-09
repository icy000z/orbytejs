/**
 * Orbyte CLI — Project scaffolding and developer tools.
 *
 * Usage:
 *   npx orbyte create my-dapp
 *   npx orbyte create my-dapp --template token-launch
 *   npx orbyte info
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const program = new Command();

const VERSION = '0.1.0';

const LOGO = `
${chalk.hex('#7C3AED')('╔══════════════════════════════════════╗')}
${chalk.hex('#7C3AED')('║')}  ${chalk.bold.hex('#A78BFA')('⚡ Orbyte')} ${chalk.dim('— Web3 Made Simple')}       ${chalk.hex('#7C3AED')('║')}
${chalk.hex('#7C3AED')('╚══════════════════════════════════════╝')}
`;

program
  .name('opm')
  .description('Orbyte Package Manager - Install plugins, contracts, and scaffold projects')
  .version(VERSION)
  .addHelpText('before', LOGO);

// ── Create Command ──────────────────────────────────────────────────

program
  .command('create <project-name>')
  .description('Create a new Orbyte Web3 project')
  .option('-t, --template <template>', 'Project template', 'dapp-vanilla')
  .action((projectName: string, options: { template: string }) => {
    const projectDir = resolve(process.cwd(), projectName);

    if (existsSync(projectDir)) {
      console.error(chalk.red(`✖ Directory "${projectName}" already exists.`));
      process.exit(1);
    }

    console.log(LOGO);
    console.log(chalk.hex('#A78BFA')(`Creating project: ${chalk.bold(projectName)}`));
    console.log(chalk.dim(`Template: ${options.template}\n`));

    // Create directory structure
    mkdirSync(join(projectDir, 'src'), { recursive: true });
    mkdirSync(join(projectDir, 'contracts'), { recursive: true });

    const isServer = options.template === 'express' || options.template === 'backend' || options.template === 'server';

    // package.json
    writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
      name: projectName,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      } : isServer ? {
        dev: 'node --watch src/index.js',
        start: 'node src/index.js',
      } : {
        dev: 'node --watch src/index.js',
        start: 'node src/index.js',
      },
      dependencies: isServer ? {
        orbyte: '^0.1.0',
        '@orbytejs/server': '^0.1.0'
      } : {
        orbyte: '^0.1.0',
      }
    }, null, 2));

    // .env
    writeFileSync(join(projectDir, '.env'), [
      '# Orbyte Configuration',
      'PRIVATE_KEY=your_private_key_here',
      'RPC_URL=',
      'ETHERSCAN_API_KEY=',
    ].join('\n'));

    // .gitignore
    writeFileSync(join(projectDir, '.gitignore'), [
      'node_modules/', 'dist/', '.env', '.env.local', '.DS_Store',
    ].join('\n'));

    // Main entry file
    writeFileSync(join(projectDir, 'src', 'index.js'), getTemplate(options.template, projectName));

    console.log(chalk.green('✔ Project created successfully!\n'));
    console.log(chalk.dim('Next steps:'));
    console.log(`  ${chalk.cyan(`cd ${projectName}`)}`);
    console.log(`  ${chalk.cyan('npm install')}`);
    console.log(`  ${chalk.cyan('npm run dev')}\n`);
    console.log(chalk.dim('📖 Docs: https://github.com/icy000z/orbyte'));
  });

// ── Install Command (OPM) ───────────────────────────────────────────

program
  .command('install <package>')
  .alias('i')
  .description('Install a Orbyte plugin or smart contract template')
  .action((pkg: string) => {
    console.log(LOGO);
    
    // Check if it's a known Orbyte plugin
    const plugins = ['plugin-moralis', 'plugin-ens', 'plugin-ipfs'];
    const isPlugin = plugins.includes(pkg) || plugins.includes(`plugin-${pkg}`);
    
    if (isPlugin) {
      const fullPkgName = pkg.startsWith('plugin-') ? pkg : `plugin-${pkg}`;
      console.log(chalk.cyan(`Installing Orbyte Plugin: @orbytejs/${fullPkgName}...\n`));
      
      // Simulate npm install for the plugin
      import('node:child_process').then(({ execSync }) => {
        try {
          execSync(`npm install @orbytejs/${fullPkgName}`, { stdio: 'inherit' });
          console.log(chalk.green(`\n✔ Successfully installed @orbytejs/${fullPkgName}`));
          console.log(chalk.dim(`\nTo use it, add it to your OrbyteServer config:`));
          console.log(chalk.gray(`
  import { ${fullPkgName.replace('plugin-', '')}Plugin } from '@orbytejs/${fullPkgName}';
  
  const app = new OrbyteServer({
    chain: 'ethereum',
    plugins: [${fullPkgName.replace('plugin-', '')}Plugin()]
  });
          `));
        } catch (e) {
          console.error(chalk.red('\n✖ Failed to install plugin.'));
        }
      });
      return;
    }

    // Check if it's a known Smart Contract template
    const contracts = ['erc20', 'erc721', 'erc1155'];
    if (contracts.includes(pkg.toLowerCase())) {
      console.log(chalk.cyan(`Downloading Smart Contract Template: ${pkg.toUpperCase()}...\n`));
      
      const contractsDir = join(process.cwd(), 'contracts');
      if (!existsSync(contractsDir)) {
        mkdirSync(contractsDir, { recursive: true });
      }

      const contractCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/${pkg.toUpperCase()}/${pkg.toUpperCase()}.sol";

contract My${pkg.toUpperCase()} is ${pkg.toUpperCase()} {
    constructor() ${pkg.toUpperCase()}("MyToken", "MTK") {
        // Initialization logic here
    }
}
      `.trim();

      writeFileSync(join(contractsDir, `My${pkg.toUpperCase()}.sol`), contractCode);
      console.log(chalk.green(`✔ Created contracts/My${pkg.toUpperCase()}.sol`));
      console.log(chalk.dim(`\nYou can interact with this contract using Orbyte's Agent API:`));
      console.log(chalk.gray(`  const tools = app.agent.generateContractTools('My${pkg.toUpperCase()}', address, abi);`));
      return;
    }

    console.log(chalk.red(`✖ Unknown Orbyte package or template: ${pkg}`));
    console.log(chalk.dim(`Try one of these:\n  - opm install moralis\n  - opm install erc20\n  - opm install erc721`));
  });

// ── Info Command ────────────────────────────────────────────────────

program
  .command('info')
  .description('Display Orbyte environment info')
  .action(() => {
    console.log(LOGO);
    console.log(`  ${chalk.dim('Version:')}    ${VERSION}`);
    console.log(`  ${chalk.dim('Node:')}       ${process.version}`);
    console.log(`  ${chalk.dim('Platform:')}   ${process.platform}`);
    console.log(`  ${chalk.dim('Arch:')}       ${process.arch}\n`);
  });

// ── Chains Command ──────────────────────────────────────────────────

program
  .command('chains')
  .description('List all supported chains')
  .action(() => {
    console.log(LOGO);
    console.log(chalk.bold('  Supported Chains:\n'));
    const chains = [
      ['ethereum', '1', 'Ethereum Mainnet'],
      ['sepolia', '11155111', 'Ethereum Sepolia Testnet'],
      ['polygon', '137', 'Polygon Mainnet'],
      ['polygon-amoy', '80002', 'Polygon Amoy Testnet'],
      ['arbitrum', '42161', 'Arbitrum One'],
      ['optimism', '10', 'OP Mainnet'],
      ['base', '8453', 'Base Mainnet'],
      ['bsc', '56', 'BNB Smart Chain'],
      ['avalanche', '43114', 'Avalanche C-Chain'],
      ['linea', '59144', 'Linea Mainnet'],
      ['zksync', '324', 'zkSync Era'],
      ['fantom', '250', 'Fantom Opera'],
      ['celo', '42220', 'Celo Mainnet'],
      ['gnosis', '100', 'Gnosis Chain'],
    ];

    for (const [name, id, desc] of chains) {
      console.log(`  ${chalk.hex('#A78BFA')(name.padEnd(20))} ${chalk.dim(`ID: ${id}`.padEnd(16))} ${desc}`);
    }
    console.log();
  });

program.parse();

// ── Templates ───────────────────────────────────────────────────────

function getTemplate(template: string, _name: string): string {
  if (template === 'express' || template === 'backend' || template === 'server') {
    return `import { OrbyteServer } from '@orbytejs/server';
import fs from 'node:fs';

// ⚡ Initialize your ultra-secure Web3 Backend
// Choose between 'normal' (traditional REST API) or 'decentralized' (P2P swarm)
const app = new OrbyteServer({
  chain: 'ethereum',
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  env: process.env.NODE_ENV as 'production' | 'development' || 'development',
  mode: 'normal', // Change to 'decentralized' to join a P2P network
  
  // Provide SSL certificates for production
  ssl: process.env.NODE_ENV === 'production' ? {
    key: fs.readFileSync('./certs/privkey.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
  } : undefined
});

// Example API Route
app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;
  const balance = await req.orbyte.wallet.balanceOf(address);
  
  res.json({
    address,
    balance: balance.formatted,
    symbol: balance.symbol
  });
});

// Start the server
app.listen();
`;
  }

  }

  if (template === 'token-launch') {
    return `import { Orbyte } from 'orbytejs';

// Initialize Orbyte on Ethereum
const app = new Orbyte({
  chain: 'ethereum',
  privateKey: process.env.PRIVATE_KEY,
});

// Your ERC20 token address (deploy first, then paste here)
const TOKEN_ADDRESS = '0xYOUR_TOKEN_ADDRESS';

async function main() {
  const token = app.tokens.erc20(TOKEN_ADDRESS);
  const info = await token.info();

  console.log('Token Info:');
  console.log(\`  Name:         \${info.name}\`);
  console.log(\`  Symbol:       \${info.symbol}\`);
  console.log(\`  Decimals:     \${info.decimals}\`);
  console.log(\`  Total Supply: \${info.totalSupply}\`);
}

main().catch(console.error);
`;
  }

  // Default: dapp-vanilla
  return `import { Orbyte } from 'orbytejs';

// ⚡ Initialize Orbyte — pick your chain
const app = new Orbyte({ chain: 'ethereum' });

async function main() {
  // Get chain info
  const blockNumber = await app.chain.blockNumber();
  const gasPrice = await app.chain.gasPrice();

  console.log('⚡ Orbyte — Web3 Made Simple');
  console.log('═'.repeat(40));
  console.log(\`  Chain:     \${app.chain.name}\`);
  console.log(\`  Block:     \${blockNumber}\`);
  console.log(\`  Gas Price: \${gasPrice.gwei} gwei\`);

  // Read any wallet's balance (no wallet connection needed!)
  const vitalik = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  const balance = await app.wallet.balanceOf(vitalik);
  console.log(\`\\n  Vitalik's Balance: \${balance.formatted} \${balance.symbol}\`);

  // Interact with tokens
  const usdc = app.tokens.erc20('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  const info = await usdc.info();
  console.log(\`\\n  USDC Info: \${info.name} (\${info.symbol})\`);
  console.log(\`  Total Supply: \${info.totalSupply}\`);
}

main().catch(console.error);
`;
}
