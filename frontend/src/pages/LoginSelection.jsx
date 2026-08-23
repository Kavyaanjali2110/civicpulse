import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  HardHat,
  ArrowRight, 
  Shield, 
  Activity, 
  Layers, 
  Mic, 
  MapPin, 
  CheckCircle2,
  Sparkles,
  Camera,
  Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginSelection() {
  const { isAuthenticated, role } = useAuth();

  // Redirect if already logged in
  if (isAuthenticated) {
    if (role === 'government') return <Navigate to="/government/dashboard" replace />;
    if (role === 'field_crew') return <Navigate to="/crew/dashboard" replace />;
    if (role === 'citizen') return <Navigate to="/citizen/dashboard" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto py-8 sm:py-16 space-y-12 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
          <span className="font-mono uppercase tracking-wider text-[11px]">CivicPulse AI Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Turning Citizen Voices into{' '}
          <span className="text-teal-700">Infrastructure Intelligence</span>
        </h1>

        <p className="text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">
          CivicPulse AI connects citizens, municipal authorities, and field response crews into a complete closed-loop civic resolution workflow — from AI severity triage to on-site photo proof and citizen satisfaction reviews.
        </p>
      </div>

      {/* 3 Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Citizen Portal Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-card hover:shadow-elevation hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-6 group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-700 group-hover:text-white transition-colors duration-200 shadow-sm">
              <Users className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block mb-1">
                Public Access
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Citizen Portal
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Report civic issues, track live status, inspect repair photos, and rate resolutions.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
              <li className="flex items-center space-x-2">
                <Mic className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Voice input in Hindi, Marathi, Spanish</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>GPS map pin selection & photo upload</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Before/after proof & 5-star citizen rating</span>
              </li>
            </ul>
          </div>

          <Link
            to="/citizen/login"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <span>Continue as Citizen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2. Government Portal Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-card hover:shadow-elevation hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-6 group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors duration-200 shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Command Center
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Government Portal
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Hotspot intelligence, AI priority ranking, SLA tracking, and crew dispatch.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
              <li className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Interactive DBSCAN Hotspot Heatmap</span>
              </li>
              <li className="flex items-center space-x-2">
                <Activity className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Infrastructure Priority Score (IPS) queue</span>
              </li>
              <li className="flex items-center space-x-2">
                <HardHat className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Field crew dispatch & SLA compliance</span>
              </li>
            </ul>
          </div>

          <Link
            to="/government/login"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <span>Continue as Government</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 3. Field Crew Operations Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-card hover:shadow-elevation hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-6 group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-900 group-hover:text-white transition-colors duration-200 shadow-sm">
              <HardHat className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                Field Operations
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Field Crew Dispatch
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Accept assigned work orders, update on-site progress, and upload resolution proof.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
              <li className="flex items-center space-x-2">
                <Radio className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Real-time mobile task dispatch</span>
              </li>
              <li className="flex items-center space-x-2">
                <Camera className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Before & After photo evidence upload</span>
              </li>
              <li className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Direct SLA completion verification</span>
              </li>
            </ul>
          </div>

          <Link
            to="/crew/login"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <span>Continue as Field Crew</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Trust & Enterprise Badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-500">
        <span className="flex items-center space-x-1.5">
          <Shield className="w-4 h-4 text-teal-700" />
          <span>Role-Based Access Control</span>
        </span>
        <span>•</span>
        <span className="flex items-center space-x-1.5">
          <Radio className="w-4 h-4 text-teal-700" />
          <span>Real-Time DBSCAN Spatial Analytics</span>
        </span>
        <span>•</span>
        <span className="flex items-center space-x-1.5">
          <Activity className="w-4 h-4 text-teal-700" />
          <span>Automated SLA Tracking & Resolution Evidence</span>
        </span>
      </div>
    </div>
  );
}
