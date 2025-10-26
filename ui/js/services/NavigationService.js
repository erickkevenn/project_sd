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
  async showLogin() {
    this.clearLoginForm();
    await this.app.navigateTo('login');
    
    // Focus on username field after ensuring page is loaded
    setTimeout(() => {
      const usernameField = document.getElementById('username');
      if (usernameField) {
        usernameField.focus();
        console.log('[NavigationService] Login page loaded and focused');
      } else {
        console.warn('[NavigationService] Username field not found, retrying...');
        // Retry after a longer delay
        setTimeout(() => {
          const retryUsernameField = document.getElementById('username');
          if (retryUsernameField) {
            retryUsernameField.focus();
            console.log('[NavigationService] Username field focused on retry');
          } else {
            console.error('[NavigationService] Username field not found after retry');
          }
        }, 500);
      }
    }, 100);
  }

  /**
   * Show register page
   */
  async showRegister() {
    this.clearRegisterForm();
    await this.app.navigateTo('register');
    
    // Reset OAB field and focus on office name after ensuring page is loaded
    setTimeout(() => {
      this.app.getService('auth')?.toggleOabField();
      const officeNameField = document.getElementById('officeName');
      if (officeNameField) {
        officeNameField.focus();
        console.log('[NavigationService] Register page loaded and focused');
      } else {
        console.warn('[NavigationService] Office name field not found, retrying...');
        // Retry after a longer delay
        setTimeout(() => {
          this.app.getService('auth')?.toggleOabField();
          const retryOfficeNameField = document.getElementById('officeName');
          if (retryOfficeNameField) {
            retryOfficeNameField.focus();
            console.log('[NavigationService] Office name field focused on retry');
          } else {
            console.error('[NavigationService] Office name field not found after retry');
          }
        }, 500);
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
