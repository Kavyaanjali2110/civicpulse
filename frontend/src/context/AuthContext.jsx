import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getStoredSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = authService.getStoredSession();
    setUser(session);
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    const authData = await authService.login(email, password, role);
    setUser(authData);
    return authData;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user?.isAuthenticated,
    role: user?.role || null,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
