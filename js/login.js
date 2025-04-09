/**
 * Login page functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is coming from a successful registration
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        showRegistrationSuccess();
    }
    
    // Get the login form
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    /**
     * Handle login form submission
     * @param {Event} e - Form submit event
     */
    function handleLogin(e) {
        e.preventDefault();
        
        // Hide any visible error messages
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.style.display = 'none';
        }
        
        // Get form values
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('remember')?.checked;
        
        // Basic validation
        if (!username || !password) {
            showLoginError('Please enter both username and password');
            return;
        }
        
        // Prepare login data
        const loginData = {
            username: username,
            password: password
        };
        
        // Show loading state
        const submitBtn = document.getElementById('login-btn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        // Submit login request
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Login failed');
                });
            }
            return response.json();
        })
        .then(data => {
            // Save authentication data
            if (remember) {
                localStorage.setItem('remember_me', 'true');
            }
            
            // Store user data in session storage for the current session
            sessionStorage.setItem('userData', JSON.stringify({
                user_id: data.user_id,
                user_name: data.user_name,
                user_type: data.user_type
            }));
            
            // Redirect based on user type
            if (data.user_type === 'Admin') {
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/';
            }
        })
        .catch(error => {
            showLoginError(error.message || 'Connection error. Please try again.');
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        });
    }
    
    /**
     * Show login error message
     * @param {string} message - Error message to display
     */
    function showLoginError(message) {
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }
    
    /**
     * Show registration success message
     */
    function showRegistrationSuccess() {
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = 'Registration successful! Please log in with your credentials.';
            loginError.style.display = 'block';
            loginError.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
            loginError.style.color = '#28a745';
        }
    }
});
