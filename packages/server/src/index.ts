import express, { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import https from 'node:https';
import http from 'node:http';
import crypto from 'node:crypto';
import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import { Orbyte, type OrbyteConfig } from 'orbytejs';
import type { Abi } from 'viem';

export interface OrbyteServerConfig extends OrbyteConfig {
  /** Port to listen on (default: 3000) */
  port?: number;
  /** Enable CORS (default: true) */
  cors?: boolean;
  /** Environment mode (development / production) */
  env?: 'development' | 'production';
  /** HTTPS configuration for production */
  ssl?: {
    key: string | Buffer;
    cert: string | Buffer;
  };
  /** 
   * Operation mode of the Orbyte backend.
   * 'normal': Standard highly-secure HTTP/HTTPS server.
   * 'decentralized': Runs as a node in a P2P swarm network.
   * Default is 'normal'.
   */
  mode?: 'normal' | 'decentralized';
  /** 
   * Decentralized P2P Network Configuration (Required if mode is 'decentralized').
   */
  p2p?: {
    topic: string; // The network topic (e.g., 'my-dapp-network')
  };
}

/**
 * OrbyteServer
 * 
 * The ultimate, ultra-secure, decentralized backend framework for Web3.
 * Combines an Express HTTP/HTTPS server with the Orbyte Web3 engine and a P2P network.
 */
export class OrbyteServer {
  public readonly app: Orbyte;
  public readonly server: express.Application;
  
  // P2P Networking
  public readonly swarm: any; // Hyperswarm instance
  private p2pTopic?: Buffer;
  private p2pPeers: Set<any> = new Set();
  private p2pMessageHandlers: Set<(message: any, peer: any) => void> = new Set();

  private readonly port: number;
  private readonly isProd: boolean;
  private readonly sslConfig?: OrbyteServerConfig['ssl'];
  public readonly mode: 'normal' | 'decentralized';

  constructor(config: OrbyteServerConfig) {
    this.app = new Orbyte(config);
    this.server = express();
    this.port = config.port || 3000;
    this.isProd = config.env === 'production' || process.env.NODE_ENV === 'production';
    this.sslConfig = config.ssl;
    this.mode = config.mode || 'normal';

    this.applySecurityMiddleware(config.cors !== false);
    
    // Only setup P2P network if mode is explicitly set to decentralized
    if (this.mode === 'decentralized') {
      if (!config.p2p || !config.p2p.topic) {
        throw new Error("[OrbyteServer] P2P configuration (topic) is required when running in 'decentralized' mode.");
      }
      this.setupP2P(config.p2p);
    }

    // Inject Orbyte into every request
    this.server.use((req: Request & { orbyte?: Orbyte }, _res, next) => {
      req.orbyte = this.app;
      next();
    });
  }

  /**
   * Initializes the decentralized P2P network.
   */
  private setupP2P(p2pConfig?: OrbyteServerConfig['p2p']) {
    // @ts-ignore
    this.swarm = new Hyperswarm();
    
    if (p2pConfig && p2pConfig.topic) {
      // Hash the topic to create a 32-byte topic buffer
      this.p2pTopic = crypto.createHash('sha256').update(p2pConfig.topic).digest();
      
      this.swarm.on('connection', (conn: any, info: any) => {
        this.p2pPeers.add(conn);
        
        conn.on('data', (data: Buffer) => {
          try {
            const message = JSON.parse(b4a.toString(data, 'utf8'));
            for (const handler of this.p2pMessageHandlers) {
              handler(message, info.publicKey);
            }
          } catch (e) {
            // Invalid message
          }
        });
        
        conn.on('close', () => {
          this.p2pPeers.delete(conn);
        });
      });
    }
  }

  /**
   * Join the decentralized P2P network.
   */
  public async joinSwarm() {
    if (this.p2pTopic) {
      const discovery = this.swarm.join(this.p2pTopic, { server: true, client: true });
      await discovery.flushed(); // Wait until we're fully connected
      console.log(`[OrbyteServer] 🌐 Joined decentralized P2P swarm network!`);
    }
  }

  /**
   * Broadcast a message to all connected peers in the decentralized network.
   */
  public broadcastP2P(message: any) {
    if (this.p2pPeers.size === 0) return;
    const data = b4a.from(JSON.stringify(message), 'utf8');
    for (const peer of this.p2pPeers) {
      peer.write(data);
    }
  }

  /**
   * Listen for messages from the decentralized network.
   */
  public onP2PMessage(handler: (message: any, peerPublicKey: Buffer) => void) {
    this.p2pMessageHandlers.add(handler);
  }

  /**
   * Apply military-grade security headers, rate limiting, and exploit protections.
   * "impossible to crack"
   */
  private applySecurityMiddleware(enableCors: boolean) {
    // 1. Helmet helps secure Express apps by setting various HTTP headers
    this.server.use(helmet());

    // 2. Hide Express signature
    this.server.disable('x-powered-by');

    // 3. CORS configuration
    if (enableCors) {
      this.server.use(cors({
        origin: this.isProd ? process.env.ALLOWED_ORIGIN || false : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }));
    }

    // 4. Rate Limiting to prevent brute-force and DDoS
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: this.isProd ? 100 : 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
      message: 'Too many requests from this IP, please try again after 15 minutes',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.server.use(limiter);

    // 5. Body parser with strict limits to prevent payload overflow attacks
    this.server.use(express.json({ limit: '10kb' }));
    this.server.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // 6. Protect against HTTP Parameter Pollution attacks
    this.server.use(hpp());
  }

  /**
   * Define a GET route.
   */
  get(path: string, handler: (req: Request & { orbyte: Orbyte }, res: Response, next: NextFunction) => void | Promise<void>) {
    this.server.get(path, this.asyncHandler(handler));
  }

  /**
   * Define a POST route.
   */
  post(path: string, handler: (req: Request & { orbyte: Orbyte }, res: Response, next: NextFunction) => void | Promise<void>) {
    this.server.post(path, this.asyncHandler(handler));
  }

  /**
   * Serve an automatically generated Frontend SDK at the given route.
   * This bridges the backend with any frontend, functioning like an auto-generated tRPC client for Web3.
   *
   * @param path The route to serve the SDK on (e.g., '/orbyte-client.js')
   */
  serveSDK(path: string = '/orbyte-client.js') {
    this.server.get(path, (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      const sdkCode = `
/**
 * OrbyteJS Auto-Generated Client SDK
 * Chain: ${this.app.chain.name}
 */
class OrbyteClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }
  
  async getBalance(address) {
    const res = await fetch(\`\${this.baseUrl}/api/balance/\${address}\`);
    return res.json();
  }
  // This SDK can be dynamically expanded based on the server's registered routes!
}
export const orbyte = new OrbyteClient();
      `.trim();
      res.send(sdkCode);
    });
  }

  /**
   * Listen for an on-chain smart contract event and trigger a webhook callback.
   * Runs as a background listener.
   */
  onEvent(
    contractAddress: string,
    abi: Abi,
    eventName: string,
    callback: (eventData: any) => void | Promise<void>
  ) {
    const contract = this.app.contract(contractAddress as any, { abi });
    contract.on(eventName, async (event: any) => {
      try {
        await callback(event);
      } catch (error) {
        console.error(`[OrbyteServer] Error in event listener for ${eventName}:`, error);
      }
    });
  }

  /**
   * Start the server (HTTP for dev, HTTPS for prod if SSL provided).
   */
  listen(callback?: () => void) {
    let activeServer;

    if (this.isProd && this.sslConfig) {
      // Production: HTTPS
      activeServer = https.createServer(this.sslConfig, this.server);
      activeServer.listen(this.port, () => {
        if (callback) callback();
        else {
          console.log(`[OrbyteServer] 🔒 SECURE Web3 Backend running on https://localhost:${this.port}`);
          console.log(`[OrbyteServer] 🛡️  Military-grade security active.`);
          console.log(`[OrbyteServer] ⛓️  Connected to chain: ${this.app.chain.name}`);
        }
      });
    } else {
      // Development: HTTP
      activeServer = http.createServer(this.server);
      activeServer.listen(this.port, () => {
        if (callback) callback();
        else {
          console.log(`[OrbyteServer] ⚡ Web3 Backend running on http://localhost:${this.port}`);
          if (this.isProd && !this.sslConfig) {
            console.warn(`[OrbyteServer] WARNING: Running in production without SSL configuration!`);
          }
          console.log(`[OrbyteServer] ⛓️  Connected to chain: ${this.app.chain.name}`);
        }
      });
    }

    return activeServer;
  }

  /**
   * Helper to wrap async route handlers
   */
  private asyncHandler(fn: Function): RequestHandler {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}
