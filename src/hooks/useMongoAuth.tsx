import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { mongodbClient } from '../services/mongodbApi';
import { UserDocument, SessionDocument } from '../types/mongodb';
import { UserRole } from '../config/mongodb';

// Authentication State Interface
interface AuthState {
  user: UserDocument | null;
  session: SessionDocument | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Authentication Context
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserDocument>) => Promise<boolean>;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
}

// Registration Data Interface
interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  medicalLicense?: string;
  specialization?: string;
  department?: string;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

// Session Storage Keys
const SESSION_STORAGE_KEYS = {
  SESSION_TOKEN: 'telemedicine_session_token',
  USER_DATA: 'telemedicine_user_data',
};

// Custom Hook for MongoDB Authentication
export const useMongoAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });

  // Clear error message
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setAuthState(prev => ({ ...prev, loading }));
  }, []);

  // Set error state
  const setError = useCallback((error: string) => {
    setAuthState(prev => ({ ...prev, error, loading: false }));
  }, []);

  // Update auth state
  const updateAuthState = useCallback((user: UserDocument | null, session: SessionDocument | null) => {
    setAuthState({
      user,
      session,
      loading: false,
      error: null,
      isAuthenticated: !!(user && session),
    });

    // Update session storage
    if (user && session) {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.SESSION_TOKEN, session.sessionToken);
      sessionStorage.setItem(SESSION_STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_TOKEN);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.USER_DATA);
    }
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();

      const response = await mongodbClient.login(email, password);

      if (response.success && response.data) {
        const { user, tokens } = response.data;

        // Create a session object from the tokens
        const session = {
          _id: 'session-' + Date.now(),
          userId: user._id || user.id,
          sessionToken: tokens.accessToken,
          expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        updateAuthState(user, session);
        return true;
      } else {
        setError(response.error || 'Login failed');
        return false;
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
      return false;
    }
  }, [setLoading, clearError, setError, updateAuthState]);

  // Register function
  const register = useCallback(async (userData: RegisterData): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();

      // Create registration data for backend API
      const registrationData = {
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role,
        phone: userData.phone,
        dateOfBirth: userData.dateOfBirth,
        gender: userData.gender,
        medicalLicense: userData.medicalLicense,
        specialization: userData.specialization,
        department: userData.department,
      };

      const response = await mongodbClient.register(registrationData);
      
      if (response.success && response.data) {
        // Auto-login after successful registration
        return await login(userData.email, userData.password);
      } else {
        setError(response.error || 'Registration failed');
        return false;
      }
    } catch (error: any) {
      setError(error.message || 'Registration failed');
      return false;
    }
  }, [setLoading, clearError, setError, login]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      const sessionToken = sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_TOKEN);
      
      if (sessionToken) {
        await mongodbClient.logout(sessionToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      updateAuthState(null, null);
    }
  }, [updateAuthState]);

  // Update profile function
  const updateProfile = useCallback(async (updates: Partial<UserDocument>): Promise<boolean> => {
    try {
      if (!authState.user) {
        setError('No user logged in');
        return false;
      }

      setLoading(true);
      clearError();

      const response = await mongodbClient.updateUser(authState.user._id!, updates);
      
      if (response.success && response.data) {
        updateAuthState(response.data, authState.session);
        return true;
      } else {
        setError(response.error || 'Profile update failed');
        return false;
      }
    } catch (error: any) {
      setError(error.message || 'Profile update failed');
      return false;
    }
  }, [authState.user, authState.session, setLoading, clearError, setError, updateAuthState]);

  // Refresh authentication state
  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      const sessionToken = sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_TOKEN);
      
      if (!sessionToken) {
        updateAuthState(null, null);
        return;
      }

      setLoading(true);
      const response = await mongodbClient.verifySession(sessionToken);
      
      if (response.success && response.data) {
        const { user, session } = response.data;
        updateAuthState(user, session);
      } else {
        updateAuthState(null, null);
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      updateAuthState(null, null);
    }
  }, [setLoading, updateAuthState]);

  // Initialize authentication on mount
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Auto-refresh session periodically
  useEffect(() => {
    if (authState.isAuthenticated && authState.session) {
      const interval = setInterval(() => {
        const expiresAt = new Date(authState.session!.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // Refresh if session expires in less than 1 hour
        if (timeUntilExpiry < 60 * 60 * 1000) {
          refreshAuth();
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated, authState.session, refreshAuth]);

  return {
    ...authState,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    refreshAuth,
  };
};

// Auth Provider Component
export const MongoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useMongoAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within MongoAuthProvider');
  }
  return context;
};

// Export for backward compatibility
export default useMongoAuth;
