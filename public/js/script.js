/**
 * Hospital DBMS - Main JavaScript
 * A comprehensive JavaScript library for the Hospital Database Management System
 */

/**
 * ====================================
 * GLOBAL VARIABLES AND CONFIGURATION
 * ====================================
 */
const DBMS = {
  // Application settings
  settings: {
    animationSpeed: 300,
    toastDuration: 5000,
    chartColors: ['#0d6efd', '#20c997', '#ffc107', '#dc3545', '#6c757d', '#0dcaf0'],
    dateFormat: 'DD MMM YYYY',
    timeFormat: 'HH:mm',
    debounceDelay: 500,
    autoLogoutTime: 30 * 60 * 1000 // 30 minutes
  },
  
  // Application state
  state: {
    darkMode: false,
    lastActivity: Date.now(),
    notifications: [],
    initialized: false,
    searchFilters: {}
  },
  
  // Chart instances for reference
  charts: {},
  
  // DataTable instances for reference
  tables: {}
};

/**
 * ====================================
 * UTILITY FUNCTIONS
 * ====================================
 */

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @param {boolean} immediate - Whether to call the function immediately
 * @returns {Function} - The debounced function
 */
const debounce = (func, wait = DBMS.settings.debounceDelay, immediate = false) => {
  let timeout;
  return function() {
    const context = this, args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

/**
 * Format a date using the specified format
 * @param {Date|string} date - The date to format
 * @param {string} format - The format string (defaults to application setting)
 * @returns {string} - The formatted date string
 */
const formatDate = (date, format = DBMS.settings.dateFormat) => {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const monthName = new Date(date).toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  
  let formattedDate = format;
  formattedDate = formattedDate.replace('DD', day);
  formattedDate = formattedDate.replace('MMM', monthName);
  formattedDate = formattedDate.replace('MM', month);
  formattedDate = formattedDate.replace('YYYY', year);
  
  return formattedDate;
};

/**
 * Format currency in BDT
 * @param {number} amount - The amount to format
 * @returns {string} - The formatted amount
 */
const formatCurrency = (amount) => {
  return '৳' + parseFloat(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Copy text to clipboard
 * @param {string} text - The text to copy
 * @returns {boolean} - Whether the copy was successful
 */
const copyToClipboard = (text) => {
  // Use the newer clipboard API if available
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied to clipboard!', 'success');
        return true;
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        return false;
      });
    return true;
  }
  
  // Fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
    if (success) {
      showToast('Copied to clipboard!', 'success');
    } else {
      showToast('Failed to copy to clipboard', 'error');
    }
  } catch (err) {
    console.error('Failed to copy: ', err);
    showToast('Failed to copy to clipboard', 'error');
  }
  
  document.body.removeChild(textarea);
  return success;
};

/**
 * Get relative time (e.g., "2 hours ago", "yesterday")
 * @param {Date|string} date - The date to get relative time for
 * @returns {string} - The relative time string
 */
const getRelativeTime = (date) => {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'yesterday';
  }
  
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) {
    return '1 week ago';
  }
  
  if (diffInWeeks < 4) {
    return `${diffInWeeks} weeks ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) {
    return '1 month ago';
  }
  
  if (diffInMonths < 12) {
    return `${diffInMonths} months ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
};

/**
 * ====================================
 * UI COMPONENTS AND INTERACTIONS
 * ====================================
 */

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast ('success', 'error', 'warning', 'info')
 * @param {number} duration - How long to show the toast in milliseconds
 */
