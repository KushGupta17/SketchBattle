// In-memory sliding window rate limiter
export const createRateLimiter = ({ windowMs = 60000, maxRequests = 30, message = "Too many requests. Please try again later." } = {}) => {
  const ipRequests = new Map();

  // Periodically clean up expired timestamps every minute
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipRequests.entries()) {
      const validTimestamps = timestamps.filter(t => now - t < windowMs);
      if (validTimestamps.length === 0) {
        ipRequests.delete(ip);
      } else {
        ipRequests.set(ip, validTimestamps);
      }
    }
  }, Math.max(windowMs, 30000));

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket?.remoteAddress || 'unknown-ip';
    const now = Date.now();

    const timestamps = ipRequests.get(ip) || [];
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return res.status(429).json({ message });
    }

    validTimestamps.push(now);
    ipRequests.set(ip, validTimestamps);
    next();
  };
};

export const createRoomLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20,
  message: "Too many rooms created from this IP. Please wait a few minutes before creating another."
});

export const joinRoomLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: "Too many room join attempts. Please slow down."
});
