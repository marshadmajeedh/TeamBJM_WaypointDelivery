import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthenticatedUser, LoginRequest, LoginResponseData, UserRole } from '@waypoint/shared';
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  loginApi,
} from '../../services/api';

export interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (emailOrCredentials: string | LoginRequest, password?: string) => Promise<LoginResponseData>;
  logout: () => void;
  getRolePortalPath: (role?: UserRole | null) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getRolePortalPath(role?: UserRole | null): string {
  switch (role) {
    case UserRole.STORE_MANAGER:
      return '/store';
    case UserRole.DISPATCHER:
      return '/dispatcher';
    case UserRole.LOADER:
      return '/loader';
    case UserRole.DRIVER:
      return '/driver';
    default:
      return '/';
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getStoredToken());
  const [user, setUserState] = useState<AuthenticatedUser | null>(() => getStoredUser());

  // Synchronize state with sessionStorage
  useEffect(() => {
    const existingToken = getStoredToken();
    const existingUser = getStoredUser();
    if (existingToken && existingUser) {
      setTokenState(existingToken);
      setUserState(existingUser);
    }
  }, []);

  const login = useCallback(
    async (emailOrCredentials: string | LoginRequest, password?: string): Promise<LoginResponseData> => {
      const payload: LoginRequest =
        typeof emailOrCredentials === 'string'
          ? { email: emailOrCredentials, password: password || '' }
          : emailOrCredentials;

      const result = await loginApi(payload);

      setStoredToken(result.token);
      setStoredUser(result.user);

      setTokenState(result.token);
      setUserState(result.user);

      return result;
    },
    []
  );

  const logout = useCallback(() => {
    removeStoredToken();
    removeStoredUser();
    setTokenState(null);
    setUserState(null);
  }, []);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        login,
        logout,
        getRolePortalPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