const showToast = (message, type = 'info', duration = DBMS.settings.toastDuration) => {
  // Ensure toast container exists
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast
  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.id = toastId;
  
  // Set background and icon based on type
  let bgClass = 'bg-primary';
  let icon = 'info-circle';
  
  switch (type) {
    case 'success':
      bgClass = 'bg-success';
      icon = 'check-circle';
      break;
    case 'error':
      bgClass = 'bg-danger';
      icon = 'exclamation-circle';
      break;
    case 'warning':
      bgClass = 'bg-warning';
      icon = 'exclamation-triangle';
      break;
  }
  
  // Create toast content
  toast.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto"><i class="fas fa-${icon} me-2"></i>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
      <small>${formatDate(new Date(), 'HH:mm')}</small>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${message}
    </div>
  `;
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Initialize Bootstrap toast
  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: duration
  });
  
  // Show toast
  bsToast.show();
  
  // Remove toast after it's hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
  
  // Return toast ID for reference
  return toastId;
};

/**
 * Toggle password visibility
 * @param {string} inputId - The ID of the password input field
 * @param {string} iconId - The ID of the icon element
 */
const togglePasswordVisibility = (inputId, iconId) => {
  const passwordField = document.getElementById(inputId);
  const eyeIcon = document.getElementById(iconId);
  
  if (!passwordField || !eyeIcon) return;
  
  if (passwordField.type === 'password') {
    passwordField.type = 'text';
    eyeIcon.classList.remove('fa-eye');
    eyeIcon.classList.add('fa-eye-slash');
  } else {
    passwordField.type = 'password';
    eyeIcon.classList.remove('fa-eye-slash');
    eyeIcon.classList.add('fa-eye');
  }
};

/**
 * Initialize DataTable with enhanced features
 * @param {string} tableId - The ID of the table element
 * @param {Object} options - DataTable options
 * @returns {Object} - The DataTable instance
 */
const initDataTable = (tableId, options = {}) => {
  const table = document.getElementById(tableId);
  if (!table) return null;
  
  // Default options
  const defaultOptions = {
    responsive: true,
    language: {
      search: "Search:",
      lengthMenu: "Show _MENU_ entries per page",
      info: "Showing _START_ to _END_ of _TOTAL_ entries",
      infoEmpty: "Showing 0 to 0 of 0 entries",
      infoFiltered: "(filtered from _MAX_ total entries)",
      paginate: {
        first: '<i class="fas fa-angle-double-left"></i>',
        previous: '<i class="fas fa-angle-left"></i>',
        next: '<i class="fas fa-angle-right"></i>',
        last: '<i class="fas fa-angle-double-right"></i>'
      }
    },
    dom: '<"row"<"col-md-6"l><"col-md-6"f>>rt<"row"<"col-md-6"i><"col-md-6"p>>',
    stateSave: true
  };
  
  // Merge options
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Initialize DataTable
  const dataTable = new DataTable(table, mergedOptions);
  
  // Store in DBMS.tables
  DBMS.tables[tableId] = dataTable;
  
  return dataTable;
};

/**
 * Simple table search function (for when DataTables is not available)
 * @param {string} inputId - The ID of the search input element
 * @param {string} tableId - The ID of the table element
 */
const initTableSearch = (inputId, tableId) => {
  const searchInput = document.getElementById(inputId);
  const table = document.getElementById(tableId);
  
  if (!searchInput || !table) return;
  
  searchInput.addEventListener('keyup', debounce(function() {
    const searchValue = this.value.toLowerCase();
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchValue) ? '' : 'none';
    });
  }, 300));
};

/**
 * Initialize chart
 * @param {string} canvasId - The ID of the canvas element
 * @param {string} type - The type of chart (line, bar, pie, doughnut, etc.)
 * @param {Object} data - The chart data
 * @param {Object} options - Chart options
 * @returns {Object} - The Chart instance
 */
const initChart = (canvasId, type, data, options = {}) => {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  const ctx = canvas.getContext('2d');
  
  // Default options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
      }
    }
  };
  
  // Apply specific options based on chart type
  switch (type) {
    case 'line':
      Object.assign(defaultOptions, {
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (options.isCurrency) {
                  return '৳' + value.toLocaleString();
                }
                return value;
              }
            }
          }
        },
        elements: {
          line: {
            tension: 0.4
          }
        }
      });
      break;
    case 'bar':
      Object.assign(defaultOptions, {
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (options.isCurrency) {
                  return '৳' + value.toLocaleString();
                }
                return value;
              }
            }
          }
        }
      });
      break;
    case 'pie':
    case 'doughnut':
      Object.assign(defaultOptions, {
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      });
      break;
  }
  
  // Merge options
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Initialize Chart
  const chart = new Chart(ctx, {
    type: type,
    data: data,
    options: mergedOptions
  });
  
  // Store in DBMS.charts
  DBMS.charts[canvasId] = chart;
  
  return chart;
};

/**
 * Initialize form validation
 * @param {string} formId - The ID of the form element
 * @param {Function} submitCallback - The callback to run on successful submission
 */
const initFormValidation = (formId, submitCallback = null) => {
  const form = document.getElementById(formId);
  if (!form) return;
  
  // Add was-validated class on submit
  form.addEventListener('submit', function(event) {
    // Check for custom validation
    const customValid = validateForm(form);
    
    // Prevent submission if form is invalid
    if (!form.checkValidity() || !customValid) {
      event.preventDefault();
      event.stopPropagation();
    } else if (submitCallback && typeof submitCallback === 'function') {
      // Call the callback if form is valid
      submitCallback(event);
    }
    
    // Add was-validated class to show validation feedback
    form.classList.add('was-validated');
  }, false);
  
  // Add validation styles as the user types
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', function() {
      // Check if the input is valid
      if (this.checkValidity()) {
        this.classList.remove('is-invalid');
        this.classList.add('is-valid');
      } else {
        this.classList.remove('is-valid');
        this.classList.add('is-invalid');
      }
      
      // Custom validation
      validateInput(this);
    });
  });
};

/**
 * Validate form fields with custom rules
 * @param {HTMLFormElement} form - The form element
 * @returns {boolean} - Whether the form is valid
 */
const validateForm = (form) => {
  let isValid = true;
  
  // Password and confirm password check
  const password = form.querySelector('input[name="password"]');
  const confirmPassword = form.querySelector('input[name="confirmPassword"]');
  
  if (password && confirmPassword && password.value && confirmPassword.value) {
    if (password.value !== confirmPassword.value) {
      setInvalidFeedback(confirmPassword, 'Passwords do not match');
      isValid = false;
    } else {
      setValidFeedback(confirmPassword, 'Passwords match');
    }
  }
  
  // Email validation
  const email = form.querySelector('input[type="email"]');
  if (email && email.value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
      setInvalidFeedback(email, 'Please enter a valid email address');
      isValid = false;
    } else {
      setValidFeedback(email, 'Email is valid');
    }
  }
  
  // Phone number validation
  const phone = form.querySelector('input[name="phone"]');
  if (phone && phone.value) {
    const phoneRegex = /^01[3-9]\d{8}$/; // Bangladesh mobile number pattern
    if (!phoneRegex.test(phone.value)) {
      setInvalidFeedback(phone, 'Please enter a valid Bangladeshi mobile number');
      isValid = false;
    } else {
      setValidFeedback(phone, 'Phone number is valid');
    }
  }
  
  return isValid;
};

/**
 * Validate individual input field
 * @param {HTMLInputElement} input - The input element
 * @returns {boolean} - Whether the input is valid
 */
const validateInput = (input) => {
  // Password strength check
  if (input.type === 'password' && input.name === 'password' && input.value) {
    const passwordStrength = checkPasswordStrength(input.value);
    
    // Remove existing feedback
    const existingFeedback = input.parentNode.querySelector('.password-strength');
    if (existingFeedback) {
      existingFeedback.remove();
    }
    
    // Create strength indicator
    const strengthElement = document.createElement('div');
    strengthElement.className = 'password-strength mt-1';
    
    // Set strength message and color
    let strengthText = '';
    let strengthClass = '';
    
    switch (passwordStrength) {
      case 'weak':
        strengthText = 'Weak password';
        strengthClass = 'text-danger';
        break;
      case 'medium':
        strengthText = 'Medium strength password';
        strengthClass = 'text-warning';
        break;
      case 'strong':
        strengthText = 'Strong password';
        strengthClass = 'text-success';
        break;
    }
    
    strengthElement.innerHTML = `
      <small class="${strengthClass}">
        <i class="fas fa-${passwordStrength === 'strong' ? 'check-circle' : (passwordStrength === 'medium' ? 'exclamation-circle' : 'times-circle')}"></i>
        ${strengthText}
      </small>
      <div class="progress mt-1" style="height: 5px;">
        <div class="progress-bar bg-${passwordStrength === 'strong' ? 'success' : (passwordStrength === 'medium' ? 'warning' : 'danger')}" 
             style="width: ${passwordStrength === 'strong' ? '100' : (passwordStrength === 'medium' ? '50' : '25')}%"></div>
      </div>
    `;
    
    // Insert after input or its parent if in an input group
    const parent = input.closest('.input-group') || input.parentNode;
    parent.after(strengthElement);
    
    // Set validity
    if (passwordStrength === 'weak' && input.minLength > 0) {
      setInvalidFeedback(input, 'Password is too weak');
      return false;
    }
  }
  
  // Confirm password check
  if (input.name === 'confirmPassword') {
    const password = document.querySelector('input[name="password"]');
    if (password && input.value) {
      if (password.value !== input.value) {
        setInvalidFeedback(input, 'Passwords do not match');
        return false;
      } else {
        setValidFeedback(input, 'Passwords match');
      }
    }
  }
  
  return true;
};

/**
 * Set invalid feedback message for input
 * @param {HTMLInputElement} input - The input element
 * @param {string} message - The error message
 */
const setInvalidFeedback = (input, message) => {
  input.classList.remove('is-valid');
  input.classList.add('is-invalid');
  
  // Remove any existing feedback
  const existingFeedback = input.parentNode.querySelector('.invalid-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  // Create invalid feedback
  const feedback = document.createElement('div');
  feedback.className = 'invalid-feedback';
  feedback.textContent = message;
  
  // Insert after input or its parent if in an input group
  const parent = input.closest('.input-group') || input;
  parent.after(feedback);
};

/**
 * Set valid feedback message for input
 * @param {HTMLInputElement} input - The input element
 * @param {string} message - The success message
 */
const setValidFeedback = (input, message) => {
  input.classList.remove('is-invalid');
  input.classList.add('is-valid');
  
  // Remove any existing feedback
  const existingFeedback = input.parentNode.querySelector('.valid-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  // Create valid feedback
  const feedback = document.createElement('div');
  feedback.className = 'valid-feedback';
  feedback.textContent = message;
  
  // Insert after input or its parent if in an input group
  const parent = input.closest('.input-group') || input;
  parent.after(feedback);
};

/**
 * Check password strength
 * @param {string} password - The password to check
 * @returns {string} - The strength level ('weak', 'medium', 'strong')
 */
const checkPasswordStrength = (password) => {
  // Check password length
  if (password.length < 6) {
    return 'weak';
  }
  
  // Patterns for strength
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  // Count matches
  const matches = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;
  
  // Determine strength
  if (matches === 4 && password.length >= 8) {
    return 'strong';
  } else if ((matches >= 2 && password.length >= 8) || (matches >= 3 && password.length >= 6)) {
    return 'medium';
  } else {
    return 'weak';
  }
};

/**
 * Print element content
 * @param {string} elementId - The ID of the element to print
 * @param {string} title - The title to use for the print page
 */
const printElement = (elementId, title = 'Print') => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        @media print {
          @page {
            margin: 0.5cm;
          }
          body {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${element.outerHTML}
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        }
      </script>
    </body>
    </html>
  `);
  
  printWindow.document.close();
};

