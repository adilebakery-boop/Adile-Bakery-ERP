const express = require('express');
const cors = require('cors');

const app = express();

const authRoutes = require('./modules/auth/auth.routes');
const branchRoutes = require('./modules/branch/branch.routes');
const productRoutes = require('./modules/product/product.routes');
const usersRoutes = require('./modules/users/users.routes');
const productionRoutes = require('./modules/production/production.routes');
const remainingRoutes = require('./modules/remaining/remaining.routes');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/remaining', remainingRoutes);

module.exports = app;