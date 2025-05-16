const { validationResult } = require('express-validator');
const User = require('../models/User');
const Database = require('../models/Database');
const { createDatabase } = require('../services/databaseService');
const { sendWelcomeEmail } = require('../services/mailService');
const { nanoid } = require('nanoid');
const path = require('path');

// Display login page
exports.getLogin = (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    title: 'Login',
    layout: 'layouts/auth'
  });
};

// Handle login
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render('login', {
      title: 'Login',
      layout: 'layouts/auth',
      errors: errors.array(),
      email
    });
  }

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      req.flash('error_msg', 'Invalid email or password');
      return res.render('login', {
        title: 'Login',
        layout: 'layouts/auth',
        email
      });
    }

    // Check if user is active
    if (!user.isActive) {
      req.flash('error_msg', 'Your account has been deactivated. Please contact the administrator.');
      return res.render('login', {
        title: 'Login',
        layout: 'layouts/auth',
        email
      });
    }

    // Validate password
    const isMatch = await user.isValidPassword(password);
    
    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password');
      return res.render('login', {
        title: 'Login',
        layout: 'layouts/auth',
        email
      });
    }

    // Set user session
    req.session.isAuthenticated = true;
    req.session.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode
    };

    // Update last login time
    await user.update({ lastLogin: new Date() });

    req.flash('success_msg', 'Successfully logged in');
    
    // Redirect based on role
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/executive/dashboard');
    }
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred during login');
    res.render('login', {
      title: 'Login',
      layout: 'layouts/auth',
      email
    });
  }
};

// Display register page
exports.getRegister = (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/dashboard');
  }
  res.render('register', { 
    title: 'Register',
    layout: 'layouts/auth'
  });
};

// Handle registration
exports.postRegister = async (req, res) => {
  const { fullName, email, phone, password, expectedDomain, referenceCode } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render('register', {
      title: 'Register',
      layout: 'layouts/auth',
      errors: errors.array(),
      fullName,
      email,
      phone,
      expectedDomain
    });
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    
    if (existingUser) {
      req.flash('error_msg', 'Email is already registered');
      return res.render('register', {
        title: 'Register',
        layout: 'layouts/auth',
        fullName,
        phone,
        expectedDomain
      });
    }

    // Verify reference code
    const referringUser = await User.findOne({ where: { referralCode: referenceCode } });
    
    if (!referringUser) {
      req.flash('error_msg', 'Invalid reference code');
      return res.render('register', {
        title: 'Register',
        layout: 'layouts/auth',
        fullName,
        email,
        phone,
        expectedDomain
      });
    }

    // Create new user
    const newUser = await User.create({
      fullName,
      email,
      phone,
      password,
      expectedDomain,
      referredBy: referringUser.id,
      role: 'user' // Default role for new registrations
    });

    // Generate database name based on domain
    const domainPrefix = expectedDomain.split('.')[0];
    const dbName = 'hospital_'+`${domainPrefix}${nanoid(8)}`.toLowerCase();
    //const dbUser = `user_${nanoid(8)}`.toLowerCase();
    //const dbPassword = nanoid(12);
    const dbUser = 'root';
    const dbPassword = '';

    // Create the actual MySQL database
    await createDatabase(dbName, dbUser, dbPassword, path.join(__dirname, '../create.sql'));

    // Store database info
    const newDatabase = await Database.create({
      name: dbName,
      userId: newUser.id,
      username: dbUser,
      password: dbPassword,
      domain: expectedDomain
    });

    // Send welcome email
    await sendWelcomeEmail(newUser, newDatabase);

    req.flash('success_msg', 'Registration successful! Please check your email for database information.');
    res.redirect('/login');
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred during registration');
    res.render('register', {
      title: 'Register',
      layout: 'layouts/auth',
      fullName,
      email,
      phone,
      expectedDomain
    });
  }
};

// Logout 
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
};

// Dashboard redirect based on role
exports.getDashboard = (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/login');
  }
  
  const { role } = req.session.user;
  
  if (role === 'admin') {
    return res.redirect('/admin/dashboard');
  } else if (role === 'executive') {
    return res.redirect('/executive/dashboard');
  } else {
    return res.redirect('/');
  }
};