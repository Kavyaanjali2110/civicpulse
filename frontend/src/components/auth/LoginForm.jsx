import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Lock, 
  Mail, 
  AlertCircle, 
  Building2, 
  Users, 
  HardHat,
  Loader2, 
  KeyRound, 
  Sparkles,
  Shield,
  CheckCircle2,
  Camera,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

export default function LoginForm({ role = 'citizen' }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const isGov = role === 'government';
  const isCrew = role === 'field_crew';
  const demoCreds = authService.getDemoCredentials(role);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFillDemo = () => {
    setEmail(demoCreds.email);
    setPassword(demoCreds.password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, role);
      let destination = '/citizen/dashboard';
      if (isGov) destination = '/government/dashboard';
      if (isCrew) destination = '/crew/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 animate-in fade-in duration-300">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal Selection</span>
        </Link>
      </div>

      {/* Split Screen Container */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-elevation overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
        {/* Left Side: Brand & Mission Panel */}
        <div
          className={`md:col-span-5 p-8 flex flex-col justify-between text-white relative overflow-hidden ${
            isGov ? 'bg-slate-900' : isCrew ? 'bg-indigo-950' : 'bg-teal-800'
          }`}
        >
          <div className="space-y-6 relative z-10">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                {isGov ? (
                  <Building2 className="w-5 h-5 text-amber-300" />
                ) : isCrew ? (
                  <HardHat className="w-5 h-5 text-cyan-300" />
                ) : (
                  <Users className="w-5 h-5 text-teal-200" />
                )}
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white block">
                  CivicPulse <span className={isGov ? 'text-amber-300' : isCrew ? 'text-cyan-300' : 'text-teal-300'}>AI</span>
                </span>
                <span className="text-[10px] text-white/70 uppercase tracking-wider block">
                  {isGov ? 'Government Intelligence' : isCrew ? 'Field Crew Operations' : 'Citizen Platform'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {isGov
                  ? 'Municipal Command & Resource Allocation'
                  : isCrew
                  ? 'On-Site Field Operations & Resolution Proof'
                  : 'Empowering Communities with AI Grievance Intelligence'}
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                {isGov
                  ? 'Access real-time failure heatmaps, DBSCAN spatial density clusters, and tactical work order dispatches.'
                  : isCrew
                  ? 'Review dispatched tickets, acknowledge assignments, log on-site work progress, and submit verified photo evidence.'
                  : 'Report public infrastructure breakdowns via voice or text in any language and track real-time resolution SLAs.'}
              </p>
            </div>

            {/* Micro Feature List */}
            <div className="space-y-2 pt-2 text-xs text-white/75">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span>
                  {isGov
                    ? 'Infrastructure Priority Score (IPS)'
                    : isCrew
                    ? 'Instant task dispatch & acceptance'
                    : 'Multi-modal voice & photo input'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span>
                  {isGov
                    ? 'Automated DBSCAN density detection'
                    : isCrew
                    ? 'Before & After resolution evidence photos'
                    : 'Live tracking timeline & SMS SLA alerts'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-[11px] text-white/60 relative z-10 flex items-center justify-between">
            <span>Enterprise Security v1.0</span>
            <span className="flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>Role-Protected</span>
            </span>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6 bg-white">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isGov
                  ? 'Government Official Login'
                  : isCrew
                  ? 'Field Crew Operations Login'
                  : 'Citizen Sign In'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isGov
                  ? 'Please enter your authorized municipal administrative credentials.'
                  : isCrew
                  ? 'Sign in to access assigned work orders and upload resolution proof.'
                  : 'Sign in to submit complaints and monitor municipal action progress.'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isGov
                    ? 'Official Email Address'
                    : isCrew
                    ? 'Crew Leader Email'
                    : 'Citizen Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      isGov
                        ? 'admin@civicpulse.gov'
                        : isCrew
                        ? 'crew@civicpulse.ai'
                        : 'citizen@civicpulse.ai'
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-sans"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 ${
                  isGov
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : isCrew
                    ? 'bg-indigo-900 hover:bg-indigo-950'
                    : 'bg-teal-700 hover:bg-teal-800'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {isGov
                        ? 'Authorize Government Access'
                        : isCrew
                        ? 'Access Field Operations Dashboard'
                        : 'Sign In as Citizen'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Development Demo Credentials Box */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-semibold uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Demo Sandbox Credentials</span>
              </span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-teal-700 hover:text-teal-800 font-bold underline cursor-pointer"
              >
                Auto-Fill
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-[11px] space-y-1 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-800 font-medium select-all">{demoCreds.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Password:</span>
                <span className="text-slate-800 font-medium select-all">{demoCreds.password}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
