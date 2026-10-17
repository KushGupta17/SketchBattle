/**
 * CORS Configuration for Express and Socket.IO
 * Dynamically allows configured FRONTEND_URL, production Vercel domains,
 * branch/preview Vercel deployments (*.vercel.app), and local development.
 */

export const isOriginAllowed = (origin, customAllowedOrigins = []) => {
  // Allow requests with no origin (e.g. curl, server-to-server, self-ping, cron)
  if (!origin) return true;

  const defaultOrigins = [
    process.env.FRONTEND_URL,
    "https://sketch-battle-rho.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    ...customAllowedOrigins,
  ].filter(Boolean);

  // Expand comma-separated values (e.g. if FRONTEND_URL="https://site1.com, https://site2.com")
  const allowedList = defaultOrigins.flatMap((url) =>
    url.includes(",") ? url.split(",").map((s) => s.trim()) : [url.trim()]
  );

  if (allowedList.includes(origin)) return true;

  // Allow any Vercel deployment preview or production for sketch-battle
  if (/^https:\/\/sketch-battle.*\.vercel\.app$/i.test(origin)) return true;

  // Allow local development (localhost or 127.0.0.1 on any port)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;

  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
};
