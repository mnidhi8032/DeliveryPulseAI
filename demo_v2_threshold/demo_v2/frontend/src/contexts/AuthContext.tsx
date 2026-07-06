import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginCredentials, User } from "../types/auth";
import * as authService from "../services/authService";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = authService.getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const me = await authService.getCurrentUser();
    // Guard: if the role is no longer valid (e.g. DELIVERY_HEAD, CUSTOMER_ADMIN removed),
    // clear the stale token so the login page renders correctly.
    const VALID_ROLES = ["PLATFORM_ADMIN", "CEO", "DELIVERY_HEAD", "DELIVERY_MANAGER", "PM", "DELIVERY_EXCELLENCE"];
    if (!VALID_ROLES.includes(me.role_code)) {
      authService.clearToken();
      setUser(null);
      return;
    }
    setUser(me);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await refreshUser();
      } catch {
        authService.clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, [refreshUser]);

  useEffect(() => {
    const onUnauthorized = () => {
      authService.logout();
      setUser(null);
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
