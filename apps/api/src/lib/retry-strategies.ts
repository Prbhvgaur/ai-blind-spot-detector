/**
 * Intelligent backoff strategies optimized for LLM provider rate limits
 * Uses exponential backoff + full jitter to avoid thundering herd
 */

interface BackoffConfig {
  attempt: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

/**
 * Full Jitter Algorithm (AWS recommended)
 * Random value between 0 and exponential(attempt)
 * Prevents thundering herd on retry storms
 */
export const fullJitterBackoff = (config: BackoffConfig): number => {
  const { attempt, baseDelay, maxDelay } = config;
  
  // Exponential: 2^attempt (e.g., 2, 4, 8, 16, ...)
  const exponential = Math.pow(2, attempt - 1) * baseDelay;
  
  // Clamp to max
  const capped = Math.min(exponential, maxDelay);
  
  // Full jitter: random between 0 and capped
  const jittered = Math.random() * capped;
  
  return Math.ceil(jittered);
};

/**
 * Decorrelated Jitter Algorithm
 * Better for cascading failures; maintains some exponential growth
 */
export const decorrelatedJitterBackoff = (
  config: BackoffConfig & { previousDelay: number }
): number => {
  const { attempt, baseDelay, maxDelay, previousDelay } = config;
  
  const exponential = Math.pow(2, attempt - 1) * baseDelay;
  const jittered = Math.min(maxDelay, Math.random() * exponential * 3);
  
  return Math.ceil(jittered);
};

/**
 * Rate-limit aware backoff
 * Checks if error is rate-limit; uses longer backoff if so
 */
export const rateLimitAwareBackoff = (
  config: BackoffConfig & { error?: Error }
): number => {
  const { attempt, error } = config;
  
  const isRateLimitError = error?.message?.toLowerCase().includes("rate") ||
    error?.message?.toLowerCase().includes("429") ||
    error?.message?.toLowerCase().includes("quota");
  
  if (isRateLimitError) {
    // Rate limit: longer backoff (30s base for first retry, 2min for second)
    const baseDelay = attempt === 1 ? 30000 : attempt === 2 ? 120000 : 300000;
    return baseDelay + Math.random() * 5000; // Add jitter
  }
  
  // Regular error: standard exponential
  return fullJitterBackoff(config);
};

/**
 * Get recommended backoff for Claude/Gemini API calls
 */
export const getLLMBackoffMs = (
  attempt: number,
  error?: Error
): number => {
  return rateLimitAwareBackoff({
    attempt,
    baseDelay: 2000,
    maxDelay: 300000, // 5 minutes max
    jitterFactor: 1.0,
    error
  });
};
