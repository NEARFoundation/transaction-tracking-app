import { Mutex } from 'async-mutex';

const RATE_LIMIT = 10; // number of tokens per second
const BUCKET_SIZE = 20; // maximum number of tokens in the bucket
const REFILL_INTERVAL = 1000; // in milliseconds

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private mutex: Mutex;

  constructor() {
    this.tokens = BUCKET_SIZE;
    this.lastRefill = Date.now();
    this.mutex = new Mutex();
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= REFILL_INTERVAL) {
      const tokensToAdd = Math.floor((elapsed * RATE_LIMIT) / REFILL_INTERVAL);
      this.tokens = Math.min(this.tokens + tokensToAdd, BUCKET_SIZE);
      this.lastRefill = now;
    }
  }

  async acquireToken(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      while (this.tokens === 0) {
        await new Promise((resolve) => setTimeout(resolve, REFILL_INTERVAL));
        this.refillTokens();
      }
      this.tokens -= 1;
    });
  }
}
