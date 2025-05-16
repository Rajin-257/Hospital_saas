const jwt = require('jsonwebtoken');

// JWT configuration
module.exports = {
  // Secret key for JWT
  secretKey: process.env.JWT_SECRET || 'your-secret-key',
  
  // Token expiration (in seconds)
  tokenExpiration: 86400, // 24 hours
  
  // Generate JWT token
  generateToken: (user) => {
    return jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role 
      },
      module.exports.secretKey,
      { 
        expiresIn: module.exports.tokenExpiration 
      }
    );
  },
  
  // Verify JWT token
  verifyToken: (token) => {
    try {
      return jwt.verify(token, module.exports.secretKey);
    } catch (error) {
      return null;
    }
  },
  
  // Password settings
  password: {
    // Minimum password length
    minLength: 6,
    
    // Password complexity requirements (regex patterns)
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
    
    // Number of salt rounds for bcrypt
    saltRounds: 10
  },
  
  // Session settings
  session: {
    // Session name
    name: 'dbms.sid',
    
    // Session cookie settings
    cookie: {
      // HTTP only to prevent XSS attacks
      httpOnly: true,
      
      // Secure cookie for HTTPS
      secure: process.env.NODE_ENV === 'production',
      
      // Same site policy
      sameSite: 'lax',
      
      // Cookie max age (in milliseconds)
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    // Session store configuration (default: in-memory)
    // In production, you should use a persistent store like Redis or DB
    store: null
  }
};