// Mail configuration
module.exports = {
  // Default mail settings
  defaults: {
    from: process.env.MAIL_FROM || 'noreply@dbms.com',
    replyTo: process.env.MAIL_REPLY_TO || 'support@dbms.com'
  },
  
  // SMTP configuration
  smtp: {
    host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.MAIL_PORT || '2525'),
    secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USER || 'test',
      pass: process.env.MAIL_PASS || 'test'
    }
  },
  
  // Email templates directory
  templatesDir: 'views/emails',
  
  // Email templates
  templates: {
    welcome: {
      subject: 'Welcome to DB Management System',
      template: 'welcome.ejs'
    },
    passwordReset: {
      subject: 'Password Reset Request',
      template: 'password-reset.ejs'
    },
    paymentConfirmation: {
      subject: 'Payment Confirmation - DB Management System',
      template: 'payment-confirmation.ejs'
    },
    databaseExpiry: {
      subject: 'Your Database Subscription is Expiring Soon',
      template: 'database-expiry.ejs'
    },
    commissionEarned: {
      subject: 'Commission Earned - DB Management System',
      template: 'commission-earned.ejs'
    }
  },
  
  // Email sending options
  options: {
    // Retry failed emails
    retry: {
      enabled: true,
      attempts: 3,
      delay: 1000 // milliseconds
    },
    
    // Log email activity
    logging: process.env.NODE_ENV !== 'production',
    
    // Queue emails for later sending (useful for high volume)
    queue: {
      enabled: false,
      concurrency: 5 // number of emails to send simultaneously
    }
  }
};