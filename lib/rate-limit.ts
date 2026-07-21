const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const limit = Number(process.env.NOS_MAX_REQUESTS_PER_HOUR || 8);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count) };
}
