// MongoDB API Service for TeleMedicine AI Helper
// This service handles all database operations through a REST API

import { MONGODB_CONFIG, isDemoMode, handleMongoDBError } from '../config/mongodb';
import { 
  UserDocument, 
  MedicalRecordDocument, 
  AppointmentDocument,
  PrescriptionDocument,
  ChatChannelDocument,
  ChatMessageDocument,
  DiagnosisSessionDocument,
  NotificationDocument,
  SessionDocument,
  MongoDBResponse,
  PaginatedResponse,
  QueryOptions,
  UserFilter,
  MedicalRecordFilter,
  AppointmentFilter
} from '../types/mongodb';

// API Base URL (would be your backend API)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Demo data for when MongoDB is not available
const DEMO_DATA = {
  users: [
    {
      _id: 'demo-user-1',
      email: 'patient@telemedicine.demo',
      passwordHash: 'demo-hash',
      emailVerified: true,
      loginAttempts: 0,
      profile: {
        fullName: 'Demo Patient',
        role: 'patient' as const,
        isActive: true,
        preferences: {
          notifications: true,
          emailUpdates: true,
          language: 'en',
          timezone: 'UTC'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'demo-user-2',
      email: 'doctor@telemedicine.demo',
      passwordHash: 'demo-hash',
      emailVerified: true,
      loginAttempts: 0,
      profile: {
        fullName: 'Dr. Demo',
        role: 'doctor' as const,
        medicalLicense: 'MD123456',
        specialization: 'General Medicine',
        isActive: true,
        preferences: {
          notifications: true,
          emailUpdates: true,
          language: 'en',
          timezone: 'UTC'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  medicalRecords: [],
  appointments: [],
  sessions: []
};

class MongoDBApiClient {
  private baseUrl: string;
  private useDemo: boolean;

  constructor() {
    this.baseUrl = API_BASE_URL;

    // Use demo mode if:
    // 1. isDemoMode() returns true (dev mode enabled)
    // 2. API_BASE_URL contains localhost or is not properly configured
    // 3. We're in production but backend is not deployed
    this.useDemo = isDemoMode() ||
                   this.baseUrl.includes('localhost') ||
                   this.baseUrl.includes('your-backend-api') ||
                   !this.baseUrl ||
                   this.baseUrl === 'http://localhost:3001/api';

    if (this.useDemo) {
      console.warn('🔄 Running in demo mode - backend API not available');
      console.log('📊 Using mock data for development/demo');
    } else {
      console.log('🌐 Connected to backend API:', this.baseUrl);
    }
  }

  // Generic API request method
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<MongoDBResponse<T>> {
    if (this.useDemo) {
      return this.handleDemoRequest<T>(endpoint, method, body);
    }

    try {
      // Get auth token from session storage
      const sessionToken = sessionStorage.getItem('telemedicine_session_token');

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Add authorization header if token exists
      if (sessionToken) {
        requestHeaders['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('MongoDB API Error:', error);
      return {
        success: false,
        error: error.message || 'API request failed',
      };
    }
  }

  // Demo mode request handler
  private async handleDemoRequest<T>(
    endpoint: string,
    method: string,
    body?: any
  ): Promise<MongoDBResponse<T>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Handle different endpoints in demo mode
    if (endpoint.includes('/users')) {
      if (method === 'GET') {
        return {
          success: true,
          data: DEMO_DATA.users as any,
        };
      }
      if (method === 'POST' && endpoint.includes('/auth/login')) {
        const { email, password } = body;
        const user = DEMO_DATA.users.find(u => u.email === email);
        if (user && password === 'demo123456') {
          return {
            success: true,
            data: {
              user,
              tokens: {
                accessToken: 'demo-access-token',
                refreshToken: 'demo-refresh-token',
                expiresIn: 86400, // 24 hours in seconds
              },
              session: {
                _id: 'demo-session',
                userId: user._id,
                sessionToken: 'demo-access-token',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            } as any,
          };
        }
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }
    }

    if (endpoint.includes('/medical-records')) {
      return {
        success: true,
        data: DEMO_DATA.medicalRecords as any,
      };
    }

    if (endpoint.includes('/appointments')) {
      return {
        success: true,
        data: DEMO_DATA.appointments as any,
      };
    }

    return {
      success: true,
      data: [] as any,
    };
  }

  // Authentication Methods
  async login(email: string, password: string): Promise<MongoDBResponse<{ user: UserDocument; session: SessionDocument; tokens: any }>> {
    return this.makeRequest('/auth/login', 'POST', { email, password });
  }

  async register(userData: Partial<UserDocument>): Promise<MongoDBResponse<UserDocument>> {
    return this.makeRequest('/auth/register', 'POST', userData);
  }

  async logout(sessionToken: string): Promise<MongoDBResponse<void>> {
    return this.makeRequest('/auth/logout', 'POST', { sessionToken });
  }

  async verifySession(sessionToken: string): Promise<MongoDBResponse<{ user: UserDocument; session: SessionDocument }>> {
    return this.makeRequest('/auth/verify', 'POST', { sessionToken });
  }

  async resetPassword(email: string): Promise<MongoDBResponse<void>> {
    return this.makeRequest('/auth/forgot-password', 'POST', { email });
  }

  // User Methods
  async getUser(userId: string): Promise<MongoDBResponse<UserDocument>> {
    return this.makeRequest(`/users/${userId}`);
  }

  async updateUser(userId: string, updates: Partial<UserDocument>): Promise<MongoDBResponse<UserDocument>> {
    return this.makeRequest(`/users/${userId}`, 'PUT', updates);
  }

  async getUsers(filter?: UserFilter, options?: QueryOptions): Promise<MongoDBResponse<PaginatedResponse<UserDocument>>> {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, JSON.stringify(value));
      });
    }
    return this.makeRequest(`/users?${params.toString()}`);
  }

  // Medical Records Methods
  async getMedicalRecords(filter?: MedicalRecordFilter, options?: QueryOptions): Promise<MongoDBResponse<PaginatedResponse<MedicalRecordDocument>>> {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, JSON.stringify(value));
      });
    }
    return this.makeRequest(`/medical-records?${params.toString()}`);
  }

  async getMedicalRecord(recordId: string): Promise<MongoDBResponse<MedicalRecordDocument>> {
    return this.makeRequest(`/medical-records/${recordId}`);
  }

  async createMedicalRecord(record: Partial<MedicalRecordDocument>): Promise<MongoDBResponse<MedicalRecordDocument>> {
    return this.makeRequest('/medical-records', 'POST', record);
  }

  async updateMedicalRecord(recordId: string, updates: Partial<MedicalRecordDocument>): Promise<MongoDBResponse<MedicalRecordDocument>> {
    return this.makeRequest(`/medical-records/${recordId}`, 'PUT', updates);
  }

  async deleteMedicalRecord(recordId: string): Promise<MongoDBResponse<void>> {
    return this.makeRequest(`/medical-records/${recordId}`, 'DELETE');
  }

  // Appointments Methods
  async getAppointments(filter?: AppointmentFilter, options?: QueryOptions): Promise<MongoDBResponse<PaginatedResponse<AppointmentDocument>>> {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, JSON.stringify(value));
      });
    }
    return this.makeRequest(`/appointments?${params.toString()}`);
  }

  async getAppointment(appointmentId: string): Promise<MongoDBResponse<AppointmentDocument>> {
    return this.makeRequest(`/appointments/${appointmentId}`);
  }

  async createAppointment(appointment: Partial<AppointmentDocument>): Promise<MongoDBResponse<AppointmentDocument>> {
    return this.makeRequest('/appointments', 'POST', appointment);
  }

  async updateAppointment(appointmentId: string, updates: Partial<AppointmentDocument>): Promise<MongoDBResponse<AppointmentDocument>> {
    return this.makeRequest(`/appointments/${appointmentId}`, 'PUT', updates);
  }

  async deleteAppointment(appointmentId: string): Promise<MongoDBResponse<void>> {
    return this.makeRequest(`/appointments/${appointmentId}`, 'DELETE');
  }

  // Utility Methods
  async healthCheck(): Promise<MongoDBResponse<{ status: string; timestamp: Date }>> {
    return this.makeRequest('/health');
  }

  isAvailable(): boolean {
    return !this.useDemo;
  }

  getConnectionInfo() {
    return {
      available: this.isAvailable(),
      mode: this.useDemo ? 'demo' : 'live',
      baseUrl: this.baseUrl,
      database: MONGODB_CONFIG.DB_NAME,
    };
  }
}

// Export singleton instance
export const mongodbClient = new MongoDBApiClient();
export default MongoDBApiClient;
