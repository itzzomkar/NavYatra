# KMRL Train Induction System - API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Authentication](#authentication-endpoints)
  - [Trainsets](#trainsets)
  - [Schedules](#schedules)
  - [Optimization](#optimization)
  - [Analytics](#analytics)
  - [What-If Simulator](#what-if-simulator)
- [WebSocket Events](#websocket-events)
- [Status Codes](#status-codes)
- [Examples](#examples)

## Overview

The KMRL Train Induction System API provides endpoints for managing train operations, scheduling, optimization, and analytics. This RESTful API is designed to handle the complex logistics of managing 25+ trainsets for Kochi Metro Rail Limited.

### Key Features
- 🚄 Train fleet management
- 📅 Advanced scheduling optimization
- 🤖 AI-powered decision support
- 📊 Real-time analytics
- 🔧 Maintenance tracking
- 💬 WhatsApp integration
- 🎯 What-If scenario simulation

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.kmrl-system.com/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@kmrl.com",
  "password": "your-password"
}
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    // Response data here
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-123456",
    "version": "1.0.0"
  },
  "pagination": {
    // For paginated responses
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## Error Handling

Error responses include detailed error information:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-123456",
    "version": "1.0.0"
  }
}
```

## Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 1000 requests | 15 minutes |
| Authentication | 10 requests | 15 minutes |
| Optimization | 5 requests | 1 minute |
| Password Reset | 3 requests | 1 hour |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## Endpoints

### Health Check

#### GET /health
Check system health and status.

**Response:**
```json
{
  "success": true,
  "message": "System is healthy",
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "aiService": {
        "status": "up",
        "responseTime": 45,
        "lastCheck": "2024-01-15T10:30:00.000Z"
      },
      "whatsappService": {
        "status": "up",
        "responseTime": 120
      }
    },
    "system": {
      "memory": {
        "total": 8192,
        "used": 4096,
        "free": 4096,
        "usage": 50
      },
      "cpu": {
        "usage": 25,
        "load": [0.5, 0.6, 0.4]
      }
    }
  }
}
```

#### GET /health/ready
Readiness check for container orchestration.

#### GET /health/live
Liveness check for container orchestration.

#### GET /health/metrics
System metrics for monitoring.

### Authentication Endpoints

#### POST /auth/login
User authentication.

**Request:**
```json
{
  "email": "supervisor@kmrl.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-123",
      "email": "supervisor@kmrl.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "SUPERVISOR",
      "department": "OPERATIONS"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "24h"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token.

#### POST /auth/logout
User logout and token invalidation.

### Trainsets

#### GET /trainsets
Get list of trainsets with filtering and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `status`: Filter by status (`ACTIVE`, `MAINTENANCE`, `INACTIVE`)
- `manufacturer`: Filter by manufacturer
- `fitnessExpiring`: Boolean for expiring fitness certificates

**Response:**
```json
{
  "success": true,
  "message": "Retrieved 10 train sets",
  "data": {
    "items": [
      {
        "id": "TS001",
        "name": "Metro Coach 001",
        "model": "MC-2020",
        "manufacturer": "BEML",
        "status": "ACTIVE",
        "totalMileage": 45000,
        "lastMaintenanceDate": "2024-01-10T08:00:00.000Z",
        "fitnessExpiryDate": "2024-06-15T23:59:59.000Z",
        "energyEfficiency": 87.5,
        "maxCapacity": 1200,
        "currentLocation": {
          "depot": "Muttom Depot",
          "track": "Track-A1",
          "position": 1
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### GET /trainsets/:id
Get specific trainset details.

#### POST /trainsets
Create new trainset (Admin only).

**Request:**
```json
{
  "id": "TS026",
  "name": "Metro Coach 026",
  "model": "MC-2024",
  "manufacturer": "BEML",
  "yearOfManufacture": 2024,
  "maxCapacity": 1200,
  "fitnessExpiryDate": "2025-12-31T23:59:59.000Z"
}
```

#### PUT /trainsets/:id
Update trainset information.

#### DELETE /trainsets/:id
Deactivate trainset.

### Schedules

#### GET /schedules
Get schedules with date range filtering.

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `trainsetId`: Filter by specific trainset
- `status`: Filter by status

#### POST /schedules
Create new schedule entry.

#### PUT /schedules/:id
Update schedule entry.

#### DELETE /schedules/:id
Cancel/delete schedule entry.

### Optimization

#### POST /optimization/schedule
Generate optimized schedule.

**Request:**
```json
{
  "date": "2024-01-16",
  "trainsetIds": ["TS001", "TS002", "TS003"],
  "constraints": {
    "maxMileageDeviation": 100,
    "prioritizeBranding": true,
    "energyEfficiencyWeight": 0.3,
    "maintenanceWindowHours": 8
  },
  "algorithm": "hybrid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Optimization completed successfully",
  "data": {
    "scheduleId": "SCH-2024-001234",
    "optimizationScore": 94.5,
    "algorithm": "hybrid",
    "executionTime": 1.2,
    "schedule": [
      {
        "trainsetId": "TS001",
        "route": "Aluva-Palarivattom",
        "startTime": "06:00",
        "endTime": "10:30",
        "estimatedMileage": 45,
        "energyConsumption": 125,
        "priority": "HIGH"
      }
    ],
    "conflicts": [],
    "recommendations": [
      {
        "type": "MAINTENANCE_SUGGESTION",
        "trainsetId": "TS003",
        "message": "Consider scheduling maintenance within 3 days",
        "urgency": "MEDIUM"
      }
    ],
    "performance": {
      "punctualityScore": 96.2,
      "energyEfficiency": 89.1,
      "resourceUtilization": 92.8
    }
  }
}
```

#### GET /optimization/history
Get optimization history and performance.

#### GET /optimization/algorithms
Get available optimization algorithms and their performance metrics.

### Analytics

#### GET /analytics/performance
Get system performance metrics.

**Query Parameters:**
- `startDate`: Start date for metrics
- `endDate`: End date for metrics
- `metrics`: Array of metrics to include
- `trainsetIds`: Filter by specific trainsets
- `aggregation`: Time aggregation (`daily`, `weekly`, `monthly`)

**Response:**
```json
{
  "success": true,
  "message": "Performance metrics retrieved",
  "data": {
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-15"
    },
    "metrics": {
      "punctuality": {
        "average": 96.8,
        "trend": "improving",
        "data": [
          { "date": "2024-01-01", "value": 95.2 },
          { "date": "2024-01-02", "value": 97.1 }
        ]
      },
      "availability": {
        "average": 92.3,
        "trend": "stable",
        "data": [
          { "date": "2024-01-01", "value": 91.8 },
          { "date": "2024-01-02", "value": 92.7 }
        ]
      },
      "energyEfficiency": {
        "average": 87.5,
        "trend": "improving",
        "unit": "percentage"
      }
    },
    "summary": {
      "totalTrips": 1250,
      "onTimeTrips": 1210,
      "delayedTrips": 40,
      "averageDelay": 2.3
    }
  }
}
```

#### GET /analytics/dashboard
Get dashboard data for specific user.

### What-If Simulator

#### POST /whatif/simulate
Run what-if scenario simulation.

**Request:**
```json
{
  "name": "Trainset Breakdown Scenario",
  "description": "Simulate impact of TS001 breakdown during peak hours",
  "modifications": {
    "trainsetChanges": [
      {
        "trainsetId": "TS001",
        "changes": {
          "status": "MAINTENANCE",
          "availabilityHours": 0
        }
      }
    ],
    "emergencyScenarios": ["TRAINSET_BREAKDOWN"]
  },
  "simulationParameters": {
    "duration": 1,
    "iterations": 10,
    "confidenceLevel": 0.95
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Simulation completed successfully",
  "data": {
    "simulationId": "SIM-2024-001",
    "scenario": {
      "name": "Trainset Breakdown Scenario",
      "confidence": 94.5
    },
    "results": {
      "impact": {
        "punctualityDrop": 8.2,
        "additionalDelays": 245,
        "affectedRoutes": ["Route-A", "Route-B"],
        "passengerImpact": 12500
      },
      "recommendations": [
        {
          "action": "Deploy backup trainset TS025",
          "expectedImprovement": 6.1,
          "implementationTime": 15
        }
      ],
      "alternatives": [
        {
          "scenario": "Use alternative routing",
          "impactReduction": 4.3,
          "feasibility": 0.87
        }
      ]
    },
    "performance": {
      "executionTime": 3.4,
      "iterations": 10,
      "convergence": true
    }
  }
}
```

## WebSocket Events

The system provides real-time updates through WebSocket connections.

### Connection
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### trainset:status:update
Real-time trainset status updates.

```javascript
{
  "trainsetId": "TS001",
  "status": "IN_TRANSIT",
  "location": {
    "route": "Route-A",
    "position": "Station-5"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### schedule:conflict
Schedule conflict alerts.

```javascript
{
  "conflictId": "CONF-001",
  "type": "DOUBLE_BOOKING",
  "trainsets": ["TS001", "TS002"],
  "timeSlot": {
    "start": "2024-01-16T08:00:00.000Z",
    "end": "2024-01-16T12:00:00.000Z"
  },
  "severity": "HIGH",
  "suggestions": [
    "Reschedule TS002 to 12:30-16:30"
  ]
}
```

#### optimization:complete
Optimization completion notification.

#### maintenance:alert
Maintenance alerts and reminders.

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request successful, no response body |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 502 | Bad Gateway - External service error |
| 503 | Service Unavailable - Service temporarily unavailable |

## Examples

### Complete Workflow Example

1. **Authenticate**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supervisor@kmrl.com","password":"password123"}'
```

2. **Get Trainset List**
```bash
curl -X GET http://localhost:3001/api/trainsets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Generate Optimized Schedule**
```bash
curl -X POST http://localhost:3001/api/optimization/schedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-16",
    "trainsetIds": ["TS001", "TS002", "TS003"],
    "algorithm": "hybrid"
  }'
```

4. **Run What-If Simulation**
```bash
curl -X POST http://localhost:3001/api/whatif/simulate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Peak Hour Analysis",
    "modifications": {
      "trainsetChanges": [{
        "trainsetId": "TS001",
        "changes": {"status": "MAINTENANCE"}
      }]
    }
  }'
```

### Error Handling Example

```javascript
// Handle API responses
async function apiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`API Error: ${data.error.code} - ${data.error.message}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('API Request failed:', error.message);
    throw error;
  }
}
```

## SDK and Client Libraries

### JavaScript/Node.js
```javascript
const KMRLClient = require('@kmrl/api-client');

const client = new KMRLClient({
  baseURL: 'http://localhost:3001/api',
  token: 'your-jwt-token'
});

// Get trainsets
const trainsets = await client.trainsets.list({ status: 'ACTIVE' });

// Run optimization
const schedule = await client.optimization.schedule({
  date: '2024-01-16',
  trainsetIds: ['TS001', 'TS002']
});
```

### Python
```python
from kmrl_client import KMRLClient

client = KMRLClient(
    base_url='http://localhost:3001/api',
    token='your-jwt-token'
)

# Get trainsets
trainsets = client.trainsets.list(status='ACTIVE')

# Run optimization
schedule = client.optimization.schedule(
    date='2024-01-16',
    trainset_ids=['TS001', 'TS002']
)
```

---

**Last Updated:** January 15, 2024
**API Version:** 1.0.0
**Documentation Version:** 1.0.0

For more information, contact the KMRL Development Team or check our [GitHub repository](https://github.com/kmrl/train-induction-system).