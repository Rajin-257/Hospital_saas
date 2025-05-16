// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated && req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to access this resource');
  res.redirect('/login');
};

// Role-based access control middleware
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Admin permission required');
  res.redirect('/dashboard');
};

const isExecutive = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'executive') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Executive permission required');
  res.redirect('/dashboard');
};

// Check which role route to redirect
const checkRole = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  } else if (req.session.user.role === 'executive') {
    return res.redirect('/executive/dashboard');
  }
  
  // Fallback
  res.redirect('/login');
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isExecutive,
  checkRole
};