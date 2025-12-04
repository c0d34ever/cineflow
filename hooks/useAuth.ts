import { useState, useEffect } from 'react';
import { authService } from '../apiServices';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      setCurrentUser(data.user);
      setIsAuthenticated(true);
    } catch (error: any) {
      // Clear invalid token
      localStorage.removeItem('auth_token');
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = (token: string, user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // Clear auth token and any per-session state
    localStorage.removeItem('auth_token');
    localStorage.removeItem('admin_view_mode');

    // Reset in-memory state
    setCurrentUser(null);
    setIsAuthenticated(false);

    // Hard reload to ensure all components reset and any stale data is cleared
    window.location.href = '/';
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    isAuthenticated,
    currentUser,
    authLoading,
    checkAuth,
    handleLogin,
    handleLogout,
    setCurrentUser,
    setIsAuthenticated
  };
};

