type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const store = new Map<string, number[]>();

export function consumeRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const recentHits = (store.get(key) ?? []).filter((value) => value > windowStart);

  if (recentHits.length >= limit) {
    const oldestHit = recentHits[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldestHit + windowMs - now) / 1000)),
    };
  }

  recentHits.push(now);
  store.set(key, recentHits);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}
