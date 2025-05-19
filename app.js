require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

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

// Special handling for payment routes - some require auth, others don't
app.use('/payment/public', paymentRoutes); // Public payment routes don't require auth
app.use('/payment', isAuthenticated, paymentRoutes); // Protected payment routes

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
  console.error(err.stack);
  res.status(500).render('errors/500', { title: '500 Server Error' });
});

// Initialize database connection
const db = require('./config/database');

// Import model associations
require('./models/associations');

const createInitialAdmin = require('./config/initAdmin');

db.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
    // Sync all models
    //return db.sync({ force: true });
  })
  .then(async () => {
    console.log('All models were synchronized successfully.');
    // Create initial admin account
    //await createInitialAdmin();
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });