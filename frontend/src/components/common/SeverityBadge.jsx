import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Flame } from 'lucide-react';

export default function SeverityBadge({ level, score, showScore = false, className = '' }) {
  const normLevel = (level || 'MEDIUM').toUpperCase();

  const config = {
    CRITICAL: {
      label: 'Critical',
      icon: Flame,
      bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
      dot: 'bg-rose-500',
    },
    HIGH: {
      label: 'High',
      icon: AlertTriangle,
      bg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60',
      dot: 'bg-orange-500',
    },
    MEDIUM: {
      label: 'Medium',
      icon: Info,
      bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
      dot: 'bg-amber-500',
    },
    LOW: {
      label: 'Low',
      icon: CheckCircle,
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
      dot: 'bg-emerald-500',
    },
  };

  const current = config[normLevel] || config.MEDIUM;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <Icon className="w-3 h-3 shrink-0" />
      <span>{current.label}</span>
      {showScore && score !== undefined && (
        <span className="opacity-80 font-mono font-medium">({score})</span>
      )}
    </span>
  );
}
