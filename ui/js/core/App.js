/**
 * Main Application Class
 * Central controller for the JurisFlow application
 */
class App {
  constructor() {
    this.state = {
      user: null,
      token: null,
      currentPage: 'landing',
      isLoading: false
    };
    
    this.services = {};
    this.components = {};
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('[App] Initializing JurisFlow application...');
    
    try {
      // Load components first
      await this.loadComponents();
      
      // Load saved token
      const savedToken = localStorage.getItem("jwtToken");
      if (savedToken) {
        this.state.token = savedToken;
        await this.loadUserInfo();
        this.navigateTo('main');
      } else {
        this.navigateTo('landing');
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('[App] Application initialized successfully');
    } catch (error) {
      console.error('[App] Failed to initialize application:', error);
      this.handleError(error);
    }
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Enter key listeners for forms
    const passwordField = document.getElementById('password');
    if (passwordField) {
      passwordField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.services.auth?.login();
        }
      });
    }
    
    const confirmPasswordField = document.getElementById('confirmPassword');
    if (confirmPasswordField) {
      confirmPasswordField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.services.auth?.register();
        }
      });
    }
  }

  /**
   * Navigate to a specific page
   * @param {string} page - Page identifier
   */
  navigateTo(page) {
    console.log(`[App] Navigating to: ${page}`);
    
    // Hide all pages
    const pages = ['landingPage', 'loginPage', 'registerPage', 'mainUI'];
    pages.forEach(pageId => {
      const element = document.getElementById(pageId);
      if (element) {
        element.style.display = 'none';
      }
    });
    
    // Show target page
    this.state.currentPage = page;
    switch (page) {
      case 'landing':
        document.getElementById('landingPage').style.display = 'block';
        break;
      case 'login':
        document.getElementById('loginPage').style.display = 'block';
        break;
      case 'register':
        document.getElementById('registerPage').style.display = 'block';
        break;
      case 'main':
        document.getElementById('mainUI').style.display = 'block';
        break;
    }
  }

  /**
   * Load HTML components
   */
  async loadComponents() {
    const components = [
      { id: 'navigation-container', file: 'components/navigation.html' },
      { id: 'header-container', file: 'components/header.html' },
      { id: 'auth-pages-container', file: 'components/auth-pages.html' },
      { id: 'modals-container', file: 'components/modals.html' }
    ];
    
    for (const component of components) {
      try {
        const response = await fetch(`/ui/${component.file}`);
        if (response.ok) {
          const html = await response.text();
          const container = document.getElementById(component.id);
          if (container) {
            container.innerHTML = html;
            
            // After loading header, ensure back button is hidden on main screen
            if (component.id === 'header-container') {
              this.initializeHeader();
            }
          }
        }
      } catch (error) {
        console.warn(`[App] Failed to load component ${component.file}:`, error);
      }
    }
  }

  /**
   * Initialize header after loading
   */
  initializeHeader() {
    // Hide back button on main screen (it should only show on standalone pages)
    const btnBackHome = document.getElementById('btnBackHome');
    if (btnBackHome) {
      btnBackHome.style.display = 'none';
    }
    
    // Define global goToMainScreen for compatibility
    window.goToMainScreen = () => {
      this.navigateTo('main');
    };
  }

  /**
   * Load user information
   */
  async loadUserInfo() {
    if (!this.state.token) {
      this.updateUserInterface();
      return;
    }
    
    try {
      const response = await this.services.api?.get('/api/auth/me');
      if (response && response.ok) {
        this.state.user = response.data.user;
        this.updateUserInterface();
        this.services.permission?.applyControl(this.state.user.permissions);
      } else {
        console.warn('[App] No valid response from /api/auth/me');
        this.updateUserInterface();
      }
    } catch (error) {
      console.error('[App] Failed to load user info:', error);
      this.updateUserInterface();
    }
  }

  /**
   * Update user interface with user data
   */
  updateUserInterface() {
    const officeNameBox = document.getElementById('officeName');
    const userNameBox = document.getElementById('userName');
    
    if (officeNameBox) {
      if (this.state.user && this.state.user.office) {
        officeNameBox.textContent = this.state.user.office;
      } else {
        officeNameBox.textContent = 'Escritório';
      }
    }
    
    if (userNameBox) {
      if (this.state.user && this.state.user.username) {
        userNameBox.textContent = this.state.user.username;
      } else {
        userNameBox.textContent = 'Usuário';
      }
    }
  }

  /**
   * Set authentication token
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.state.token = token;
    localStorage.setItem("jwtToken", token);
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    this.state.token = null;
    this.state.user = null;
    localStorage.removeItem("jwtToken");
  }

  /**
   * Handle application errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    console.error('[App] Application error:', error);
    
    // Show user-friendly error message
    const errorMessage = error.message || 'Ocorreu um erro inesperado';
    alert(`Erro: ${errorMessage}`);
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {Object} service - Service instance
   */
  registerService(name, service) {
    this.services[name] = service;
    console.log(`[App] Service registered: ${name}`);
  }

  /**
   * Get a registered service
   * @param {string} name - Service name
   * @returns {Object} Service instance
   */
  getService(name) {
    return this.services[name];
  }
}

// Export for module usage
export { App };
