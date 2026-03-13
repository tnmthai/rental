type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memory.get(key);

  if (!current || now > current.resetAt) {
    const fresh = { count: 1, resetAt: now + windowMs };
    memory.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  memory.set(key, current);
  return { ok: true, remaining: limit - current.count, resetAt: current.resetAt };
}
