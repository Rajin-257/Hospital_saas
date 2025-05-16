require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

// Import logger
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const executiveRoutes = require('./routes/executiveRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Import middleware
const { isAuthenticated } = require('./middleware/auth');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Request logging middleware
app.use(requestLogger);

// Configure view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', path.join(__dirname, 'views/layouts/main'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Flash messages
app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/admin', isAuthenticated, adminRoutes);
app.use('/executive', isAuthenticated, executiveRoutes);
app.use('/database', isAuthenticated, databaseRoutes);
app.use('/payment', isAuthenticated, paymentRoutes);

// Landing page route
app.get('/', (req, res) => {
  res.render('landing', { 
    title: 'Welcome to DB Management System',
    layout: 'layouts/landing' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/404', { title: '404 Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { 
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.session?.user?.id || 'anonymous'
  });
  res.status(500).render('errors/500', { title: '500 Server Error' });
});

// Initialize database connection
const db = require('./config/database');

// Import model associations
require('./models/associations');

db.authenticate()
  .then(() => {
    logger.info('Database connection has been established successfully.');
    // Sync all models
    return db.sync({ alter: false });
  })
  .then(() => {
    logger.info('All models were synchronized successfully.');
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error('Unable to connect to the database:', { 
      error: err.message,
      stack: err.stack 
    });
    process.exit(1);
  });