import { env } from '../../config/env';
import { AppError } from '../../errors';

class FakestoreClient {
  private baseUrl: string;
  private timeoutMs: number;
  private retryAttempts: number;
  private retryBackoffMs: number;

  constructor() {
    this.baseUrl = env.FAKESTORE_BASE_URL;
    this.timeoutMs = env.FAKESTORE_TIMEOUT_MS;
    this.retryAttempts = env.FAKESTORE_RETRY_ATTEMPTS;
    this.retryBackoffMs = env.FAKESTORE_RETRY_BACKOFF_MS;
  }

  async fetch(path: string): Promise<any> {
    let lastError: Error | unknown = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        // Wait before retry (except on first attempt)
        if (attempt > 0) {
          const backoffMs = this.retryBackoffMs * Math.pow(2, attempt - 1);
          await this.sleep(backoffMs);
        }

        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Don't retry on 4xx errors
          if (response.status >= 400 && response.status < 500) {
            const data = await response.json().catch(() => ({}));
            throw new AppError(
              `FakeStore API error: ${response.status}`,
              response.status
            );
          }

          // Retry on 5xx
          if (response.status >= 500) {
            lastError = new Error(`HTTP ${response.status}`);
            continue;
          }

          // Success
          return await response.json();
        } catch (error: any) {
          clearTimeout(timeoutId);

          // If it's an AbortError (timeout), we should retry
          if (error.name === 'AbortError') {
            lastError = new Error('Request timeout');
            continue;
          }

          // Network errors should retry
          if (error.message && (error.message.includes('ECONNREFUSED') ||
              error.message.includes('ETIMEDOUT') ||
              error.message.includes('EHOSTUNREACH'))) {
            lastError = error;
            continue;
          }

          // If it's already an AppError, throw it
          if (error instanceof AppError) {
            throw error;
          }

          // Other errors should retry
          lastError = error;
          continue;
        }
      } catch (error) {
        lastError = error;
        // Don't retry on 4xx
        if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
      }
    }

    // All retries exhausted
    let errorMessage = 'Unknown error';
    if (lastError instanceof Error) {
      errorMessage = lastError.message;
    } else if (lastError && typeof lastError === 'object' && 'message' in lastError) {
      errorMessage = (lastError as any).message;
    }
    throw new AppError(
      `FakeStore API request failed after ${this.retryAttempts} attempts: ${errorMessage}`,
      502
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const fakestoreClient = new FakestoreClient();
