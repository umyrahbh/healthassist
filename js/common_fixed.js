/**
 * Common utility functions for the entire application
 */

/**
 * Format date to MM/DD/YYYY
 * @param {string} dateStr - The date string to format
 * @returns {string} - Formatted date string
 */
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    
    var date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original if invalid
    
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var year = date.getFullYear();
    
    return (month < 10 ? '0' + month : month) + '/' + 
           (day < 10 ? '0' + day : day) + '/' + 
           year;
}

/**
 * Format time to HH:MM AM/PM
 * @param {string} timeStr - The time string to format
 * @returns {string} - Formatted time string
 */
function formatTime(timeStr) {
    if (!timeStr) return "N/A";
    
    // Handle time strings like "13:30:00"
    var timeParts = timeStr.split(':');
    if (timeParts.length < 2) return timeStr; // Return original if invalid
    
    var hours = parseInt(timeParts[0], 10);
    var minutes = parseInt(timeParts[1], 10);
    var ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return hours + ':' + 
           (minutes < 10 ? '0' + minutes : minutes) + ' ' + 
           ampm;
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, danger, warning, info)
 * @param {number} duration - How long to show the notification in ms
 */
function showNotification(message, type, duration) {
    if (type === undefined) type = "info";
    if (duration === undefined) duration = 3000;
    
    var notificationEl = document.createElement('div');
    notificationEl.className = "notification notification-" + type;
    notificationEl.textContent = message;
    document.body.appendChild(notificationEl);

    // Show notification with animation
    setTimeout(function() {
        notificationEl.style.transform = 'translateY(0)';
        notificationEl.style.opacity = '1';
    }, 10);

    // Hide and remove after duration
    setTimeout(function() {
        notificationEl.style.transform = 'translateY(-20px)';
        notificationEl.style.opacity = '0';
        setTimeout(function() {
            notificationEl.remove();
        }, 300);
    }, duration);
}

/**
 * Clear any visible notifications
 */
function clearNotifications() {
    var notifications = document.querySelectorAll('.notification');
    notifications.forEach(function(notification) {
        notification.remove();
    });
}

/**
 * Check if a field is empty
 * @param {string} value - The value to check
 * @returns {boolean} - True if the value is empty
 */
function isEmpty(value) {
    return value === null || value === undefined || value.trim() === '';
}

/**
 * Validate an email address
 * @param {string} email - The email to validate
 * @returns {boolean} - True if the email is valid
 */
function isValidEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate a phone number (basic validation)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if the phone number is valid
 */
function isValidPhone(phone) {
    // Basic validation - at least 10 digits
    return /^\d{10,}$/.test(phone.replace(/\D/g, ''));
}

/**
 * Validate a password (at least 8 characters with at least one number and one letter)
 * @param {string} password - The password to validate
 * @returns {boolean} - True if the password is valid
 */
function isValidPassword(password) {
    // At least 6 characters, at least one letter and one number
    return password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

/**
 * Show an error message for a form field
 * @param {string} fieldId - The ID of the field
 * @param {string} message - The error message to display
 */
function showFieldError(fieldId, message) {
    var errorEl = document.getElementById(fieldId + "-error");
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

/**
 * Clear an error message for a form field
 * @param {string} fieldId - The ID of the field
 */
function clearFieldError(fieldId) {
    var errorEl = document.getElementById(fieldId + "-error");
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

/**
 * Clear all errors in a form
 * @param {HTMLFormElement} form - The form element
 */
function clearFormErrors(form) {
    var errorElements = form.querySelectorAll('.error-message');
    errorElements.forEach(function(el) {
        el.textContent = '';
        el.style.display = 'none';
    });
}

/**
 * Check if user is logged in
 * @returns {boolean} - True if user is logged in
 */
function isLoggedIn() {
    return localStorage.getItem('user_id') !== null;
}

/**
 * Check if the current page is the login page
 * @returns {boolean} - True if current page is login page
 */
function isLoginPage() {
    return window.location.pathname.includes('login.html') || window.location.pathname.includes('/login');
}

/**
 * Check if the current page is the signup page
 * @returns {boolean} - True if current page is signup page
 */
function isSignupPage() {
    return window.location.pathname.includes('signup.html') || window.location.pathname.includes('/signup');
}

/**
 * Check authentication and redirect to login if not authenticated
 */
function checkAuth() {
    if (!isLoggedIn() && !isLoginPage() && !isSignupPage() && !window.location.pathname.includes('index.html')) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

/**
 * Open a modal dialog
 * @param {string} modalId - The ID of the modal to open
 */
function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Add backdrop if it doesn't exist
        if (!document.querySelector('.modal-backdrop')) {
            var backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
    }
}

/**
 * Close a modal dialog
 * @param {string} modalId - The ID of the modal to close
 */
function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        // Remove backdrop
        var backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }
}