/**
 * Generate a date range selector
 * @param {string} containerId - The ID of the container element
 * @param {Function} callback - The callback to run when the range changes
 */
const initDateRangeSelector = (containerId, callback) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Define ranges
  const ranges = [
    { id: 'today', text: 'Today', start: new Date(), end: new Date() },
    { id: 'yesterday', text: 'Yesterday', start: new Date(new Date().setDate(new Date().getDate() - 1)), end: new Date(new Date().setDate(new Date().getDate() - 1)) },
    { id: 'thisWeek', text: 'This Week', start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())), end: new Date() },
    { id: 'lastWeek', text: 'Last Week', start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() - 7)), end: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() - 1)) },
    { id: 'thisMonth', text: 'This Month', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
    { id: 'lastMonth', text: 'Last Month', start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) },
    { id: 'thisYear', text: 'This Year', start: new Date(new Date().getFullYear(), 0, 1), end: new Date() },
    { id: 'lastYear', text: 'Last Year', start: new Date(new Date().getFullYear() - 1, 0, 1), end: new Date(new Date().getFullYear() - 1, 11, 31) },
    { id: 'custom', text: 'Custom Range', start: null, end: null }
  ];
  
  // Create range buttons
  let rangeButtons = '<div class="btn-group mb-3">';
  ranges.forEach(range => {
    rangeButtons += `<button type="button" class="btn btn-outline-primary" data-range="${range.id}">${range.text}</button>`;
  });
  rangeButtons += '</div>';
  
  // Create custom range inputs
  const customRangeInputs = `
    <div class="row mb-3 custom-range-inputs" style="display: none;">
      <div class="col-md-5">
        <div class="input-group">
          <span class="input-group-text"><i class="fas fa-calendar"></i></span>
          <input type="date" class="form-control" id="customRangeStart">
        </div>
      </div>
      <div class="col-md-2 text-center">
        <div class="d-flex align-items-center justify-content-center h-100">
          <span>to</span>
        </div>
      </div>
      <div class="col-md-5">
        <div class="input-group">
          <span class="input-group-text"><i class="fas fa-calendar"></i></span>
          <input type="date" class="form-control" id="customRangeEnd">
        </div>
      </div>
    </div>
  `;
  
  // Set container content
  container.innerHTML = rangeButtons + customRangeInputs;
  
  // Set up event listeners
  const rangeButtonElements = container.querySelectorAll('[data-range]');
  rangeButtonElements.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      rangeButtonElements.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      const rangeId = button.getAttribute('data-range');
      const range = ranges.find(r => r.id === rangeId);
      
      // Handle custom range
      if (rangeId === 'custom') {
        container.querySelector('.custom-range-inputs').style.display = 'flex';
      } else {
        container.querySelector('.custom-range-inputs').style.display = 'none';
        
        // Call callback with range
        if (callback && typeof callback === 'function') {
          callback(range.start, range.end);
        }
      }
    });
  });
  
  // Handle custom range inputs
  const customRangeStart = container.querySelector('#customRangeStart');
  const customRangeEnd = container.querySelector('#customRangeEnd');
  
  [customRangeStart, customRangeEnd].forEach(input => {
    input.addEventListener('change', () => {
      if (customRangeStart.value && customRangeEnd.value) {
        // Call callback with custom range
        if (callback && typeof callback === 'function') {
          callback(new Date(customRangeStart.value), new Date(customRangeEnd.value));
        }
      }
    });
  });
  
  // Activate today by default
  rangeButtonElements[0].click();
};

