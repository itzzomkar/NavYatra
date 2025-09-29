# 🗄️ KMRL Train Induction System - Data Storage Guide

## 📍 **WHERE IS ALL DATA STORED?**

### 🔐 **1. USER DATA (Authentication System)**

**Database**: MongoDB  
**Location**: `mongodb://localhost:27017/auth_system_db`  
**Collection**: `users`

**What's Stored:**
- User accounts (Admin, Supervisor, Operator, Maintenance, etc.)
- Login credentials (encrypted passwords)
- User profiles, roles, permissions
- Login timestamps

**Physical Storage:**
- **Windows**: `C:\Program Files\MongoDB\Server\8.0\data\`
- **Database Name**: `auth_system_db`
- **Collection**: `users`

**Backend Model Location:**
- `backend-auth-system/models/User.js`

**Sample User Document:**
```json
{
  "_id": "68c51f72e503eac09e8ff07c",
  "username": "admin",
  "email": "admin@kmrl.com",
  "password": "$2b$12$encrypted_hash_here",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "isActive": true,
  "createdAt": "2025-09-13T07:38:26.914Z",
  "updatedAt": "2025-09-13T07:44:32.479Z",
  "lastLogin": "2025-09-13T07:44:32.475Z"
}
```

---

### 🚆 **2. TRAINS & SYSTEM DATA**

**Note**: Currently your authentication system only handles users. For trains and other components, here's where they would be stored:

#### **A. Database Storage (MongoDB)**
**Location**: Same MongoDB instance
**Collections Would Be**:
- `trainsets` - Train information
- `schedules` - Train schedules
- `maintenance` - Maintenance records
- `fitness` - Fitness certificates
- `jobcards` - Job cards/work orders

#### **B. Backend Models (Would Be Created)**
```
backend-auth-system/models/
├── User.js ✅ (Already exists)
├── Trainset.js ❌ (Not created yet)
├── Schedule.js ❌ (Not created yet)
├── Maintenance.js ❌ (Not created yet)
├── Fitness.js ❌ (Not created yet)
└── JobCard.js ❌ (Not created yet)
```

#### **C. Frontend API Services**
```
frontend/src/services/
├── auth.ts ✅ (Already configured)
├── api.ts ✅ (Already configured) 
├── trainsets.ts ❌ (References non-existent backend)
├── fitness.ts ❌ (References non-existent backend)
└── optimization.ts ❌ (References non-existent backend)
```

---

### 🛢️ **3. CURRENT ACTUAL DATA LOCATIONS**

#### **✅ WORKING DATA:**
1. **User Authentication Data**
   - **Database**: MongoDB at `localhost:27017`
   - **Database Name**: `auth_system_db`
   - **Collection**: `users`
   - **Records**: 5 users (Admin, Supervisor, Operator, Maintenance, Test User)

#### **❌ NOT YET IMPLEMENTED:**
1. **Train Data** - Not stored anywhere yet
2. **Schedule Data** - Not stored anywhere yet  
3. **Maintenance Records** - Not stored anywhere yet
4. **Fitness Certificates** - Not stored anywhere yet
5. **Job Cards** - Not stored anywhere yet

---

### 📂 **4. FILE SYSTEM LOCATIONS**

#### **Configuration Files:**
```
📁 C:\Users\Omkar\OneDrive\Desktop\sih-KMRL Train Induction\
├── 📁 backend-auth-system/
│   ├── 📄 .env (Database connection settings)
│   ├── 📁 models/ (Data structure definitions)
│   └── 📁 config/database.js (DB connection)
├── 📁 frontend/
│   ├── 📄 .env (API endpoint configurations)
│   └── 📁 src/services/ (API communication)
└── 📁 database/ (Possibly contains setup scripts)
```

#### **Log Files:**
- **Application Logs**: Console output (not persisted)
- **MongoDB Logs**: `C:\Program Files\MongoDB\Server\8.0\log\`

---

### 🔍 **5. HOW TO VIEW/ACCESS THE DATA**

#### **A. View User Data (MongoDB)**
```bash
# Connect to MongoDB
mongo

# Switch to your database
use auth_system_db

# View all users
db.users.find().pretty()

# Count users
db.users.count()
```

#### **B. View via Backend API**
```bash
# Get all users (requires admin token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/user/all
```

#### **C. View via Frontend**
- Login to the system at `http://localhost:3000`
- Admin users can see user management features

---

### 📊 **6. DATA FLOW DIAGRAM**

```
Frontend (localhost:3000)
    ↕️ HTTP Requests
Backend API (localhost:5000) 
    ↕️ MongoDB Queries
MongoDB Database (localhost:27017)
    ↕️ File System
Physical Storage (C:\Program Files\MongoDB\)
```

---

### 🎯 **7. SUMMARY OF ACTUAL DATA LOCATIONS**

| Component | Status | Location | Database | Collection |
|-----------|--------|----------|----------|------------|
| **Users** | ✅ Working | MongoDB | `auth_system_db` | `users` |
| **Trains** | ❌ Not implemented | N/A | N/A | N/A |
| **Schedules** | ❌ Not implemented | N/A | N/A | N/A |
| **Maintenance** | ❌ Not implemented | N/A | N/A | N/A |
| **Fitness** | ❌ Not implemented | N/A | N/A | N/A |

---

### 💡 **NEXT STEPS TO ADD MORE DATA:**

If you want to store train data, schedules, etc., you would need to:

1. **Create MongoDB collections** for each data type
2. **Create backend models** (like User.js)
3. **Create API endpoints** for CRUD operations
4. **Update frontend services** to connect to new endpoints

**Would you like me to help you implement any of these data storage systems?** 🚀