# KMRL Train Induction Planning & Scheduling System

An AI-driven comprehensive train induction planning platform that optimizes the nightly decision-making process for Kochi Metro Rail Limited's 25 four-car trainsets.

## 🚄 Project Overview

This system handles 6 interdependent variables to optimize train scheduling:
- **Fitness Certificates** - IoT monitoring and validation
- **Job-Card Status** - IBM Maximo integration
- **Branding Priorities** - Advertisement exposure optimization
- **Mileage Balancing** - Wear distribution across trainsets
- **Cleaning Slots** - Maintenance scheduling
- **Stabling Geometry** - Energy-efficient positioning

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Service   │
│   React + TS    │◄──►│  Node.js + TS   │◄──►│  Python FastAPI │
│   Tailwind CSS  │    │   Express       │    │   OR-Tools      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                   ┌─────────────────┐
                   │   PostgreSQL    │
                   │   + Redis       │
                   └─────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with Redis caching
- **AI/ML**: Python FastAPI, scikit-learn, OR-Tools
- **Real-time**: Socket.io
- **Authentication**: JWT-based auth
- **Deployment**: Docker containers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- PostgreSQL 15+

### Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd sih-KMRL Train Induction
   npm install
   ```

2. **Start with Docker (Recommended)**
   ```bash
   npm run docker:up
   ```

3. **Manual Setup**
   ```bash
   # Start database
   docker-compose up postgres redis -d
   
   # Start backend
   cd backend
   npm install
   npm run dev
   
   # Start frontend (new terminal)
   cd frontend
   npm install
   npm start
   
   # Start AI service (new terminal)
   cd ai-service
   pip install -r requirements.txt
   python -m uvicorn main:app --reload --port 8001
   ```

### Access Points
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **AI Service**: http://localhost:8001
- **API Documentation**: http://localhost:3001/docs

## 📋 Features

### 1. Data Ingestion System
- IBM Maximo job-card API integration
- IoT fitness certificate monitoring
- Manual override capabilities
- Real-time data validation

### 2. Optimization Engine
- Multi-objective constraint solver
- Rule-based validation system
- Mileage balancing algorithms
- Branding exposure optimization
- Energy-efficient stabling geometry

### 3. Decision Support Dashboard
- Real-time trainset status visualization
- Ranked induction list generator
- Conflict detection and alerts
- What-if scenario simulation
- Explainable AI reasoning display

### 4. Machine Learning Component
- Historical decision analysis
- Predictive maintenance scheduling
- Performance optimization feedback loops
- Anomaly detection for equipment fitness

### 5. User Interfaces
- Operations supervisor dashboard
- Maintenance team interface
- Management reporting system
- Mobile-responsive design

## 🏢 User Roles

- **Operations Supervisor**: Main scheduling dashboard
- **Maintenance Team**: Job card and fitness monitoring
- **Management**: Reporting and analytics
- **System Admin**: Configuration and user management

## 📊 API Endpoints

### Core APIs
- `GET /api/trainsets` - Get all trainsets status
- `POST /api/schedule/optimize` - Generate optimized schedule
- `GET /api/fitness-certificates` - Get fitness status
- `POST /api/job-cards/sync` - Sync with Maximo
- `GET /api/analytics/performance` - Performance metrics

### Real-time Events
- `trainset:status:update` - Live status updates
- `schedule:generated` - New schedule available
- `alert:conflict` - Scheduling conflicts
- `maintenance:required` - Maintenance alerts

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend

# AI service tests
cd ai-service && python -m pytest
```

## 📦 Deployment

### Production Docker Build
```bash
npm run docker:build
docker-compose --profile production up -d
```

### Environment Variables
Create `.env` files in each service directory:

**Backend (.env)**
```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@postgres:5432/kmrl_train_db
REDIS_URL=redis://redis:6379
JWT_SECRET=your_secure_jwt_secret
AI_SERVICE_URL=http://ai-service:8001
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=http://localhost:3001
```

## 📈 Monitoring & Analytics

- Real-time performance dashboards
- Optimization success metrics
- System health monitoring
- User activity tracking
- Maintenance scheduling effectiveness

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- API rate limiting
- Data encryption at rest
- Audit logging
- CORS protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the KMRL Development Team
- Check the documentation in `/docs`

## 🎯 Roadmap

- [ ] Integration with real IBM Maximo systems
- [ ] Advanced ML models for predictive maintenance
- [ ] Mobile app for field operations
- [ ] IoT device integration
- [ ] Advanced analytics and reporting
- [ ] Multi-depot support

---

**Built for Kochi Metro Rail Limited (KMRL)**  
*Optimizing train operations through AI-driven scheduling*