/**
 * ====================================
 * APPLICATION SPECIFIC FUNCTIONS
 * ====================================
 */

/**
 * Toggle password visibility for specific elements
 */
const setupPasswordToggles = () => {
  // Password toggle on login page
  const passwordToggle = document.querySelector('.password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', function() {
      const passwordField = this.previousElementSibling;
      const icon = this.querySelector('i');
      
      if (passwordField.type === 'password') {
        passwordField.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        passwordField.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  }
  
  // Password toggle on database pages
  const togglePassword = document.getElementById('togglePassword');
  if (togglePassword) {
    togglePassword.addEventListener('click', function() {
      togglePasswordVisibility('password', 'eyeIcon');
    });
  }
};

/**
 * Setup copy to clipboard functionality
 */
const setupClipboardCopy = () => {
  const copyButtons = document.querySelectorAll('.btn-copy');
  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const textToCopy = document.getElementById(targetId).value;
      copyToClipboard(textToCopy);
    });
  });
  
  // Specific copy functions
  if (document.getElementById('copyReferralCode')) {
    document.getElementById('copyReferralCode').addEventListener('click', function() {
      const referralCode = document.getElementById('referralCode').value;
      copyToClipboard(referralCode);
    });
  }
  
  if (document.getElementById('copyReferralLink')) {
    document.getElementById('copyReferralLink').addEventListener('click', function() {
      const referralLink = document.getElementById('referralLink').value;
      copyToClipboard(referralLink);
    });
  }
  
  if (document.getElementById('copyUsername')) {
    document.getElementById('copyUsername').addEventListener('click', function() {
      const username = document.getElementById('username').value;
      copyToClipboard(username);
    });
  }
  
  if (document.getElementById('copyPassword')) {
    document.getElementById('copyPassword').addEventListener('click', function() {
      const passwordField = document.getElementById('password');
      
      // If password is hidden, show it temporarily
      const passwordType = passwordField.type;
      passwordField.type = 'text';
      
      const password = passwordField.value;
      copyToClipboard(password);
      
      // Restore original type
      passwordField.type = passwordType;
    });
  }
  
  if (document.getElementById('copyConnectionString')) {
    document.getElementById('copyConnectionString').addEventListener('click', function() {
      const connectionString = document.getElementById('connectionString').value;
      copyToClipboard(connectionString);
    });
  }
};

