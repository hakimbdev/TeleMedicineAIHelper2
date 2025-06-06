# 🚀 MongoDB Backend Deployment Guide

## ✅ **PRODUCTION-READY BACKEND COMPLETE!**

Your TeleMedicine AI Helper now has a complete, production-ready MongoDB backend with:

1. **🗄️ MongoDB Integration** (Atlas-ready with connection pooling)
2. **🔐 JWT Authentication** (Secure session management)
3. **👥 User Management** (Role-based access control)
4. **🏥 Medical Records API** (CRUD operations with permissions)
5. **🛡️ Security Features** (Rate limiting, validation, CORS)
6. **📊 Health Monitoring** (Database health checks)

## 🏗️ **Backend Architecture**

```
backend/
├── src/
│   ├── controllers/          # API endpoint handlers
│   │   ├── authController.ts
│   │   └── medicalRecordsController.ts
│   ├── middleware/           # Authentication & validation
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── models/              # MongoDB schemas
│   │   ├── User.ts
│   │   ├── MedicalRecord.ts
│   │   └── Session.ts
│   ├── routes/              # API route definitions
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── medicalRecords.ts
│   ├── services/            # Business logic
│   │   ├── database.ts
│   │   └── auth.ts
│   └── server.ts            # Main server file
├── .env                     # Development environment
├── .env.production          # Production environment
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
cd backend
npm install
```

### **2. Configure Environment**
```bash
# Copy and edit environment file
cp .env.production .env
# Edit .env with your MongoDB password and JWT secrets
```

### **3. Start Development Server**
```bash
npm run dev
```

### **4. Build for Production**
```bash
npm run build
npm start
```

## 🔧 **Environment Configuration**

### **Required Environment Variables**

#### **MongoDB Configuration**
```env
MONGODB_URI=mongodb+srv://aahmaddadani:<db_password>@cluster0.02iynkx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=telemedicine_ai
```

#### **JWT Secrets (CRITICAL - Change in Production!)**
```env
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_REFRESH_SECRET=your_super_secret_refresh_key_minimum_32_characters
```

#### **CORS Origins**
```env
CORS_ORIGIN=http://localhost:5174,https://your-frontend-domain.com
```

### **Optional Configuration**
- Email notifications (SMTP)
- File upload (Cloudinary)
- Rate limiting settings
- Logging configuration

## 📡 **API Endpoints**

### **Authentication Endpoints**
```
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
POST /api/auth/refresh      # Refresh access token
POST /api/auth/verify       # Verify session
POST /api/auth/forgot-password    # Request password reset
POST /api/auth/reset-password     # Reset password
```

### **User Management**
```
GET  /api/users/profile     # Get current user profile
PUT  /api/users/profile     # Update user profile
GET  /api/users             # Get all users (Admin only)
GET  /api/users/:id         # Get user by ID (Admin only)
PUT  /api/users/:id/status  # Update user status (Admin only)
GET  /api/users/role/doctors # Get all doctors
```

### **Medical Records**
```
GET    /api/medical-records       # Get medical records (filtered by role)
GET    /api/medical-records/stats # Get medical record statistics
GET    /api/medical-records/:id   # Get single medical record
POST   /api/medical-records       # Create medical record (Doctor/Admin)
PUT    /api/medical-records/:id   # Update medical record (Doctor/Admin)
DELETE /api/medical-records/:id   # Delete medical record (Doctor/Admin)
```

### **Health Check**
```
GET /health                 # Server and database health status
```

## 🛡️ **Security Features**

### **Authentication & Authorization**
- JWT-based authentication with refresh tokens
- Role-based access control (Patient, Doctor, Admin, Nurse)
- Session management with automatic cleanup
- Account lockout after failed login attempts

### **Data Protection**
- Password hashing with bcrypt (12 rounds)
- Input validation with Joi schemas
- SQL injection prevention (MongoDB)
- XSS protection with helmet

### **Rate Limiting**
- Global rate limiting (100 requests per 15 minutes)
- Authentication endpoint limiting (5 attempts per 15 minutes)
- Password reset limiting (3 attempts per hour)

