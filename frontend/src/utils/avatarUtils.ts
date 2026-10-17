/**
 * Generates a consistent, joyful pastel avatar color and initials from a username
 */

const AVATAR_COLORS = [
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300", gradient: "from-pink-400 to-rose-500" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", gradient: "from-purple-400 to-indigo-500" },
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", gradient: "from-blue-400 to-cyan-500" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", gradient: "from-emerald-400 to-teal-500" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", gradient: "from-amber-400 to-orange-500" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", gradient: "from-indigo-400 to-purple-500" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300", gradient: "from-rose-400 to-pink-500" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300", gradient: "from-teal-400 to-emerald-500" },
];

export const getAvatarColor = (name: string = "") => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const getInitials = (name: string = "") => {
  if (!name) return "?";
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed.toUpperCase();
  const parts = trimmed.split(/[\s_-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};
