import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import LoginSelection from './pages/LoginSelection';
import CitizenLogin from './pages/CitizenLogin';
import GovernmentLogin from './pages/GovernmentLogin';
import FieldCrewLogin from './pages/FieldCrewLogin';
import CitizenDashboard from './pages/CitizenDashboard';
import GovernmentDashboard from './pages/GovernmentDashboard';
import FieldCrewDashboard from './pages/FieldCrewDashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-teal-600 selection:text-white">
            <Navbar />
            <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-6">
              <Routes>
                {/* Landing / Role Selection */}
                <Route path="/" element={<LoginSelection />} />

                {/* Login Routes */}
                <Route path="/citizen/login" element={<CitizenLogin />} />
                <Route path="/government/login" element={<GovernmentLogin />} />
                <Route path="/crew/login" element={<FieldCrewLogin />} />

                {/* Protected Citizen Dashboard */}
                <Route
                  path="/citizen/dashboard"
                  element={
                    <ProtectedRoute allowedRole="citizen">
                      <CitizenDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Government Dashboard */}
                <Route
                  path="/government/dashboard"
                  element={
                    <ProtectedRoute allowedRole="government">
                      <GovernmentDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Field Crew Operations Dashboard */}
                <Route
                  path="/crew/dashboard"
                  element={
                    <ProtectedRoute allowedRole="field_crew">
                      <FieldCrewDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Convenience Aliases */}
                <Route path="/dashboard" element={<Navigate to="/government/dashboard" replace />} />
                <Route path="/portal" element={<Navigate to="/citizen/dashboard" replace />} />
                <Route path="/crew" element={<Navigate to="/crew/dashboard" replace />} />
                <Route path="/operations" element={<Navigate to="/crew/dashboard" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
