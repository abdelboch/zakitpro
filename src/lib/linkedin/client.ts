/**
 * LinkedIn API Client
 *
 * Wrapper for LinkedIn Marketing API with rate limiting and error handling.
 *
 * API Documentation:
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 *
 * Rate Limits:
 * - 100 posts per day per user
 * - Throttling on excessive requests
 */

import type { LinkedInAuth } from './auth';

const LINKEDIN_API_BASE = 'https://api.linkedin.com';
const LINKEDIN_API_VERSION = '202411'; // YYYYMM format

export interface LinkedInPost {
  author: string; // LinkedIn URN (e.g., urn:li:person:PERSON_ID)
  commentary: string; // Post text
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN';
  distribution?: {
    feedDistribution: 'MAIN_FEED' | 'NONE';
    targetEntities?: string[];
    thirdPartyDistributionChannels?: string[];
  };
  lifecycleState?: 'PUBLISHED' | 'DRAFT';
  isReshareDisabledByAuthor?: boolean;
}

export interface LinkedInPostResponse {
  id: string; // Post URN
  author: string;
  commentary: string;
  visibility: string;
  lifecycleState: string;
  createdAt: number;
  lastModifiedAt: number;
}

export interface LinkedInProfile {
  sub: string; // LinkedIn member ID
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  locale: string;
  email?: string;
  email_verified?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

export class LinkedInAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'LinkedInAPIError';
  }
}

/**
 * LinkedIn API Client
 */
export class LinkedInClient {
  private auth: LinkedInAuth;
  private rateLimit: RateLimitInfo = {
    limit: 100,
    remaining: 100,
    reset: Date.now() + 24 * 60 * 60 * 1000,
  };

  constructor(auth: LinkedInAuth) {
    this.auth = auth;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.auth.getAccessToken();

    if (!accessToken) {
      throw new LinkedInAPIError('Not authenticated', 401);
    }

    const url = `${LINKEDIN_API_BASE}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'LinkedIn-Version': LINKEDIN_API_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Update rate limit info from headers (if provided)
    this.updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `LinkedIn API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorBody || errorMessage;
      }

      throw new LinkedInAPIError(errorMessage, response.status, errorBody);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  }

  /**
   * Update rate limit info from response headers
   */
  private updateRateLimitFromHeaders(headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (limit) this.rateLimit.limit = parseInt(limit, 10);
    if (remaining) this.rateLimit.remaining = parseInt(remaining, 10);
    if (reset) this.rateLimit.reset = parseInt(reset, 10) * 1000; // Convert to ms
  }

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<LinkedInProfile> {
    return await this.request<LinkedInProfile>('/v2/userinfo');
  }

  /**
   * Create a post (share)
   */
  async createPost(post: Omit<LinkedInPost, 'author'>): Promise<LinkedInPostResponse> {
    // Get user profile to get author URN
    const profile = await this.getProfile();
    const author = `urn:li:person:${profile.sub}`;

    const fullPost: LinkedInPost = {
      author,
      ...post,
      visibility: post.visibility || 'PUBLIC',
      lifecycleState: post.lifecycleState || 'PUBLISHED',
      distribution: post.distribution || {
        feedDistribution: 'MAIN_FEED',
      },
    };

    return await this.request<LinkedInPostResponse>('/rest/posts', {
      method: 'POST',
      body: JSON.stringify(fullPost),
    });
  }

  /**
   * Create a simple text post
   */
  async postText(text: string, visibility: LinkedInPost['visibility'] = 'PUBLIC'): Promise<LinkedInPostResponse> {
    return await this.createPost({
      commentary: text,
      visibility,
    });
  }

  /**
   * Get post by ID
   */
  async getPost(postId: string): Promise<LinkedInPostResponse> {
    // Extract ID from URN if needed
    const id = postId.replace('urn:li:share:', '');
    return await this.request<LinkedInPostResponse>(`/rest/posts/${id}`);
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    const id = postId.replace('urn:li:share:', '');
    await this.request<void>(`/rest/posts/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimit };
  }

  /**
   * Check if approaching rate limit
   */
  isApproachingRateLimit(threshold: number = 10): boolean {
    return this.rateLimit.remaining <= threshold;
  }

  /**
   * Wait for rate limit reset if needed
   */
  async waitForRateLimit(): Promise<void> {
    if (this.rateLimit.remaining === 0) {
      const now = Date.now();
      const waitTime = Math.max(0, this.rateLimit.reset - now);

      if (waitTime > 0) {
        console.warn(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s until reset...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (except 429 rate limit)
        if (error instanceof LinkedInAPIError) {
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            throw error;
          }

          // Handle rate limiting
          if (error.status === 429) {
            await this.waitForRateLimit();
            continue;
          }
        }

        // Exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`Request failed. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Post with automatic retry
   */
  async postTextWithRetry(text: string, visibility: LinkedInPost['visibility'] = 'PUBLIC'): Promise<LinkedInPostResponse> {
    return await this.retryWithBackoff(() => this.postText(text, visibility));
  }
}

/**
 * Helper: Create LinkedIn client from auth
 */
export function createLinkedInClient(auth: LinkedInAuth): LinkedInClient {
  return new LinkedInClient(auth);
}
