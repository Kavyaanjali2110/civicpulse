import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Radio, 
  Users, 
  Building2, 
  HardHat,
  LogOut, 
  ShieldCheck, 
  LayoutDashboard,
  CheckCircle2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { checkHealth, resetDemoState } from '../../services/api';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { t } = useLanguage();
  const { user, isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  const [backendStatus, setBackendStatus] = useState('checking');
  const [resettingDemo, setResettingDemo] = useState(false);

  const handleDemoReset = async () => {
    if (!window.confirm("Restore deterministic demonstration state? This will re-seed all sample data.")) {
      return;
    }
    setResettingDemo(true);
    const res = await resetDemoState();
    setResettingDemo(false);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to reset demo state");
    }
  };

  useEffect(() => {
    const checkApi = async () => {
      const res = await checkHealth();
      if (res.success) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-slate-200/90 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center shadow-sm">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight block leading-tight">
                CivicPulse <span className="text-teal-700">AI</span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Infrastructure Intelligence
              </span>
            </div>
          </Link>

          {/* Navigation Links based on Auth State */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {!isAuthenticated ? (
              <>
                <NavLink
                  to="/citizen/login"
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Citizen Portal</span>
                </NavLink>

                <NavLink
                  to="/government/login"
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                    }`
                  }
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Command Center</span>
                </NavLink>

                <NavLink
                  to="/crew/login"
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-900 text-white shadow-sm'
                        : 'text-indigo-900 bg-indigo-50 hover:bg-indigo-100'
                    }`
                  }
                >
                  <HardHat className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="hidden sm:inline">Field Crew</span>
                </NavLink>
              </>
            ) : role === 'citizen' ? (
              <NavLink
                to="/citizen/dashboard"
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-teal-700" />
                <span>Citizen Dashboard</span>
              </NavLink>
            ) : role === 'field_crew' ? (
              <NavLink
                to="/crew/dashboard"
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-900 text-white font-bold shadow-sm'
                      : 'text-indigo-900 hover:text-indigo-950 hover:bg-indigo-50'
                  }`
                }
              >
                <HardHat className="w-3.5 h-3.5 text-cyan-300" />
                <span>Field Operations</span>
              </NavLink>
            ) : (
              <NavLink
                to="/government/dashboard"
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Command Center</span>
              </NavLink>
            )}
          </nav>

          {/* Right Controls: Language Switcher, User Pill / Logout, System Status */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <LanguageSwitcher />

            {isAuthenticated && (
              <div className="flex items-center space-x-2">
                <div className="hidden md:flex flex-col items-end text-right text-[11px] leading-tight">
                  <span className="font-bold text-slate-800">{user.name}</span>
                  <span className="text-slate-400 capitalize">{role?.replace('_', ' ') || ''}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Log out of session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDemoReset}
              disabled={resettingDemo}
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Restore deterministic demonstration state"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${resettingDemo ? 'animate-spin' : ''}`} />
              <span>{resettingDemo ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              {backendStatus === 'online' ? (
                <span className="status-dot-live" />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    backendStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-400 animate-pulse'
                  }`}
                />
              )}
              <span className="text-slate-500 text-[11px] font-medium">
                {backendStatus === 'online' ? 'AI Engine Live' : backendStatus === 'offline' ? 'API Offline' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
