// MongoDB Data Models for TeleMedicine AI Helper

import { UserRole, AppointmentStatus, RecordStatus, RecordType, MessageType, ChannelType, NotificationType } from '../config/mongodb';

// Base Document Interface
export interface BaseDocument {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// User Document (Authentication)
export interface UserDocument extends BaseDocument {
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  profile: UserProfile;
}

// User Profile
export interface UserProfile {
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  // Doctor-specific fields
  medicalLicense?: string;
  specialization?: string;
  department?: string;
  // Patient-specific fields
  allergies?: string[];
  medications?: string[];
  medicalHistory?: string[];
  // System fields
  isActive: boolean;
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
    language: string;
    timezone: string;
  };
}

// Medical Record Document
export interface MedicalRecordDocument extends BaseDocument {
  patientId: string;
  doctorId?: string;
  title: string;
  description?: string;
  diagnosis?: string;
  symptoms?: {
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    duration: string;
    notes?: string;
  }[];
  medications?: {
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    notes?: string;
  }[];
  allergies?: {
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe';
  }[];
  vitalSigns?: {
    temperature?: number;
    bloodPressure?: {
      systolic: number;
      diastolic: number;
    };
    heartRate?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    bmi?: number;
    recordedAt: Date;
  };
  labResults?: {
    testName: string;
    result: string;
    normalRange: string;
    unit: string;
    testDate: Date;
    notes?: string;
  }[];
  imagingResults?: {
    type: string;
    description: string;
    findings: string;
    imageUrl?: string;
    reportUrl?: string;
    date: Date;
  }[];
  treatmentPlan?: string;
  notes?: string;
  attachments?: {
    filename: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
  }[];
  recordType: RecordType;
  status: RecordStatus;
  visitDate: Date;
  followUpDate?: Date;
  tags?: string[];
}

// Appointment Document
export interface AppointmentDocument extends BaseDocument {
  patientId: string;
  doctorId: string;
  title: string;
  description?: string;
  appointmentDate: Date;
  duration: number; // in minutes
  status: AppointmentStatus;
  appointmentType: string;
  meetingUrl?: string;
  notes?: string;
  reminderSent?: boolean;
  cancelReason?: string;
  rescheduleHistory?: {
    originalDate: Date;
    newDate: Date;
    reason: string;
    rescheduledAt: Date;
  }[];
}

// Prescription Document
export interface PrescriptionDocument extends BaseDocument {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    quantity: number;
    refills: number;
  }[];
  diagnosis: string;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  prescribedDate: Date;
  expiryDate?: Date;
  pharmacyInfo?: {
    name: string;
    address: string;
    phone: string;
  };
}

// Chat Channel Document
export interface ChatChannelDocument extends BaseDocument {
  name: string;
  type: ChannelType;
  participants: string[]; // User IDs
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
  };
  isActive: boolean;
  metadata?: {
    appointmentId?: string;
    consultationId?: string;
    topic?: string;
  };
}

// Chat Message Document
export interface ChatMessageDocument extends BaseDocument {
  channelId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  attachments?: {
    filename: string;
    url: string;
    type: string;
    size: number;
  }[];
  replyTo?: string; // Message ID
  edited?: boolean;
  editedAt?: Date;
  readBy?: {
    userId: string;
    readAt: Date;
  }[];
  reactions?: {
    emoji: string;
    users: string[];
  }[];
}

// Diagnosis Session Document
export interface DiagnosisSessionDocument extends BaseDocument {
  userId: string;
  sessionId: string;
  symptoms: string[];
  responses: {
    questionId: string;
    question: string;
    answer: string;
    timestamp: Date;
  }[];
  diagnosis?: {
    conditions: {
      name: string;
      probability: number;
      description: string;
    }[];
    triage: {
      level: string;
      description: string;
      recommendation: string;
    };
  };
  status: 'active' | 'completed' | 'abandoned';
  completedAt?: Date;
}

// Notification Document
export interface NotificationDocument extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  readAt?: Date;
  actionUrl?: string;
  metadata?: {
    appointmentId?: string;
    messageId?: string;
    prescriptionId?: string;
  };
  expiresAt?: Date;
}

// Session Document (for authentication)
export interface SessionDocument extends BaseDocument {
  userId: string;
  sessionToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
}

// API Response Types
export interface MongoDBResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Query Options
export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  select?: string[];
  populate?: string[];
}

// Filter Types
export interface UserFilter {
  role?: UserRole;
  isActive?: boolean;
  email?: string;
  search?: string; // Search in name, email
}

export interface MedicalRecordFilter {
  patientId?: string;
  doctorId?: string;
  status?: RecordStatus;
  recordType?: RecordType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface AppointmentFilter {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  appointmentType?: string;
}

// Update Types
export type UserUpdate = Partial<Omit<UserDocument, '_id' | 'createdAt' | 'updatedAt'>>;
export type MedicalRecordUpdate = Partial<Omit<MedicalRecordDocument, '_id' | 'createdAt' | 'updatedAt'>>;
export type AppointmentUpdate = Partial<Omit<AppointmentDocument, '_id' | 'createdAt' | 'updatedAt'>>;

export default {
  UserDocument,
  UserProfile,
  MedicalRecordDocument,
  AppointmentDocument,
  PrescriptionDocument,
  ChatChannelDocument,
  ChatMessageDocument,
  DiagnosisSessionDocument,
  NotificationDocument,
  SessionDocument,
};
