const User = require('../models/User');
const bcrypt = require('bcrypt');

const createInitialAdmin = async () => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({
      where: {
        role: 'admin',
        email: 'admin@admin.com'
      }
    });

    if (!adminExists) {
      // Create admin user
      await User.create({
        fullName: 'System Admin',
        email: 'admin@gmail.com',
        phone: '1234567890',
        password: '123', // This will be hashed automatically by the User model hooks
        role: 'admin',
        isActive: true,
        commissionRate: 0
      });
      
      console.log('Initial admin account created successfully');
    } else {
      console.log('Admin account already exists');
    }
  } catch (error) {
    console.error('Error creating initial admin account:', error);
    throw error;
  }
};

module.exports = createInitialAdmin; 