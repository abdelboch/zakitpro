/**
 * LinkedIn OAuth2 Authentication
 *
 * Implements OAuth 2.0 Authorization Code Flow for LinkedIn API access.
 *
 * Flow:
 * 1. Redirect user to LinkedIn authorization URL
 * 2. LinkedIn redirects back with authorization code
 * 3. Exchange code for access token
 * 4. Store token securely (Vercel KV)
 * 5. Refresh token before expiry
 *
 * Required scopes: w_member_social (for posting)
 * Token lifespan: 60 days
 */

export interface LinkedInTokens {
  accessToken: string;
  expiresIn: number; // seconds
  expiresAt: number; // Unix timestamp
  scope: string;
}

export interface TokenStorage {
  get(key: string): Promise<LinkedInTokens | null>;
  set(key: string, tokens: LinkedInTokens, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface LinkedInAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

/**
 * LinkedIn OAuth2 Client
 */
export class LinkedInAuth {
  private config: LinkedInAuthConfig;
  private storage: TokenStorage;

  constructor(config: LinkedInAuthConfig, storage: TokenStorage) {
    this.config = config;
    this.storage = storage;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
    });

    if (state) {
      params.set('state', state);
    }

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<LinkedInTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
    });

    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn token exchange failed: ${error}`);
    }

    const data = await response.json();

    const tokens: LinkedInTokens = {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope || this.config.scopes.join(' '),
    };

    // Store tokens
    await this.saveTokens(tokens);

    return tokens;
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.storage.get('linkedin_tokens');

    if (!tokens) {
      return null;
    }

    // Check if token is expired or will expire in next 5 minutes
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    if (Date.now() >= tokens.expiresAt - bufferTime) {
      // Token expired or about to expire
      // Note: LinkedIn doesn't provide refresh tokens in basic OAuth flow
      // User needs to re-authenticate
      await this.storage.delete('linkedin_tokens');
      return null;
    }

    return tokens.accessToken;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  /**
   * Save tokens to storage
   */
  private async saveTokens(tokens: LinkedInTokens): Promise<void> {
    // Store with TTL equal to token expiry
    const ttl = tokens.expiresIn;
    await this.storage.set('linkedin_tokens', tokens, ttl);
  }

  /**
   * Revoke tokens (logout)
   */
  async revokeTokens(): Promise<void> {
    await this.storage.delete('linkedin_tokens');
  }

  /**
   * Get token expiry info
   */
  async getTokenExpiry(): Promise<{
    expiresAt: number;
    expiresInSeconds: number;
    isExpired: boolean;
  } | null> {
    const tokens = await this.storage.get('linkedin_tokens');

    if (!tokens) {
      return null;
    }

    const now = Date.now();
    const expiresInMs = tokens.expiresAt - now;

    return {
      expiresAt: tokens.expiresAt,
      expiresInSeconds: Math.floor(expiresInMs / 1000),
      isExpired: expiresInMs <= 0,
    };
  }
}

/**
 * In-memory token storage (for development/testing)
 */
export class MemoryTokenStorage implements TokenStorage {
  private store = new Map<string, LinkedInTokens>();

  async get(key: string): Promise<LinkedInTokens | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, tokens: LinkedInTokens): Promise<void> {
    this.store.set(key, tokens);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Vercel KV token storage
 */
export class VercelKVTokenStorage implements TokenStorage {
  private kv: any; // @vercel/kv instance

  constructor(kv: any) {
    this.kv = kv;
  }

  async get(key: string): Promise<LinkedInTokens | null> {
    return await this.kv.get(key);
  }

  async set(key: string, tokens: LinkedInTokens, ttl?: number): Promise<void> {
    if (ttl) {
      await this.kv.set(key, tokens, { ex: ttl });
    } else {
      await this.kv.set(key, tokens);
    }
  }

  async delete(key: string): Promise<void> {
    await this.kv.del(key);
  }
}

/**
 * Helper: Create auth client from environment variables
 */
export function createLinkedInAuth(storage: TokenStorage): LinkedInAuth {
  const config: LinkedInAuthConfig = {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:4321/api/linkedin/callback',
    scopes: ['w_member_social', 'openid', 'profile'],
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error('LinkedIn credentials not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET');
  }

  return new LinkedInAuth(config, storage);
}
