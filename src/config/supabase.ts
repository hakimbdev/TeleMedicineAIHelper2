import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const devMode = import.meta.env.VITE_DEV_MODE === 'true';

// In development mode, use demo values if real credentials are not provided
const isDemoMode = devMode && (!supabaseUrl || supabaseUrl.includes('demo') || !supabaseAnonKey || supabaseAnonKey.includes('demo'));

if (!isDemoMode && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables');
}

// Use demo values for development
const finalUrl = isDemoMode ? 'https://demo.supabase.co' : supabaseUrl;
const finalKey = isDemoMode ? 'demo_key_for_development' : supabaseAnonKey;

// Demo mode storage for in-memory authentication
let demoAuthState = {
  currentUser: null as any,
  currentSession: null as any,
  authListeners: [] as any[],
};

// Demo users database
const demoUsers = [
  {
    id: 'demo-patient-1',
    email: 'patient@telemedicine.demo',
    password: 'demo123456',
    user_metadata: { full_name: 'Demo Patient', role: 'patient' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-doctor-1',
    email: 'doctor@telemedicine.demo',
    password: 'demo123456',
    user_metadata: { full_name: 'Dr. Demo', role: 'doctor' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-admin-1',
    email: 'admin@telemedicine.demo',
    password: 'demo123456',
    user_metadata: { full_name: 'Demo Admin', role: 'admin' },
    created_at: new Date().toISOString(),
  },
];

// Create Supabase client (or demo client for demo mode)
export const supabase = isDemoMode ?
  // Working demo Supabase client
  {
    auth: {
      getSession: () => {
        console.log('Demo getSession called, current user:', demoAuthState.currentUser?.email);
        return Promise.resolve({
          data: { session: demoAuthState.currentSession },
          error: null
        });
      },
      getUser: () => {
        console.log('Demo getUser called, current user:', demoAuthState.currentUser?.email);
        return Promise.resolve({
          data: { user: demoAuthState.currentUser },
          error: null
        });
      },
      onAuthStateChange: (callback: any) => {
        console.log('Demo onAuthStateChange registered');
        demoAuthState.authListeners.push(callback);
        return { data: { subscription: { unsubscribe: () => {
          const index = demoAuthState.authListeners.indexOf(callback);
          if (index > -1) demoAuthState.authListeners.splice(index, 1);
        } } } };
      },
      signInWithPassword: ({ email, password }: any) => {
        console.log('Demo signInWithPassword:', email);
        const user = demoUsers.find(u => u.email === email && u.password === password);
        if (user) {
          const session = {
            user,
            access_token: 'demo-token',
            refresh_token: 'demo-refresh',
            expires_at: Date.now() + 3600000,
          };
          demoAuthState.currentUser = user;
          demoAuthState.currentSession = session;

          // Notify listeners
          setTimeout(() => {
            demoAuthState.authListeners.forEach(listener => {
              listener('SIGNED_IN', session);
            });
          }, 100);

          return Promise.resolve({ data: { user, session }, error: null });
        }
        return Promise.resolve({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' }
        });
      },
      signUp: ({ email, password, options }: any) => {
        console.log('Demo signUp:', email);
        // Check if user already exists
        const existingUser = demoUsers.find(u => u.email === email);
        if (existingUser) {
          return Promise.resolve({
            data: { user: null, session: null },
            error: { message: 'User already registered' }
          });
        }

        // Create new demo user
        const newUser = {
          id: `demo-user-${Date.now()}`,
          email,
          password,
          user_metadata: options?.data || {},
          created_at: new Date().toISOString(),
        };
        demoUsers.push(newUser);

        // Auto sign in the new user
        const session = {
          user: newUser,
          access_token: 'demo-token',
          refresh_token: 'demo-refresh',
          expires_at: Date.now() + 3600000,
        };
        demoAuthState.currentUser = newUser;
        demoAuthState.currentSession = session;

        // Notify listeners
        setTimeout(() => {
          demoAuthState.authListeners.forEach(listener => {
            listener('SIGNED_IN', session);
          });
        }, 100);

        return Promise.resolve({ data: { user: newUser, session }, error: null });
      },
      signOut: () => {
        console.log('Demo signOut');
        demoAuthState.currentUser = null;
        demoAuthState.currentSession = null;

        // Notify listeners
        setTimeout(() => {
          demoAuthState.authListeners.forEach(listener => {
            listener('SIGNED_OUT', null);
          });
        }, 100);

        return Promise.resolve({ error: null });
      },
    },
    from: (table: string) => ({
      select: (columns = '*') => ({
        eq: (column: string, value: any) => ({
          single: () => {
            console.log(`Demo DB: SELECT ${columns} FROM ${table} WHERE ${column} = ${value}`);
            if (table === 'profiles' && column === 'id') {
              const user = demoUsers.find(u => u.id === value);
              if (user) {
                const profile = {
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata.full_name,
                  role: user.user_metadata.role,
                  created_at: user.created_at,
                  updated_at: user.created_at,
                  is_active: true,
                };
                return Promise.resolve({ data: profile, error: null });
              }
            }
            return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
          }
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => {
            console.log(`Demo DB: INSERT INTO ${table}`, data);
            return Promise.resolve({ data, error: null });
          }
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: () => {
              console.log(`Demo DB: UPDATE ${table} SET ... WHERE ${column} = ${value}`, data);
              return Promise.resolve({ data: { ...data, id: value }, error: null });
            }
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => {
          console.log(`Demo DB: DELETE FROM ${table} WHERE ${column} = ${value}`);
          return Promise.resolve({ error: null });
        }
      }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: 'demo/file.jpg' }, error: null }),
        remove: () => Promise.resolve({ error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://demo.supabase.co/storage/v1/object/public/${path}` } }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: () => {},
  } as any :
  createClient<Database>(finalUrl, finalKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

// Demo mode flag
export const isDemo = isDemoMode;

// Auth helpers
export const auth = supabase.auth;

// Database helpers
export const db = supabase;

// Storage helpers
export const storage = supabase.storage;

// Realtime helpers
export const realtime = supabase.realtime;

// User roles enum
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
  NURSE = 'nurse',
}

// Auth state types
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    role?: UserRole;
  };
  app_metadata: {
    role?: UserRole;
  };
}

// Database table names
export const TABLES = {
  PROFILES: 'profiles',
  MEDICAL_RECORDS: 'medical_records',
  APPOINTMENTS: 'appointments',
  PRESCRIPTIONS: 'prescriptions',
  CONSULTATIONS: 'consultations',
  CHAT_MESSAGES: 'chat_messages',
  CHAT_CHANNELS: 'chat_channels',
  DIAGNOSIS_SESSIONS: 'diagnosis_sessions',
  NOTIFICATIONS: 'notifications',
} as const;

// RLS (Row Level Security) policies helper
export const RLS_POLICIES = {
  // Users can only see their own profile
  PROFILES_SELECT: 'profiles_select_own',
  PROFILES_UPDATE: 'profiles_update_own',
  
  // Medical records - patients see own, doctors see assigned
  MEDICAL_RECORDS_SELECT: 'medical_records_select_policy',
  MEDICAL_RECORDS_INSERT: 'medical_records_insert_policy',
  MEDICAL_RECORDS_UPDATE: 'medical_records_update_policy',
  
  // Appointments - users see own appointments
  APPOINTMENTS_SELECT: 'appointments_select_policy',
  APPOINTMENTS_INSERT: 'appointments_insert_policy',
  APPOINTMENTS_UPDATE: 'appointments_update_policy',
  
  // Chat messages - users see messages in their channels
  CHAT_MESSAGES_SELECT: 'chat_messages_select_policy',
  CHAT_MESSAGES_INSERT: 'chat_messages_insert_policy',
} as const;

// Error handling
export class SupabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SupabaseError';
  }
}

// Helper functions
export const handleSupabaseError = (error: any): never => {
  console.error('Supabase error:', error);
  throw new SupabaseError(error.message || 'An unexpected error occurred', error.code);
};

export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user as AuthUser | null;
};

export const getUserRole = async (): Promise<UserRole | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  
  // Check app_metadata first (set by admin), then user_metadata
  return user.app_metadata?.role || user.user_metadata?.role || null;
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) handleSupabaseError(error);
};

