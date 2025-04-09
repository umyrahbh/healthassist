/**
 * Common utility functions for the entire application
 */

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, danger, warning, info)
 * @param {number} duration - How long to show the notification in ms
 */
function showNotification(message, type = "info", duration = 3000) {
    const notificationEl = document.createElement('div');
    notificationEl.className = `notification notification-${type}`;
    notificationEl.textContent = message;
    document.body.appendChild(notificationEl);

    // Show notification with animation
    setTimeout(() => {
        notificationEl.style.transform = 'translateY(0)';
        notificationEl.style.opacity = '1';
    }, 10);

    // Hide and remove after duration
    setTimeout(() => {
        notificationEl.style.transform = 'translateY(-20px)';
        notificationEl.style.opacity = '0';
        setTimeout(() => {
            notificationEl.remove();
        }, 300);
    }, duration);
}

/**
 * Clear any visible notifications
 */
function clearNotifications() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => notification.remove());
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
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    const errorEl = document.getElementById(`${fieldId}-error`);
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
    const errorEl = document.getElementById(`${fieldId}-error`);
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
    const errorElements = form.querySelectorAll('.error-message');
    errorElements.forEach(el => {
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
