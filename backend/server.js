require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Rate Limiting (General limiter: 500 requests per 15 mins)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api', generalLimiter);

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging Middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/users', userRoutes);

// 404 Handler for Undefined Routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Port & Server Listener
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Corporate Expense Management Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
