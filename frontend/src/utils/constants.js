export const APP_NAME = "CivicPulse AI";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const CIVIC_CATEGORIES = [
  { id: "ROADS", label: "Roads & Potholes", color: "#f59e0b" },
  { id: "WATER", label: "Water Supply & Leakage", color: "#0ea5e9" },
  { id: "WASTE", label: "Waste Management & Garbage", color: "#10b981" },
  { id: "ELECTRICITY", label: "Electrical & Streetlights", color: "#eab308" },
  { id: "SEWAGE", label: "Sewage & Drainage", color: "#8b5cf6" },
  { id: "SAFETY", label: "Public Safety & Traffic", color: "#ef4444" },
];

export const SEVERITY_LEVELS = {
  LOW: { label: "Low", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  MEDIUM: { label: "Medium", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  HIGH: { label: "High", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  CRITICAL: { label: "Critical", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
};
