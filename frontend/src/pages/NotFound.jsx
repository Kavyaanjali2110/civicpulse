import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-5 shadow-sm">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
        404 — Page Not Found
      </h1>
      <p className="text-slate-500 max-w-md mb-6 text-xs sm:text-sm">
        The requested municipal route or portal page could not be located on the CivicPulse AI server.
      </p>
      <Link
        to="/"
        className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
      >
        <Home className="w-4 h-4" />
        <span>Return to Portal Selection</span>
      </Link>
    </div>
  );
}
