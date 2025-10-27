/**
 * Authentication Service
 * Handles user authentication and authorization
 */
class AuthService {
  constructor(app) {
    this.app = app;
    this.api = app.getService('api');
  }

  /**
   * User login
   */
  async login() {
    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();
    const statusElement = document.getElementById('loginStatus');

    if (!username || !password) {
      this.showStatus(statusElement, 'Por favor, preencha usuário e senha.', 'error');
      return;
    }

    try {
      this.showStatus(statusElement, 'Entrando...', 'loading');
      
      const response = await this.api.post('/api/auth/login', {
        username,
        password
      });

      if (response.ok) {
        this.app.setToken(response.data.token);
        this.app.navigateTo('main');
        await this.app.loadUserInfo();
        this.showStatus(statusElement, 'Login realizado com sucesso!', 'success');
        
        // Call health check
        this.api.get('/health');
      } else {
        this.api.handleError(response, 'Login');
      }
    } catch (error) {
      this.showStatus(statusElement, error.message, 'error');
    }
  }

  /**
   * User registration
   */
  async register() {
    const formData = this.getRegistrationData();
    const statusElement = document.getElementById('registerStatus');

    // Validate form data
    const validation = this.validateRegistration(formData);
    if (!validation.valid) {
      this.showStatus(statusElement, validation.message, 'error');
      return;
    }

    try {
      this.showStatus(statusElement, 'Cadastrando...', 'loading');

      // Monta payload para criação de usuário
      const payload = {
        username: formData.username,
        password: formData.password
      };

      // Usuário criado via "Cadastrar Escritório" será o admin inicial do escritório
      payload.roles = ['admin', 'lawyer', 'user'];
      payload.permissions = ['read', 'write', 'delete', 'orchestrate'];

      const resp = await this.api.post('/api/auth/register', payload);

      if (!resp.ok) {
        this.api.handleError(resp, 'Cadastro');
        return;
      }

      this.showStatus(statusElement, 'Cadastro realizado com sucesso! Redirecionando...', 'success');

      setTimeout(() => {
        this.app.navigateTo('login');
        const userInput = document.getElementById('username');
        if (userInput) userInput.value = formData.username;
        this.showStatus(document.getElementById('loginStatus'), 'Cadastro concluído! Faça login com suas credenciais.', 'success');
      }, 800);

    } catch (error) {
      this.showStatus(statusElement, error.message, 'error');
    }
  }

  /**
   * User logout
   */
  logout() {
    this.app.clearAuth();
    this.app.navigateTo('landing');
  }

  /**
   * Toggle OAB field visibility based on user type
   */
  toggleOabField() {
    const userType = document.getElementById('userType')?.value;
    const oabGroup = document.getElementById('oabNumber')?.parentElement;
    const oabInput = document.getElementById('oabNumber');
    const oabLabel = oabGroup?.querySelector('label');

    if (!oabGroup || !oabInput || !oabLabel) return;

    if (userType === 'estagiario') {
      oabGroup.classList.add('hidden');
      oabInput.value = '';
      oabInput.removeAttribute('required');
    } else if (userType === 'advogado') {
      oabGroup.classList.remove('hidden');
      oabInput.setAttribute('required', 'required');
      oabLabel.textContent = 'Número da OAB *';
    } else {
      oabGroup.classList.remove('hidden');
      oabInput.removeAttribute('required');
      oabLabel.textContent = 'Número da OAB';
    }
  }

  /**
   * Get registration form data
   * @returns {Object} Form data
   */
  getRegistrationData() {
    return {
      officeName: document.getElementById('officeName')?.value?.trim() || '',
      cnpj: document.getElementById('cnpj')?.value?.trim() || '',
      responsibleName: document.getElementById('responsibleName')?.value?.trim() || '',
      oabNumber: document.getElementById('oabNumber')?.value?.trim() || '',
      userType: document.getElementById('userType')?.value || '',
      email: document.getElementById('email')?.value?.trim() || '',
      phone: document.getElementById('phone')?.value?.trim() || '',
      username: document.getElementById('newUsername')?.value?.trim() || '',
      password: document.getElementById('newPassword')?.value || '',
      confirmPassword: document.getElementById('confirmPassword')?.value || '',
      acceptTerms: document.getElementById('acceptTerms')?.checked || false
    };
  }

  /**
   * Validate registration data
   * @param {Object} data - Registration data
   * @returns {Object} Validation result
   */
  validateRegistration(data) {
    const requiredFields = ['officeName', 'cnpj', 'responsibleName', 'userType', 'email', 'phone', 'username', 'password'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: 'Por favor, preencha todos os campos obrigatórios.'
        };
      }
    }

    if (data.userType === 'advogado' && !data.oabNumber) {
      return {
        valid: false,
        message: 'Número da OAB é obrigatório para advogados.'
      };
    }

    if (data.password !== data.confirmPassword) {
      return {
        valid: false,
        message: 'As senhas não coincidem.'
      };
    }

    if (data.password.length < 8) {
      return {
        valid: false,
        message: 'A senha deve ter pelo menos 8 caracteres.'
      };
    }

    if (!data.acceptTerms) {
      return {
        valid: false,
        message: 'Você deve aceitar os termos de uso e política de privacidade.'
      };
    }

    return { valid: true };
  }

  /**
   * Show status message
   * @param {HTMLElement} element - Status element
   * @param {string} message - Message to show
   * @param {string} type - Message type (success, error, loading)
   */
  showStatus(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `auth-status ${type}`;
  }
}

// Export for module usage
export { AuthService };
