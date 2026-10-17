const rawUrl = import.meta.env.VITE_APP_BACKEND_URL;
export const backend_url = rawUrl
  ? rawUrl.replace(/\/+$/, "")
  : "http://localhost:3000";
