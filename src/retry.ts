/**
 * 通用重試工具 (from banini-tracker)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * 2 ** (attempt - 1);
        console.warn(`[${label}] 第 ${attempt} 次失敗，${delay}ms 後重試: ${lastError.message}`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
