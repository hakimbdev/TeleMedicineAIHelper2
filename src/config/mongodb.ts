// MongoDB Configuration for TeleMedicine AI Helper
export const MONGODB_CONFIG = {
  // Connection Configuration
  URI: import.meta.env.VITE_MONGODB_URI || '',
  DB_NAME: import.meta.env.VITE_MONGODB_DB_NAME || 'telemedicine_ai',
  
  // Collection Names
  COLLECTIONS: {
    USERS: 'users',
    PROFILES: 'profiles', 
    MEDICAL_RECORDS: 'medical_records',
    APPOINTMENTS: 'appointments',
    PRESCRIPTIONS: 'prescriptions',
    CONSULTATIONS: 'consultations',
    CHAT_MESSAGES: 'chat_messages',
    CHAT_CHANNELS: 'chat_channels',
    DIAGNOSIS_SESSIONS: 'diagnosis_sessions',
    NOTIFICATIONS: 'notifications',
    SESSIONS: 'sessions', // For authentication sessions
  },
  
  // Connection Options
  OPTIONS: {
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },
  
  // Indexes for Performance
  INDEXES: {
    users: [
      { email: 1 },
      { 'profile.role': 1 },
      { createdAt: -1 }
    ],
    medical_records: [
      { patientId: 1 },
      { doctorId: 1 },
      { createdAt: -1 },
      { 'status': 1 }
    ],
    appointments: [
      { patientId: 1 },
      { doctorId: 1 },
      { appointmentDate: 1 },
      { status: 1 }
    ],
    chat_messages: [
      { channelId: 1 },
      { createdAt: -1 },
      { senderId: 1 }
    ]
  }
};

// User Roles Enum
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
  NURSE = 'nurse',
}

// Status Enums
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum RecordStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum RecordType {
  CONSULTATION = 'consultation',
  DIAGNOSIS = 'diagnosis',
  PRESCRIPTION = 'prescription',
  LAB_RESULT = 'lab_result',
  IMAGING = 'imaging',
  OTHER = 'other',
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system',
}

export enum ChannelType {
  CONSULTATION = 'consultation',
  SUPPORT = 'support',
  GENERAL = 'general',
}

export enum NotificationType {
  APPOINTMENT = 'appointment',
  MESSAGE = 'message',
  PRESCRIPTION = 'prescription',
  SYSTEM = 'system',
  EMERGENCY = 'emergency',
}

// Validation Functions
export const validateMongoDBConfig = (): boolean => {
  return !!(MONGODB_CONFIG.URI && MONGODB_CONFIG.DB_NAME);
};

export const isMongoDBAvailable = (): boolean => {
  return validateMongoDBConfig();
};

// Demo Mode Detection
export const isDemoMode = (): boolean => {
  const devMode = import.meta.env.VITE_DEV_MODE === 'true';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  // Use demo mode if:
  // 1. Dev mode is explicitly enabled
  // 2. API base URL is not properly configured for production
  // 3. We're in development environment
  return devMode ||
         !apiBaseUrl ||
         apiBaseUrl.includes('localhost') ||
         apiBaseUrl.includes('your-backend-api') ||
         import.meta.env.DEV;
};

// Error Handling
export class MongoDBError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MongoDBError';
  }
}

export const handleMongoDBError = (error: any): never => {
  console.error('MongoDB Error:', error);
  
  if (error.code === 11000) {
    throw new MongoDBError('Duplicate entry found', 'DUPLICATE_KEY');
  }
  
  if (error.name === 'ValidationError') {
    throw new MongoDBError('Invalid data provided', 'VALIDATION_ERROR');
  }
  
  if (error.name === 'CastError') {
    throw new MongoDBError('Invalid ID format', 'INVALID_ID');
  }
  
  throw new MongoDBError(error.message || 'Database operation failed', error.code);
};

// Default Values
export const DEFAULT_VALUES = {
  pagination: {
    limit: 20,
    skip: 0,
  },
  user: {
    role: UserRole.PATIENT,
    isActive: true,
  },
  appointment: {
    duration: 30, // minutes
    status: AppointmentStatus.SCHEDULED,
  },
  medicalRecord: {
    status: RecordStatus.ACTIVE,
    type: RecordType.CONSULTATION,
  },
};

export default MONGODB_CONFIG;
