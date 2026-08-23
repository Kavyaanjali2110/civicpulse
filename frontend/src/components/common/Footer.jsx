import React from 'react';
import { Shield, Sparkles, Radio } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-teal-700" />
          <span className="font-medium text-slate-700">CivicPulse AI Enterprise</span>
          <span>•</span>
          <span>Public Infrastructure Intelligence</span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-500">
          <Radio className="w-3.5 h-3.5 text-teal-700" />
          <span>Real-Time Geospatial &amp; Predictive Analytics</span>
        </div>
      </div>
    </footer>
  );
}
