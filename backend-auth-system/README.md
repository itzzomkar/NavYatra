# Backend Authentication System

A complete, secure backend authentication system built with Node.js, Express.js, MongoDB, and JWT. This system provides user registration, login, profile management, and admin functionality with comprehensive security features.

## 🚀 Features

- **User Authentication**
  - User registration/signup with validation
  - User login with JWT tokens
  - Password hashing with bcrypt
  - JWT token-based authentication

- **User Management**
  - User profile retrieval and updates
  - Email updating
  - Account deletion
  - Admin user management

- **Security Features**
  - Rate limiting for API endpoints
  - Input validation and sanitization
  - Password strength requirements
  - Secure headers with Helmet.js
  - CORS configuration
  - MongoDB injection prevention

- **Database Features**
  - MongoDB with Mongoose ODM
  - User schema with comprehensive validation
  - Indexing for performance
  - Error handling

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: bcryptjs, Helmet.js, express-rate-limit
- **Validation**: express-validator
- **Environment**: dotenv

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   cd backend-auth-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy the existing `.env` file or create one with:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/auth_system_db
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRE=7d
   BCRYPT_SALT_ROUNDS=12
   ```

4. **Start MongoDB**
   - Make sure MongoDB is running on your system
   - Windows: `net start MongoDB` (as administrator)
   - macOS/Linux: `sudo systemctl start mongod`

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Authentication Routes

#### Register User
- **POST** `/api/auth/signup`
- **Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890" // optional
  }
  ```

#### Login User
- **POST** `/api/auth/login`
- **Body**:
  ```json
  {
    "identifier": "john@example.com", // or username
    "password": "Password123"
  }
  ```

#### Logout User
- **POST** `/api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`

### User Routes (Authenticated)

#### Get User Profile
- **GET** `/api/user/profile`
- **Headers**: `Authorization: Bearer <token>`

#### Update User Profile
- **PUT** `/api/user/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-15",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }
  ```

#### Update Email
- **PUT** `/api/user/email`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "email": "newemail@example.com"
  }
  ```

#### Delete Account
- **DELETE** `/api/user/account`
- **Headers**: `Authorization: Bearer <token>`

### Admin Routes

#### Get All Users (Admin Only)
- **GET** `/api/user/all?page=1&limit=10`
- **Headers**: `Authorization: Bearer <admin_token>`

## 🔒 Security Features

1. **Password Security**
   - Minimum 6 characters
   - Must contain uppercase, lowercase, and number
   - Hashed with bcrypt (12 salt rounds)

2. **Rate Limiting**
   - General API: 100 requests per 15 minutes
   - Auth endpoints: 5 requests per 15 minutes
   - Login endpoint: 3 attempts per 15 minutes

3. **Input Validation**
   - Comprehensive validation for all endpoints
   - SQL injection prevention
   - XSS protection

4. **JWT Security**
   - Tokens expire in 7 days (configurable)
   - Secure token generation
   - Token verification middleware

## 🧪 Testing the API

### Using cURL

1. **Register a new user**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/signup \\
     -H "Content-Type: application/json" \\
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "Password123",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \\
     -H "Content-Type: application/json" \\
     -d '{
       "identifier": "test@example.com",
       "password": "Password123"
     }'
   ```

3. **Get profile** (use token from login):
   ```bash
   curl -X GET http://localhost:5000/api/user/profile \\
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Using Postman

Import the following endpoints into Postman:

1. **Environment Variables**:
   - `baseURL`: `http://localhost:5000`
   - `token`: (set after login)

2. **Collection**:
   - Import all the endpoints mentioned above
   - Set Authorization header for protected routes

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Additional validation errors if applicable
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad request/Validation error
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `429`: Too many requests
- `500`: Internal server error

## 📁 Project Structure

```
backend-auth-system/
├── src/
│   └── server.js          # Main server file
├── config/
│   └── database.js        # Database configuration
├── controllers/
│   ├── authController.js  # Authentication logic
│   └── userController.js  # User management logic
├── middleware/
│   ├── auth.js           # Authentication middleware
│   └── validation.js     # Input validation rules
├── models/
│   └── User.js           # User model/schema
├── routes/
│   ├── authRoutes.js     # Authentication routes
│   └── userRoutes.js     # User routes
├── utils/
│   └── jwt.js            # JWT utilities
├── .env                  # Environment variables
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🔧 Customization

### Adding New Fields to User Model

1. Update the User schema in `models/User.js`
2. Add validation rules in `middleware/validation.js`
3. Update controllers to handle new fields

### Adding New Routes

1. Create new route files in `routes/`
2. Add controllers in `controllers/`
3. Import and use in `src/server.js`

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --version`
- Check connection string in `.env` file
- Verify MongoDB service is started

### JWT Token Issues
- Check if JWT_SECRET is set in `.env`
- Verify token format: `Bearer <token>`
- Check token expiration

### Port Already in Use
- Change PORT in `.env` file
- Kill existing process: `lsof -ti:5000 | xargs kill -9` (macOS/Linux)

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support, email your-email@example.com or create an issue in the repository.

---

**Happy Coding! 🚀**