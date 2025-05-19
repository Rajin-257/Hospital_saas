const nodemailer = require('nodemailer');
const moment = require('moment');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
  port: process.env.MAIL_PORT || 2525,
  secure: process.env.MAIL_SECURE === 'true' || false,
  auth: {
    user: process.env.MAIL_USER || 'test',
    pass: process.env.MAIL_PASS || 'test'
  }
});

// Send welcome email with database credentials
exports.sendWelcomeEmail = async (user, database) => {
  const expiryDate = moment(database.expiryDate).format('MMMM DD, YYYY');
  
  const mailOptions = {
    from: `"DB Management System" <${process.env.MAIL_FROM || 'noreply@dbms.com'}>`,
    to: user.email,
    subject: 'Welcome to DB Management System - Your Database is Ready',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Welcome to DB Management System!</h2>
        <p>Hello ${user.fullName},</p>
        <p>Thank you for registering with us. Your account has been successfully created and your database is now ready to use.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Your Database Information</h3>
          <p><strong>Domain:</strong> ${database.domain}</p>
          <p><strong>Username:</strong> admin</p>
          <p><strong>password:</strong> 123</p>
          <p><strong>Free Trial Expires:</strong> ${expiryDate}</p>
        </div>
        
        <p>Please keep this information secure. You will need these credentials to connect to your database.</p>
        
        <p>Your free trial will expire on <strong>${expiryDate}</strong>. You can extend your subscription by making a payment in your dashboard.</p>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>DB Management System Team</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

// Send payment confirmation email
exports.sendPaymentConfirmationEmail = async (user, payment, database) => {
  const expiryDate = moment(database.expiryDate).format('MMMM DD, YYYY');
  
  const mailOptions = {
    from: `"DB Management System" <${process.env.MAIL_FROM || 'noreply@dbms.com'}>`,
    to: user.email,
    subject: 'Payment Confirmation - DB Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Payment Confirmation</h2>
        <p>Hello ${user.fullName},</p>
        <p>Thank you for your payment. Your database subscription has been successfully extended.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Payment Details</h3>
          <p><strong>Amount:</strong> ${payment.amount} BDT</p>
          <p><strong>Transaction ID:</strong> ${payment.transactionId}</p>
          <p><strong>Payment Date:</strong> ${moment(payment.paymentDate).format('MMMM DD, YYYY')}</p>
          <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Subscription Details</h3>
          <p><strong>Database:</strong> ${database.name}</p>
          <p><strong>Domain:</strong> ${database.domain}</p>
          <p><strong>New Expiry Date:</strong> ${expiryDate}</p>
        </div>
        
        <p>You can view your payment history and manage your database from your dashboard.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>DB Management System Team</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

// Send commission notification email
exports.sendCommissionEmail = async (executive, commission, payment) => {
  const mailOptions = {
    from: `"DB Management System" <${process.env.MAIL_FROM || 'noreply@dbms.com'}>`,
    to: executive.email,
    subject: 'Commission Earned - DB Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Commission Earned!</h2>
        <p>Hello ${executive.fullName},</p>
        <p>Good news! You have earned a commission for a referral.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Commission Details</h3>
          <p><strong>Amount:</strong> ${commission.amount} BDT</p>
          <p><strong>Percentage:</strong> ${commission.percentage}%</p>
          <p><strong>Status:</strong> ${commission.status}</p>
          <p><strong>Related Payment:</strong> ${payment.transactionId}</p>
          <p><strong>Date:</strong> ${moment(commission.createdAt).format('MMMM DD, YYYY')}</p>
        </div>
        
        <p>You can view all your commissions from your dashboard.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>DB Management System Team</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

// Send executive credentials email
exports.sendExecutiveCredentialsEmail = async (user, password) => {
  const mailOptions = {
    from: `"DB Management System" <${process.env.MAIL_FROM || 'noreply@dbms.com'}>`,
    to: user.email,
    subject: 'Your Executive Account Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Executive Account Credentials</h2>
        <p>Hello ${user.fullName},</p>
        <p>Your account has been upgraded to Executive status. Here are your login credentials:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Account Information</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <p>For security reasons, please change your password after logging in.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>DB Management System Team</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};