// Real-time subscription helpers
export const subscribeToTable = (
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter,
      },
      callback
    )
    .subscribe();

  return channel;
};

export const unsubscribeFromChannel = (channel: any) => {
  supabase.removeChannel(channel);
};

// File upload helpers
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options);

  if (error) handleSupabaseError(error);

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};

export const deleteFile = async (bucket: string, path: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) handleSupabaseError(error);
};

// Database query helpers
export const createRecord = async <T>(
  table: string,
  data: Partial<T>
): Promise<T> => {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  return result as T;
};

export const updateRecord = async <T>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<T> => {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  return result as T;
};

export const deleteRecord = async (table: string, id: string): Promise<void> => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error);
};

export const getRecord = async <T>(
  table: string,
  id: string
): Promise<T | null> => {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') handleSupabaseError(error);
  return data as T | null;
};

export const getRecords = async <T>(
  table: string,
  query?: {
    select?: string;
    filter?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
): Promise<T[]> => {
  let queryBuilder = supabase.from(table).select(query?.select || '*');

  if (query?.filter) {
    Object.entries(query.filter).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });
  }

  if (query?.order) {
    queryBuilder = queryBuilder.order(query.order.column, {
      ascending: query.order.ascending ?? true,
    });
  }

  if (query?.limit) {
    queryBuilder = queryBuilder.limit(query.limit);
  }

  if (query?.offset) {
    queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 10) - 1);
  }

  const { data, error } = await queryBuilder;

  if (error) handleSupabaseError(error);
  return data as T[];
};