/**
 * Set up the database statistics charts
 */
const setupDatabaseCharts = () => {
  // Revenue Chart
  const revenueChart = document.getElementById('revenueChart');
  if (revenueChart) {
    const last6Months = Array.from({length: 6}, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      return month.toLocaleString('default', { month: 'short' });
    }).reverse();
    
    const randomData = Array.from({length: 6}, () => Math.floor(Math.random() * 10000) + 1000);
    
    initChart('revenueChart', 'line', {
      labels: last6Months,
      datasets: [{
        label: 'Revenue',
        data: randomData,
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        borderColor: 'rgba(13, 110, 253, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    }, { isCurrency: true });
  }
  
  // Payment Method Chart
  const paymentMethodChart = document.getElementById('paymentMethodChart');
  if (paymentMethodChart) {
    initChart('paymentMethodChart', 'doughnut', {
      labels: ['bKash', 'Nagad', 'Rocket', 'Card'],
      datasets: [{
        data: [45, 25, 20, 10],
        backgroundColor: ['#e2136e', '#f26522', '#8c3ea4', '#0056a7'],
        borderWidth: 0
      }]
    });
  }
  
  // Spending Chart
  const spendingChart = document.getElementById('spendingChart');
  if (spendingChart) {
    const last6Months = Array.from({length: 6}, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      return month.toLocaleString('default', { month: 'short' });
    }).reverse();
    
    const randomData = Array.from({length: 6}, () => Math.floor(Math.random() * 2000) + 1000);
    
    initChart('spendingChart', 'bar', {
      labels: last6Months,
      datasets: [{
        label: 'Monthly Spending',
        data: randomData,
        backgroundColor: 'rgba(13, 110, 253, 0.6)',
        borderColor: 'rgba(13, 110, 253, 1)',
        borderWidth: 1
      }]
    }, { isCurrency: true });
  }
  
  // Commission Chart
  const commissionChart = document.getElementById('commissionChart');
  if (commissionChart) {
    const last6Months = Array.from({length: 6}, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      return month.toLocaleString('default', { month: 'short' });
    }).reverse();
    
    const randomData = Array.from({length: 6}, () => Math.floor(Math.random() * 5000) + 1000);
    
    initChart('commissionChart', 'bar', {
      labels: last6Months,
      datasets: [{
        label: 'Commission Amount',
        data: randomData,
        backgroundColor: 'rgba(13, 110, 253, 0.6)',
        borderColor: 'rgba(13, 110, 253, 1)',
        borderWidth: 1
      }]
    }, { isCurrency: true });
  }
};

/**
 * Set up table search functionality
 */
const setupTableSearch = () => {
  // Admin users table search
  initTableSearch('userSearch', 'usersTable');
  
  // Admin databases table search
  initTableSearch('databaseSearch', 'databasesTable');
  
  // Admin payments table search
  initTableSearch('paymentSearch', 'paymentsTable');
  
  // Admin commissions table search
  initTableSearch('commissionSearch', 'commissionsTable');
  
  // Executive referrals table search
  initTableSearch('referralSearch', 'referralsTable');
  
  // Executive payments table search
  initTableSearch('paymentSearch', 'paymentsTable');
  
  // Executive commissions table search
  initTableSearch('commissionSearch', 'commissionsTable');
};

/**
 * Set up form validation for all forms
 */
const setupFormValidation = () => {
  // Login form
  initFormValidation('loginForm');
  
  // Registration form
  initFormValidation('registerForm');
  
  // Profile update form
  initFormValidation('profileForm');
  
  // User update form
  initFormValidation('userUpdateForm');
  
  // Database update form
  initFormValidation('databaseUpdateForm');
  
  // Payment form
  initFormValidation('paymentForm');
  
  // Commission update form
  initFormValidation('commissionUpdateForm');
};

/**
 * Set up confirmation modals
 */
const setupConfirmationModals = () => {
  const confirmLinks = document.querySelectorAll('[data-confirm]');
  confirmLinks.forEach(link => {
    link.addEventListener('click', function(event) {
      event.preventDefault();
      
      const message = this.getAttribute('data-confirm') || 'Are you sure you want to perform this action?';
      const href = this.getAttribute('href');
      
      if (confirm(message)) {
        window.location.href = href;
      }
    });
  });
  
  // Database delete confirmation
  const confirmDeleteCheckbox = document.getElementById('confirmDelete');
  const deleteButton = document.getElementById('deleteButton');
  
  if (confirmDeleteCheckbox && deleteButton) {
    confirmDeleteCheckbox.addEventListener('change', () => {
      deleteButton.disabled = !confirmDeleteCheckbox.checked;
    });
  }
};

/**
 * Handle expired session/auto logout
 */
const setupAutoLogout = () => {
  // Set last activity to current time on any user interaction
  ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
      DBMS.state.lastActivity = Date.now();
    });
  });
  
  // Check session every minute
  setInterval(() => {
    const inactive = Date.now() - DBMS.state.lastActivity;
    
    if (inactive >= DBMS.settings.autoLogoutTime) {
      // Show auto logout warning
      showToast('Your session has expired due to inactivity. Please log in again.', 'warning');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/logout';
      }, 3000);
    } else if (inactive >= DBMS.settings.autoLogoutTime - (60 * 1000)) {
      // Show warning one minute before logout
      showToast('Your session will expire in 1 minute due to inactivity. Please take action to stay logged in.', 'warning');
    }
  }, 60 * 1000);
};

