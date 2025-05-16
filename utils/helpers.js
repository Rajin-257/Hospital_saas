const moment = require('moment');
const { nanoid } = require('nanoid');

/**
 * Helper functions for the application
 */
const helpers = {
  /**
   * Format date with moment.js
   * @param {Date|string} date - Date to format
   * @param {string} format - Desired format
   * @returns {string} Formatted date
   */
  formatDate: (date, format = 'YYYY-MM-DD') => {
    return moment(date).format(format);
  },
  
  /**
   * Calculate days remaining until a date
   * @param {Date|string} date - Target date
   * @returns {number} Days remaining
   */
  daysRemaining: (date) => {
    const now = moment();
    const targetDate = moment(date);
    return targetDate.diff(now, 'days');
  },
  
  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency
   */
  formatCurrency: (amount, currency = 'BDT') => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  },
  
  /**
   * Truncate text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} length - Max length
   * @returns {string} Truncated text
   */
  truncate: (text, length = 100) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  },
  
  /**
   * Generate a unique ID
   * @param {number} length - ID length
   * @returns {string} Unique ID
   */
  generateId: (length = 10) => {
    return nanoid(length);
  },
  
  /**
   * Generate a random password
   * @param {number} length - Password length
   * @returns {string} Random password
   */
  generatePassword: (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  },
  
  /**
   * Generate a database name from domain
   * @param {string} domain - Domain name
   * @returns {string} Database name
   */
  generateDatabaseName: (domain) => {
    // Extract first part of domain and limit to 5 chars
    const prefix = domain.split('.')[0].substring(0, 5);
    // Add random string and convert to lowercase
    return `${prefix}_${nanoid(8)}`.toLowerCase();
  },
  
  /**
   * Sanitize input to prevent SQL injection
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput: (input) => {
    if (!input) return '';
    // Remove SQL injection characters
    return input.replace(/['"\\;]/g, '');
  },
  
  /**
   * Check if string is valid email
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  /**
   * Parse boolean value
   * @param {any} value - Value to parse
   * @returns {boolean} Parsed boolean
   */
  parseBoolean: (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
    }
    return !!value;
  },
  
  /**
   * Paginate array of items
   * @param {Array} items - Items to paginate
   * @param {number} page - Current page
   * @param {number} perPage - Items per page
   * @returns {Object} Paginated results
   */
  paginate: (items, page = 1, perPage = 10) => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage,
      perPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  },
  
  /**
   * Get status badge class based on status
   * @param {string} status - Status value
   * @returns {string} Badge CSS class
   */
  getStatusBadgeClass: (status) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'paid':
      case 'success':
        return 'bg-success';
      case 'pending':
      case 'processing':
      case 'waiting':
        return 'bg-warning';
      case 'inactive':
      case 'failed':
      case 'cancelled':
      case 'expired':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }
};

module.exports = helpers;