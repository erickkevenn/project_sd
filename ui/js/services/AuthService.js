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
   * User login usando EMAIL
   */
  async login() {
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();
    const statusElement = document.getElementById('loginStatus');

    if (!email || !password) {
      this.showStatus(statusElement, 'Por favor, preencha email e senha.', 'error');
      return;
    }

    // Validar formato de email
    if (!email.includes('@')) {
      this.showStatus(statusElement, 'Por favor, digite um email válido.', 'error');
      return;
    }

    try {
      this.showStatus(statusElement, 'Entrando...', 'loading');
      
      const response = await this.api.post('/api/auth/login', {
        email,
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
   * User registration usando EMAIL
   * O papel é automaticamente detectado pelo domínio (@admin.com, @advogado.com, @estagiario.com)
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

      // Monta payload para criação de usuário (papel detectado automaticamente pelo domínio)
      const payload = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        office_name: formData.officeName,
        cnpj: formData.cnpj,
        responsible_name: formData.responsibleName,
        phone: formData.phone
      };

      const resp = await this.api.post('/api/auth/register', payload);

      if (!resp.ok) {
        this.api.handleError(resp, 'Cadastro');
        return;
      }

      this.showStatus(statusElement, 'Cadastro realizado com sucesso! Redirecionando...', 'success');

      setTimeout(() => {
        this.app.navigateTo('login');
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.value = formData.email;
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
   * Get registration form data
   * @returns {Object} Form data
   */
  getRegistrationData() {
    return {
      officeName: document.getElementById('officeName')?.value?.trim() || '',
      cnpj: document.getElementById('cnpj')?.value?.trim() || '',
      responsibleName: document.getElementById('responsibleName')?.value?.trim() || '',
      email: document.getElementById('registerEmail')?.value?.trim() || '',
      name: document.getElementById('registerName')?.value?.trim() || '',
      phone: document.getElementById('phone')?.value?.trim() || '',
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
    const requiredFields = ['officeName', 'cnpj', 'responsibleName', 'email', 'name', 'phone', 'password'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: 'Por favor, preencha todos os campos obrigatórios.'
        };
      }
    }

    // Validar formato de email
    if (!data.email.includes('@') || !data.email.includes('.')) {
      return {
        valid: false,
        message: 'Por favor, digite um email válido.'
      };
    }

    // Validar domínio permitido
    const allowedDomains = ['@admin.com', '@advogado.com', '@estagiario.com'];
    const hasValidDomain = allowedDomains.some(domain => data.email.endsWith(domain));
    if (!hasValidDomain) {
      return {
        valid: false,
        message: 'Email deve ter domínio @admin.com, @advogado.com ou @estagiario.com'
      };
    }

    if (data.password !== data.confirmPassword) {
      return {
        valid: false,
        message: 'As senhas não coincidem.'
      };
    }

    if (data.password.length < 6) {
      return {
        valid: false,
        message: 'A senha deve ter pelo menos 6 caracteres.'
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
