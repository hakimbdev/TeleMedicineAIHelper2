import mongoose, { Document, Schema } from 'mongoose';

// Session Document Interface
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  sessionToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isExpired(): boolean;
  refresh(): void;
}

// Session Schema
const SessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index
  },
  userAgent: {
    type: String,
    trim: true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Indexes
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ sessionToken: 1, isActive: 1 });
SessionSchema.index({ expiresAt: 1 });

// Method to check if session is expired
SessionSchema.methods.isExpired = function(): boolean {
  return this.expiresAt < new Date();
};

// Method to refresh session
SessionSchema.methods.refresh = function(): void {
  const expirationTime = parseInt(process.env.JWT_EXPIRES_IN?.replace('h', '') || '24') * 60 * 60 * 1000;
  this.expiresAt = new Date(Date.now() + expirationTime);
  this.lastActivity = new Date();
};

// Pre-save middleware to update lastActivity
SessionSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);
