import mongoose, { Document, Schema } from 'mongoose';

// Enums
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

// Interfaces
export interface ISymptom {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  notes?: string;
}

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export interface IAllergy {
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface IVitalSigns {
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
}

export interface ILabResult {
  testName: string;
  result: string;
  normalRange: string;
  unit: string;
  testDate: Date;
  notes?: string;
}

export interface IImagingResult {
  type: string;
  description: string;
  findings: string;
  imageUrl?: string;
  reportUrl?: string;
  date: Date;
}

export interface IAttachment {
  filename: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

// Medical Record Document Interface
export interface IMedicalRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  diagnosis?: string;
  symptoms?: ISymptom[];
  medications?: IMedication[];
  allergies?: IAllergy[];
  vitalSigns?: IVitalSigns;
  labResults?: ILabResult[];
  imagingResults?: IImagingResult[];
  treatmentPlan?: string;
  notes?: string;
  attachments?: IAttachment[];
  recordType: RecordType;
  status: RecordStatus;
  visitDate: Date;
  followUpDate?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Medical Record Schema
const MedicalRecordSchema = new Schema<IMedicalRecord>({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  diagnosis: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  symptoms: [{
    name: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], required: true },
    duration: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
  }],
  medications: [{
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    notes: { type: String, trim: true },
  }],
  allergies: [{
    allergen: { type: String, required: true, trim: true },
    reaction: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], required: true },
  }],
  vitalSigns: {
    temperature: { type: Number, min: 90, max: 110 },
    bloodPressure: {
      systolic: { type: Number, min: 70, max: 250 },
      diastolic: { type: Number, min: 40, max: 150 },
    },
    heartRate: { type: Number, min: 30, max: 200 },
    respiratoryRate: { type: Number, min: 8, max: 40 },
    oxygenSaturation: { type: Number, min: 70, max: 100 },
    weight: { type: Number, min: 0, max: 500 },
    height: { type: Number, min: 0, max: 300 },
    bmi: { type: Number, min: 10, max: 60 },
    recordedAt: { type: Date, required: true, default: Date.now },
  },
  labResults: [{
    testName: { type: String, required: true, trim: true },
    result: { type: String, required: true, trim: true },
    normalRange: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    testDate: { type: Date, required: true },
    notes: { type: String, trim: true },
  }],
  imagingResults: [{
    type: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    findings: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    reportUrl: { type: String, trim: true },
    date: { type: Date, required: true },
  }],
  treatmentPlan: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  attachments: [{
    filename: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    uploadedAt: { type: Date, required: true, default: Date.now },
  }],
  recordType: {
    type: String,
    enum: Object.values(RecordType),
    required: true,
    default: RecordType.CONSULTATION,
  },
  status: {
    type: String,
    enum: Object.values(RecordStatus),
    required: true,
    default: RecordStatus.ACTIVE,
  },
  visitDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  followUpDate: {
    type: Date,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
}, {
  timestamps: true,
});

// Indexes for performance
MedicalRecordSchema.index({ patientId: 1, createdAt: -1 });
MedicalRecordSchema.index({ doctorId: 1, createdAt: -1 });
MedicalRecordSchema.index({ status: 1 });
MedicalRecordSchema.index({ recordType: 1 });
MedicalRecordSchema.index({ visitDate: -1 });
MedicalRecordSchema.index({ tags: 1 });

// Text search index
MedicalRecordSchema.index({
  title: 'text',
  description: 'text',
  diagnosis: 'text',
  notes: 'text',
});

// Virtual for patient population
MedicalRecordSchema.virtual('patient', {
  ref: 'User',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for doctor population
MedicalRecordSchema.virtual('doctor', {
  ref: 'User',
  localField: 'doctorId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtual fields are serialized
MedicalRecordSchema.set('toJSON', { virtuals: true });
MedicalRecordSchema.set('toObject', { virtuals: true });

export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);
