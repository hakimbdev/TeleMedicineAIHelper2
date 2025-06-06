# 🔧 API Configuration Guide for Production

## Required APIs for Full Functionality

### 1. 🗄️ **MongoDB Atlas (REQUIRED)**

**Purpose**: Database, User management, Medical records, Authentication data

**Setup Steps**:
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create account
2. Create new cluster (free tier available)
3. Set up database user and password
4. Get connection string
5. Configure network access (allow your IP)

**Environment Variables**:
```env
VITE_MONGODB_URI=mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
VITE_MONGODB_DB_NAME=telemedicine_ai
VITE_API_BASE_URL=https://your-api-domain.com/api
```

**Cost**: Free tier includes:
- 512MB storage
- Shared RAM and vCPU
- No time limit
- Basic monitoring

**Note**: Requires backend API server for full functionality

---

### 2. 📹 **Agora SDK (RECOMMENDED)**

**Purpose**: Real-time video/audio calls

**Setup Steps**:
1. Go to [console.agora.io](https://console.agora.io)
2. Create account and new project
3. Get App ID from project dashboard
4. Enable required features (RTC, RTM if needed)

**Environment Variables**:
```env
VITE_AGORA_APP_ID=your_agora_app_id_here
```

**Cost**: Free tier includes:
- 10,000 minutes/month
- Up to 100 concurrent users

**Note**: Without Agora, video calls work in demo mode only

---

### 3. 💬 **SendBird (OPTIONAL)**

**Purpose**: Enhanced chat features, message history

**Setup Steps**:
1. Go to [dashboard.sendbird.com](https://dashboard.sendbird.com)
2. Create account and application
3. Get Application ID from dashboard
4. Configure chat features as needed

**Environment Variables**:
```env
VITE_SENDBIRD_APP_ID=your_sendbird_app_id_here
```

**Cost**: Free tier includes:
- 1,000 monthly active users
- Basic chat features

**Note**: Basic chat works without SendBird

---

### 4. 🧠 **Infermedica (OPTIONAL)**

**Purpose**: AI-powered medical diagnosis and symptom checking

**Setup Steps**:
1. Go to [developer.infermedica.com](https://developer.infermedica.com)
2. Create developer account
3. Get App ID and App Key
4. Review API documentation

**Environment Variables**:
```env
VITE_INFERMEDICA_APP_ID=your_infermedica_app_id_here
VITE_INFERMEDICA_APP_KEY=your_infermedica_app_key_here
```

**Cost**: Free tier includes:
- 100 API calls/month
- Basic symptom checking

**Note**: AI chatbot works with basic responses without Infermedica

---

### 5. ✨ **Grok 3 (RECOMMENDED)**

**Purpose**: Advanced AI conversational assistant for health guidance

**Setup Steps**:
1. Get API access from xAI platform
2. Or use GitHub token for API access
3. Configure token in environment variables

**Environment Variables**:
```env
VITE_GROK_API_TOKEN=your_grok_api_token_here
```

**Cost**: Varies based on usage
- Token-based pricing
- High-quality AI responses
- Real-time streaming

**Note**: Falls back to demo mode without token

---

## 🚀 **Quick Setup for Testing**

### Minimum Viable Configuration
For basic testing, you only need:

1. **Supabase** (for authentication and data)
2. **Demo mode** (for video calls)

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_DEV_MODE=false
```

### Full Production Configuration
For complete functionality:

```env
# Required
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Recommended
VITE_AGORA_APP_ID=your_agora_app_id

# Optional
VITE_SENDBIRD_APP_ID=your_sendbird_app_id
VITE_INFERMEDICA_APP_ID=your_infermedica_app_id
VITE_INFERMEDICA_APP_KEY=your_infermedica_key

# Production settings
VITE_DEV_MODE=false
VITE_PRODUCTION_URL=https://your-domain.com
```

---

## 🔒 **Security Considerations**

### Environment Variables
- Never commit API keys to version control
- Use different keys for development/production
- Rotate keys regularly
- Monitor API usage for unusual activity

### Supabase Security
- Enable Row Level Security (RLS)
- Configure proper authentication policies
- Set up proper CORS origins
- Enable email verification for production

### Agora Security
- Use token-based authentication for production
- Implement proper channel access controls
- Monitor usage and costs
- Set up webhook notifications

---

## 📊 **Cost Estimation**

### Small Practice (< 100 users)
- **Supabase**: Free
- **Agora**: Free (< 10,000 minutes/month)
- **SendBird**: Free (< 1,000 MAU)
- **Infermedica**: Free (< 100 calls/month)
- **Total**: $0/month

### Medium Practice (100-1000 users)
- **Supabase**: $25/month (Pro plan)
- **Agora**: $50-200/month (depending on usage)
- **SendBird**: $399/month (Starter plan)
- **Infermedica**: $99/month (Basic plan)
- **Total**: $573-723/month

### Large Practice (1000+ users)
- **Supabase**: $25-100/month
- **Agora**: $200-1000/month
- **SendBird**: $399-999/month
- **Infermedica**: $99-499/month
- **Total**: $723-2598/month

---

## 🛠️ **Testing API Configurations**

### Test Supabase Connection
```javascript
// In browser console
const { data, error } = await supabase.auth.getSession();
console.log('Supabase connection:', error ? 'Failed' : 'Success');
```

### Test Agora Connection
```javascript
// Check if Agora SDK loads
console.log('Agora SDK:', typeof AgoraRTC !== 'undefined' ? 'Loaded' : 'Not loaded');
```

### Verify Environment Variables
```javascript
// In browser console
console.log('Environment check:', {
  supabase: !!import.meta.env.VITE_SUPABASE_URL,
  agora: !!import.meta.env.VITE_AGORA_APP_ID,
  sendbird: !!import.meta.env.VITE_SENDBIRD_APP_ID,
  infermedica: !!import.meta.env.VITE_INFERMEDICA_APP_ID
});
```

### Test Application Functionality
```javascript
// Test authentication
const testAuth = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Auth test:', error ? 'Failed' : 'Success');
  } catch (e) {
    console.log('Auth test: Failed -', e.message);
  }
};
testAuth();
```

---

## 📞 **Support Resources**

- **Supabase**: [docs.supabase.com](https://docs.supabase.com)
- **Agora**: [docs.agora.io](https://docs.agora.io)
- **SendBird**: [sendbird.com/docs](https://sendbird.com/docs)
- **Infermedica**: [developer.infermedica.com/docs](https://developer.infermedica.com/docs)
