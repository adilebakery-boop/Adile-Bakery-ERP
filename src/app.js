const express = require('express');
const cors = require('cors');

const app = express();
const authRoutes = require('./modules/auth/auth.routes');
const productsRoutes = require('./modules/products/products.routes');
const usersRoutes = require('./modules/users/users.routes');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/users', usersRoutes);

module.exports = app;