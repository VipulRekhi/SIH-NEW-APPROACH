import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User, ApiResponse, AuthResponseData } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('nawi_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state by verifying existing token
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('nawi_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
        if (response.data.success && response.data.data?.user) {
          setUser(response.data.data.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem('nawi_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        localStorage.removeItem('nawi_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<ApiResponse<AuthResponseData>>('/auth/login', {
        email,
        password
      });

      if (response.data.success && response.data.data) {
        const { token: receivedToken, user: receivedUser } = response.data.data;
        localStorage.setItem('nawi_token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        setIsLoading(false);
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      setIsLoading(false);
      return false;
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<ApiResponse<AuthResponseData>>('/auth/register', {
        full_name: fullName,
        email,
        password,
        confirm_password: confirmPassword
      });

      if (response.data.success && response.data.data) {
        const { token: receivedToken, user: receivedUser } = response.data.data;
        localStorage.setItem('nawi_token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        setIsLoading(false);
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(msg);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('nawi_token');
      setToken(null);
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
