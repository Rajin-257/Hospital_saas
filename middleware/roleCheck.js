/**
 * Middleware for role-based access control
 * This middleware checks if the logged in user has the required role to access a resource
 */

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

// Check role and redirect to appropriate dashboard
const checkRoleAndRedirect = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  } else if (req.session.user.role === 'executive') {
    return res.redirect('/executive/dashboard');
  }
  
  // Fallback to login if role is unknown
  res.redirect('/login');
};

// Allow multiple roles
const hasRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.session.user) {
      req.flash('error_msg', 'Please log in to access this resource');
      return res.redirect('/login');
    }
    
    if (roles.includes(req.session.user.role)) {
      return next();
    }
    
    req.flash('error_msg', 'You do not have permission to access this resource');
    res.redirect('/dashboard');
  };
};

// Check if user owns a resource
const isResourceOwner = (resourceModel, paramIdField = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (req.session.user.role === 'admin') {
        // Admins can access any resource
        return next();
      }
      
      const resourceId = req.params[paramIdField];
      if (!resourceId) {
        return res.status(400).json({ message: 'Resource ID is required' });
      }
      
      const resource = await resourceModel.findByPk(resourceId);
      if (!resource) {
        req.flash('error_msg', 'Resource not found');
        return res.redirect('back');
      }
      
      if (resource[userIdField] === req.session.user.id) {
        return next();
      }
      
      req.flash('error_msg', 'You do not have permission to access this resource');
      res.redirect('back');
    } catch (error) {
      console.error('Error checking resource ownership:', error);
      req.flash('error_msg', 'An error occurred while verifying access');
      res.redirect('/dashboard');
    }
  };
};

module.exports = {
  isAdmin,
  isExecutive,
  checkRoleAndRedirect,
  hasRole,
  isResourceOwner
};