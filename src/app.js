const express = require('express');
const cors = require('cors');
const helmet = require('./middlewares/helmet.middleware');
const sanitizeRequest = require('./middlewares/sanitize.middleware');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { loginLimiter, apiLimiter, exportLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

const authRoutes = require('./modules/auth/auth.routes');
const branchRoutes = require('./modules/branch/branch.routes');
const productRoutes = require('./modules/product/product.routes');
const userRoutes = require('./modules/users/users.routes');
const productionRoutes = require('./modules/production/production.routes');
const remainingRoutes = require('./modules/remaining/remaining.routes');
const wasteRoutes = require('./modules/waste/waste.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const closureRoutes = require('./modules/closure/closure.routes');
const reportsRoutes = require('./modules/reports/reports.routes');

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(sanitizeRequest);

app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);
app.use('/api/reports/export', exportLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/productions', productionRoutes);
app.use('/api/remainings', remainingRoutes);
app.use('/api/wastes', wasteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/closures', closureRoutes);
app.use('/api/reports', reportsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;