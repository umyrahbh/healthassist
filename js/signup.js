/**
 * Signup page functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get the signup form
    const signupForm = document.getElementById('signup-form');
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    /**
     * Handle signup form submission
     * @param {Event} e - Form submit event
     */
    function handleSignup(e) {
        e.preventDefault();
        
        // Reset error messages
        resetErrors();
        
        // Get form values
        const username = document.getElementById('signup-username').value.trim();
        const fullName = document.getElementById('signup-fullname').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const gender = document.getElementById('signup-gender').value;
        const birthday = document.getElementById('signup-birthday').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        
        // Basic validation
        let isValid = true;
        
        if (!username) {
            showError('username-error', 'Username is required');
            isValid = false;
        } else if (username.length < 3) {
            showError('username-error', 'Username must be at least 3 characters');
            isValid = false;
        }
        
        if (!fullName) {
            showError('fullname-error', 'Full name is required');
            isValid = false;
        }
        
        if (!email) {
            showError('email-error', 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('email-error', 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!phone) {
            showError('phone-error', 'Phone number is required');
            isValid = false;
        } else if (!isValidPhone(phone)) {
            showError('phone-error', 'Please enter a valid phone number');
            isValid = false;
        }
        
        if (!gender) {
            showError('gender-error', 'Please select your gender');
            isValid = false;
        }
        
        if (!birthday) {
            showError('birthday-error', 'Date of birth is required');
            isValid = false;
        }
        
        if (!password) {
            showError('password-error', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showError('password-error', 'Password must be at least 6 characters');
            isValid = false;
        }
        
        if (password !== confirmPassword) {
            showError('confirm-password-error', 'Passwords do not match');
            isValid = false;
        }
        
        if (!isValid) {
            return;
        }
        
        // Prepare data for API
        const userData = {
            username: username,
            user_name: fullName,
            email: email,
            phone_number: phone.replace(/\D/g, ''), // Remove non-numeric chars
            gender: gender,
            birthday: birthday,
            password: password,
            user_type: 'Normal' // Default to normal user
        };
        
        // Show loading state
        const submitBtn = document.getElementById('signup-btn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;
        
        // Submit data to API
        fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Failed to register');
                });
            }
            return response.json();
        })
        .then(data => {
            // Registration successful, show success message
            const errorDiv = document.getElementById('signup-error');
            errorDiv.textContent = 'Registration successful! Redirecting to login page...';
            errorDiv.style.display = 'block';
            errorDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
            errorDiv.style.color = '#28a745';
            
            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = '/login?registered=true';
            }, 2000);
        })
        .catch(error => {
            // Show error message
            const errorDiv = document.getElementById('signup-error');
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        });
    }
    
    /**
     * Show an error message for a specific field
     * @param {string} elementId - The ID of the error element
     * @param {string} message - The error message to display
     */
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    /**
     * Reset all error messages
     */
    function resetErrors() {
        const errorElements = document.querySelectorAll('.form-error');
        errorElements.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        
        const signupError = document.getElementById('signup-error');
        if (signupError) {
            signupError.style.display = 'none';
            signupError.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            signupError.style.color = 'var(--danger-color)';
        }
    }
    
    /**
     * Validate email format
     * @param {string} email - The email to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    /**
     * Validate phone number format (basic validation)
     * @param {string} phone - The phone number to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    function isValidPhone(phone) {
        // Basic validation - at least 10 digits
        return phone.replace(/\D/g, '').length >= 10;
    }
});
