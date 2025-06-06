import mongoose from 'mongoose';

class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('📊 Database already connected');
      return;
    }

    try {
      const mongoUri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB_NAME;

      if (!mongoUri) {
        console.log('⚠️ MongoDB URI not configured - running in demo mode');
        console.log('📊 Database operations will use mock data');
        this.isConnected = true; // Set as connected for demo mode
        return;
      }

      // MongoDB connection options
      const options = {
        dbName,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferMaxEntries: 0, // Disable mongoose buffering
        bufferCommands: false, // Disable mongoose buffering
        retryWrites: true,
        w: 'majority' as const,
      };

      // Connect to MongoDB
      await mongoose.connect(mongoUri, options);

      this.isConnected = true;
      console.log('✅ Connected to MongoDB successfully');
      console.log(`📊 Database: ${dbName}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('📊 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public isConnectionActive(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getConnectionState(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
  }

  public async healthCheck(): Promise<{
    status: string;
    database: string;
    collections: number;
    uptime: number;
    mode?: string;
  }> {
    try {
      // Check if running in demo mode
      if (!process.env.MONGODB_URI) {
        return {
          status: 'healthy',
          database: 'demo-mode',
          collections: 3, // Mock collections count
          uptime: process.uptime(),
          mode: 'demo',
        };
      }

      if (!this.isConnectionActive()) {
        throw new Error('Database not connected');
      }

      const admin = mongoose.connection.db!.admin();
      const serverStatus = await admin.serverStatus();
      const collections = await mongoose.connection.db!.listCollections().toArray();

      return {
        status: 'healthy',
        database: mongoose.connection.name,
        collections: collections.length,
        uptime: serverStatus.uptime,
        mode: 'live',
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error}`);
    }
  }

  public async createIndexes(): Promise<void> {
    try {
      // Skip index creation in demo mode
      if (!process.env.MONGODB_URI) {
        console.log('📊 Skipping index creation - demo mode');
        return;
      }

      console.log('📊 Creating database indexes...');

      // Import models to ensure indexes are created
      await import('../models/User');
      await import('../models/MedicalRecord');
      await import('../models/Session');

      // Ensure indexes are created
      await mongoose.connection.db!.collection('users').createIndex({ email: 1 }, { unique: true });
      await mongoose.connection.db!.collection('users').createIndex({ 'profile.role': 1 });
      await mongoose.connection.db!.collection('users').createIndex({ createdAt: -1 });

      await mongoose.connection.db!.collection('medicalrecords').createIndex({ patientId: 1, createdAt: -1 });
      await mongoose.connection.db!.collection('medicalrecords').createIndex({ doctorId: 1, createdAt: -1 });
      await mongoose.connection.db!.collection('medicalrecords').createIndex({ status: 1 });

      await mongoose.connection.db!.collection('sessions').createIndex({ sessionToken: 1 }, { unique: true });
      await mongoose.connection.db!.collection('sessions').createIndex({ userId: 1 });
      await mongoose.connection.db!.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  public async seedDatabase(): Promise<void> {
    try {
      // Skip database seeding in demo mode
      if (!process.env.MONGODB_URI) {
        console.log('🌱 Skipping database seeding - demo mode');
        console.log('📊 Demo users available in frontend demo mode');
        return;
      }

      console.log('🌱 Seeding database with initial data...');

      const { User } = await import('../models/User');

      // Check if admin user exists
      const adminExists = await User.findOne({ 'profile.role': 'admin' });

      if (!adminExists) {
        // Create default admin user
        const adminUser = new User({
          email: 'admin@telemedicine-ai.com',
          passwordHash: 'admin123456', // Will be hashed by pre-save middleware
          emailVerified: true,
          profile: {
            fullName: 'System Administrator',
            role: 'admin',
            isActive: true,
            preferences: {
              notifications: true,
              emailUpdates: true,
              language: 'en',
              timezone: 'UTC',
            },
          },
        });

        await adminUser.save();
        console.log('✅ Default admin user created');
      }

      // Create demo users if in development
      if (process.env.NODE_ENV === 'development') {
        const demoPatient = await User.findOne({ email: 'patient@telemedicine.demo' });
        const demoDoctor = await User.findOne({ email: 'doctor@telemedicine.demo' });

        if (!demoPatient) {
          const patient = new User({
            email: 'patient@telemedicine.demo',
            passwordHash: 'demo123456',
            emailVerified: true,
            profile: {
              fullName: 'Demo Patient',
              role: 'patient',
              phone: '+1234567890',
              isActive: true,
              preferences: {
                notifications: true,
                emailUpdates: true,
                language: 'en',
                timezone: 'UTC',
              },
            },
          });
          await patient.save();
          console.log('✅ Demo patient user created');
        }

        if (!demoDoctor) {
          const doctor = new User({
            email: 'doctor@telemedicine.demo',
            passwordHash: 'demo123456',
            emailVerified: true,
            profile: {
              fullName: 'Dr. Demo',
              role: 'doctor',
              phone: '+1234567891',
              medicalLicense: 'MD123456',
              specialization: 'General Medicine',
              department: 'Internal Medicine',
              isActive: true,
              preferences: {
                notifications: true,
                emailUpdates: true,
                language: 'en',
                timezone: 'UTC',
              },
            },
          });
          await doctor.save();
          console.log('✅ Demo doctor user created');
        }
      }

      console.log('🌱 Database seeding completed');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }
}

export const databaseService = DatabaseService.getInstance();