### **CORS & Security Headers**
- Configurable CORS origins
- Security headers with helmet
- Request compression
- Trust proxy configuration

## 🗄️ **Database Schema**

### **User Collection**
```javascript
{
  email: String (unique),
  passwordHash: String,
  emailVerified: Boolean,
  profile: {
    fullName: String,
    role: Enum ['patient', 'doctor', 'admin', 'nurse'],
    phone: String,
    dateOfBirth: Date,
    gender: Enum ['male', 'female', 'other'],
    // Doctor-specific fields
    medicalLicense: String,
    specialization: String,
    department: String,
    // System fields
    isActive: Boolean,
    preferences: Object
  },
  createdAt: Date,
  updatedAt: Date
}
```

### **Medical Record Collection**
```javascript
{
  patientId: ObjectId (ref: User),
  doctorId: ObjectId (ref: User),
  title: String,
  description: String,
  diagnosis: String,
  symptoms: Array,
  medications: Array,
  vitalSigns: Object,
  labResults: Array,
  treatmentPlan: String,
  notes: String,
  recordType: Enum,
  status: Enum,
  visitDate: Date,
  tags: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### **Session Collection**
```javascript
{
  userId: ObjectId (ref: User),
  sessionToken: String (unique),
  expiresAt: Date (TTL index),
  userAgent: String,
  ipAddress: String,
  isActive: Boolean,
  lastActivity: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 **Deployment Options**

### **1. Heroku Deployment**
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your_mongodb_uri"
heroku config:set JWT_SECRET="your_jwt_secret"

# Deploy
git push heroku main
```

### **2. Railway Deployment**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### **3. DigitalOcean App Platform**
1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy with automatic builds

### **4. AWS/Google Cloud/Azure**
- Use container deployment with Docker
- Set up load balancer and auto-scaling
- Configure environment variables in cloud console

## 🔧 **Frontend Integration**

### **Update Frontend Environment**
```env
# In frontend/.env
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_MONGODB_URI=# Remove this - not needed for frontend
```

### **Update Frontend API Client**
The existing `mongodbApi.ts` will automatically work with the backend once you update the `VITE_API_BASE_URL`.

## 📊 **Monitoring & Maintenance**

### **Health Checks**
- Database connection monitoring
- Automatic session cleanup
- Server uptime tracking
- Error logging and reporting

### **Database Maintenance**
- Automatic index creation
- Session cleanup (hourly)
- Connection pooling
- Graceful shutdown handling

### **Logging**
- Request logging with Morgan
- Error logging to console/file
- Development vs production log levels
- Structured error responses

## 🧪 **Testing the Backend**

### **1. Health Check**
```bash
curl https://your-backend-domain.com/health
```

### **2. User Registration**
```bash
curl -X POST https://your-backend-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "role": "patient"
  }'
```

### **3. User Login**
```bash
curl -X POST https://your-backend-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🎯 **Next Steps**

1. **Deploy Backend**: Choose a deployment platform and deploy
2. **Update Frontend**: Change API_BASE_URL to your backend domain
3. **Test Integration**: Verify frontend can communicate with backend
4. **Set Up Monitoring**: Add error tracking and performance monitoring
5. **Configure SSL**: Ensure HTTPS for production
6. **Set Up CI/CD**: Automate deployments with GitHub Actions

## 🆘 **Troubleshooting**

### **Common Issues**

#### **MongoDB Connection Failed**
- Verify MongoDB URI and password
- Check network access in MongoDB Atlas
- Ensure IP whitelist includes your server

#### **CORS Errors**
- Update CORS_ORIGIN with your frontend domain
- Ensure credentials are properly configured

#### **JWT Token Issues**
- Verify JWT secrets are set and consistent
- Check token expiration times
- Ensure proper token format in requests

#### **Permission Denied**
- Verify user roles and permissions
- Check authentication middleware
- Ensure proper route protection

The MongoDB backend is now **production-ready** and fully integrated with your TeleMedicine AI Helper!