/**
 * Initialize all payment functionality
 */
const setupPayments = () => {
  // Payment method selection
  const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
  const paymentForms = document.querySelectorAll('.payment-form');
  
  if (paymentMethods.length && paymentForms.length) {
    paymentMethods.forEach(method => {
      method.addEventListener('change', function() {
        paymentForms.forEach(form => {
          form.classList.add('d-none');
        });
        
        const selectedForm = document.getElementById(`${this.value}Form`);
        if (selectedForm) {
          selectedForm.classList.remove('d-none');
        }
      });
    });
  }
  
  // Extension days calculator
  const extensionDaysInput = document.getElementById('extensionDays');
  const newExpiryDateInput = document.getElementById('newExpiryDate');
  
  if (extensionDaysInput && newExpiryDateInput) {
    const currentExpiryDateStr = newExpiryDateInput.getAttribute('data-current-expiry') || new Date().toISOString();
    const currentExpiryDate = new Date(currentExpiryDateStr);
    
    extensionDaysInput.addEventListener('input', () => {
      const days = parseInt(extensionDaysInput.value) || 0;
      const newDate = new Date(currentExpiryDate);
      newDate.setDate(newDate.getDate() + days);
      
      newExpiryDateInput.value = formatDate(newDate);
    });
  }
  
  // Print receipt function
  window.printReceipt = function(paymentId) {
    const modalContent = document.querySelector(`#paymentModal${paymentId} .modal-body`).innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css">
        <style>
          body {
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .receipt-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .receipt-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            color: #666;
            font-size: 14px;
          }
          
          @media print {
            @page {
              margin: 1cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="receipt-title">Payment Receipt</div>
          <div class="receipt-subtitle">Hospital DBMS</div>
        </div>
        
        <div class="content">
          ${modalContent}
        </div>
        
        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>If you have any questions, please contact support@dbms.com</p>
          <p>© ${new Date().getFullYear()} Hospital DBMS. All rights reserved.</p>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };
};

/**
 * ====================================
 * INITIALIZATION
 * ====================================
 */
document.addEventListener('DOMContentLoaded', function() {
  if (DBMS.state.initialized) return;
  
  // Initialize features
  setupPasswordToggles();
  setupClipboardCopy();
  setupDatabaseCharts();
  setupTableSearch();
  setupFormValidation();
  setupConfirmationModals();
  setupAutoLogout();
  setupPayments();
  
  // Auto-hide alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 5000);
  });
  
  // Set initialized flag
  DBMS.state.initialized = true;
  
  console.log('Hospital DBMS initialized successfully');
});