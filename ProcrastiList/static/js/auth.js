class AuthApp {
    constructor() {
        this.currentView = 'login';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // View switching
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('register');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('login');
        });

        // Password toggles
        document.getElementById('toggleLoginPassword').addEventListener('click', () => {
            this.togglePassword('loginPassword', 'toggleLoginPassword');
        });

        document.getElementById('toggleRegisterPassword').addEventListener('click', () => {
            this.togglePassword('registerPassword', 'toggleRegisterPassword');
        });

        document.getElementById('toggleConfirmPassword').addEventListener('click', () => {
            this.togglePassword('confirmPassword', 'toggleConfirmPassword');
        });

        // Social login buttons
        document.getElementById('googleLogin').addEventListener('click', () => {
            this.handleSocialLogin('google');
        });

        document.getElementById('githubLogin').addEventListener('click', () => {
            this.handleSocialLogin('github');
        });

        // Password strength checking
        document.getElementById('registerPassword').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });

        // Real-time password confirmation
        document.getElementById('confirmPassword').addEventListener('input', () => {
            this.validatePasswordMatch();
        });

        // Form validation
        document.getElementById('registerEmail').addEventListener('blur', (e) => {
            this.validateEmail(e.target.value, 'registerEmail');
        });

        document.getElementById('loginEmail').addEventListener('blur', (e) => {
            this.validateEmail(e.target.value, 'loginEmail');
        });
    }

    switchView(view) {
        const loginSection = document.getElementById('loginSection');
        const registerSection = document.getElementById('registerSection');
        const authSubtitle = document.querySelector('.auth-subtitle');

        if (view === 'register') {
            loginSection.classList.remove('active');
            registerSection.classList.add('active');
            authSubtitle.textContent = 'Create your account to get started.';
            this.currentView = 'register';
        } else {
            registerSection.classList.remove('active');
            loginSection.classList.add('active');
            authSubtitle.textContent = 'Welcome back! Please sign in to continue.';
            this.currentView = 'login';
        }
    }

    togglePassword(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        const icon = toggle.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    showLoading() {
        document.getElementById('authLoading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('authLoading').classList.add('hidden');
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!this.validateEmail(email, 'loginEmail') || !password) {
            this.showToast('Please fill in all fields correctly', 'error');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    remember_me: rememberMe
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Store auth token
            if (rememberMe) {
                localStorage.setItem('authToken', data.access_token);
            } else {
                sessionStorage.setItem('authToken', data.access_token);
            }

            this.showToast('Login successful! Redirecting...', 'success');
            
            // Redirect to main app
            setTimeout(() => {
                window.location.href = '/app';
            }, 1500);

        } catch (error) {
            this.showToast(error.message || 'Login failed', 'error');
            console.error('Login error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        if (!name || !this.validateEmail(email, 'registerEmail') || !password || !confirmPassword) {
            this.showToast('Please fill in all fields correctly', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (!agreeTerms) {
            this.showToast('Please agree to the Terms & Conditions', 'error');
            return;
        }

        if (!this.isPasswordStrong(password)) {
            this.showToast('Password must be at least 8 characters with uppercase, lowercase, and number', 'error');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            this.showToast('Registration successful! Please sign in.', 'success');
            
            // Switch to login view
            setTimeout(() => {
                this.switchView('login');
                document.getElementById('loginEmail').value = email;
            }, 2000);

        } catch (error) {
            this.showToast(error.message || 'Registration failed', 'error');
            console.error('Registration error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async handleSocialLogin(provider) {
        this.showLoading();
        this.showToast(`Redirecting to ${provider} login...`, 'info');

        try {
            // In a real app, this would redirect to OAuth provider
            window.location.href = `/api/auth/${provider}`;
        } catch (error) {
            this.showToast(`${provider} login failed`, 'error');
            this.hideLoading();
        }
    }

    validateEmail(email, inputId) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const input = document.getElementById(inputId);
        
        if (!emailRegex.test(email)) {
            input.style.borderColor = '#ef4444';
            return false;
        } else {
            input.style.borderColor = '#10b981';
            return true;
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmInput.style.borderColor = '#ef4444';
            return false;
        } else if (confirmPassword) {
            confirmInput.style.borderColor = '#10b981';
            return true;
        }
        return true;
    }

    checkPasswordStrength(password) {
        const input = document.getElementById('registerPassword');
        let strength = 0;

        // Check length
        if (password.length >= 8) strength++;
        // Check for lowercase
        if (/[a-z]/.test(password)) strength++;
        // Check for uppercase
        if (/[A-Z]/.test(password)) strength++;
        // Check for numbers
        if (/\d/.test(password)) strength++;
        // Check for special characters
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        // Remove existing strength indicator
        const existingIndicator = input.parentNode.querySelector('.password-strength');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        if (password.length > 0) {
            const strengthIndicator = document.createElement('div');
            strengthIndicator.className = 'password-strength';
            
            const strengthBar = document.createElement('div');
            strengthBar.className = 'password-strength-bar';
            strengthIndicator.appendChild(strengthBar);

            if (strength <= 2) {
                strengthIndicator.classList.add('weak');
            } else if (strength <= 3) {
                strengthIndicator.classList.add('medium');
            } else {
                strengthIndicator.classList.add('strong');
            }

            input.parentNode.appendChild(strengthIndicator);
        }
    }

    isPasswordStrong(password) {
        return password.length >= 8 && 
               /[a-z]/.test(password) && 
               /[A-Z]/.test(password) && 
               /\d/.test(password);
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (token) {
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    // User is already authenticated, redirect to app
                    window.location.href = '/app';
                }
            } catch (error) {
                // Token is invalid, remove it
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
            }
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-triangle' : 
                    'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 4000);
        
        // Remove on click
        toast.addEventListener('click', () => {
            toast.remove();
        });
    }
}

// Initialize the auth app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthApp();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape to clear any error states
    if (e.key === 'Escape') {
        // Clear any input error styles
        document.querySelectorAll('input').forEach(input => {
            input.style.borderColor = '';
        });
    }
    
    // Enter to submit active form
    if (e.key === 'Enter' && !e.shiftKey) {
        const activeForm = document.querySelector('.auth-section.active form');
        if (activeForm && document.activeElement.tagName === 'INPUT') {
            activeForm.dispatchEvent(new Event('submit'));
        }
    }
});
