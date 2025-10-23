/**
 * Navigation Service
 * Handles page navigation and routing
 */
class NavigationService {
  constructor(app) {
    this.app = app;
  }

  /**
   * Show landing page
   */
  showLanding() {
    this.app.navigateTo('landing');
  }

  /**
   * Show login page
   */
  showLogin() {
    this.clearLoginForm();
    this.app.navigateTo('login');
    
    // Focus on username field
    setTimeout(() => {
      const usernameField = document.getElementById('username');
      if (usernameField) {
        usernameField.focus();
      }
    }, 100);
  }

  /**
   * Show register page
   */
  showRegister() {
    this.clearRegisterForm();
    this.app.navigateTo('register');
    
    // Reset OAB field and focus on office name
    setTimeout(() => {
      this.app.getService('auth')?.toggleOabField();
      const officeNameField = document.getElementById('officeName');
      if (officeNameField) {
        officeNameField.focus();
      }
    }, 100);
  }

  /**
   * Show main system
   */
  showMain() {
    this.app.navigateTo('main');
  }

  /**
   * Show main system (alias for compatibility)
   */
  showMainSystem() {
    this.showMain();
  }

  /**
   * Clear login form
   */
  clearLoginForm() {
    const fields = ['username', 'password'];
    fields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = '';
      }
    });
    
    const statusElement = document.getElementById('loginStatus');
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = 'auth-status';
    }
  }

  /**
   * Clear register form
   */
  clearRegisterForm() {
    const fields = [
      'officeName', 'cnpj', 'responsibleName', 'oabNumber', 
      'email', 'phone', 'newUsername', 'newPassword', 'confirmPassword'
    ];
    
    fields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = '';
      }
    });
    
    const userTypeSelect = document.getElementById('userType');
    if (userTypeSelect) {
      userTypeSelect.value = '';
    }
    
    const acceptTermsCheckbox = document.getElementById('acceptTerms');
    if (acceptTermsCheckbox) {
      acceptTermsCheckbox.checked = false;
    }
    
    const statusElement = document.getElementById('registerStatus');
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = 'auth-status';
    }
  }
}

// Export for module usage
export { NavigationService };
