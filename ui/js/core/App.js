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
<<<<<<< Updated upstream
=======
      // Load components first and ensure they're available
      await this.loadComponents();
      
      // Verify critical components are loaded
      await this.ensureComponentsLoaded();
      
>>>>>>> Stashed changes
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
      
      // Load components
      await this.loadComponents();
      
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
  async navigateTo(page) {
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
        const landingPage = document.getElementById('landingPage');
        if (landingPage) {
          landingPage.style.display = 'block';
        }
        break;
      case 'login':
        await this.ensureLoginPageAvailable();
        break;
      case 'register':
        await this.ensureRegisterPageAvailable();
        break;
      case 'main':
        const mainUI = document.getElementById('mainUI');
        if (mainUI) {
          mainUI.style.display = 'block';
        }
        break;
    }
  }

  /**
   * Ensure login page is available and show it
   */
  async ensureLoginPageAvailable() {
    let loginPage = document.getElementById('loginPage');
    
    if (!loginPage) {
      console.warn('[App] Login page not found, loading components...');
      await this.loadComponents();
      loginPage = document.getElementById('loginPage');
    }
    
    if (loginPage) {
      loginPage.style.display = 'block';
      console.log('[App] Login page displayed successfully');
    } else {
      console.error('[App] Failed to load login page after retry');
      // Try to load auth-pages component directly
      try {
        console.log('[App] Attempting direct component load...');
        const response = await fetch('/ui/components/auth-pages.html');
        if (response.ok) {
          const html = await response.text();
          const authContainer = document.getElementById('auth-pages-container');
          if (authContainer) {
            authContainer.innerHTML = html;
            const retryLoginPage = document.getElementById('loginPage');
            if (retryLoginPage) {
              retryLoginPage.style.display = 'block';
              console.log('[App] Login page loaded via direct component fetch');
              return;
            }
          }
        }
      } catch (error) {
        console.error('[App] Direct component load failed:', error);
      }
      
      // Show error to user
      alert('Erro ao carregar a página de login. Recarregue a página.');
    }
  }

  /**
   * Ensure register page is available and show it
   */
  async ensureRegisterPageAvailable() {
    let registerPage = document.getElementById('registerPage');
    
    if (!registerPage) {
      console.warn('[App] Register page not found, loading components...');
      await this.loadComponents();
      registerPage = document.getElementById('registerPage');
    }
    
    if (registerPage) {
      registerPage.style.display = 'block';
      console.log('[App] Register page displayed successfully');
    } else {
      console.error('[App] Failed to load register page after retry');
      // Try to load auth-pages component directly
      try {
        console.log('[App] Attempting direct component load...');
        const response = await fetch('/ui/components/auth-pages.html');
        if (response.ok) {
          const html = await response.text();
          const authContainer = document.getElementById('auth-pages-container');
          if (authContainer) {
            authContainer.innerHTML = html;
            const retryRegisterPage = document.getElementById('registerPage');
            if (retryRegisterPage) {
              retryRegisterPage.style.display = 'block';
              console.log('[App] Register page loaded via direct component fetch');
              return;
            }
          }
        }
      } catch (error) {
        console.error('[App] Direct component load failed:', error);
      }
      
      // Show error to user
      alert('Erro ao carregar a página de cadastro. Recarregue a página.');
    }
  }

  /**
   * Load HTML components
   */
  async loadComponents() {
    const components = [
      { id: 'navigation-container', file: 'ui/components/navigation.html' },
      { id: 'header-container', file: 'ui/components/header.html' },
      { id: 'auth-pages-container', file: 'ui/components/auth-pages.html' },
      { id: 'modals-container', file: 'ui/components/modals.html' }
    ];
    
    for (const component of components) {
      try {
        console.log(`[App] Loading component: ${component.file}`);
        const response = await fetch(`/${component.file}`);
        if (response.ok) {
          const html = await response.text();
          const container = document.getElementById(component.id);
          if (container) {
            container.innerHTML = html;
<<<<<<< Updated upstream
=======
            console.log(`[App] Component ${component.id} loaded successfully`);
            
            // After loading header, ensure back button is hidden on main screen
            if (component.id === 'header-container') {
              this.initializeHeader();
            }
          } else {
            console.warn(`[App] Container ${component.id} not found in DOM`);
>>>>>>> Stashed changes
          }
        } else {
          console.error(`[App] Failed to fetch component ${component.file}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`[App] Failed to load component ${component.file}:`, error);
      }
    }
  }

  /**
<<<<<<< Updated upstream
=======
   * Ensure critical components are loaded
   */
  async ensureComponentsLoaded() {
    const criticalElements = ['loginPage', 'registerPage'];
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      const missingElements = criticalElements.filter(id => !document.getElementById(id));
      
      if (missingElements.length === 0) {
        console.log('[App] All critical components loaded successfully');
        return;
      }
      
      console.log(`[App] Missing components: ${missingElements.join(', ')}, retrying... (${retries + 1}/${maxRetries})`);
      
      // Wait a bit and try loading components again
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.loadComponents();
      
      retries++;
    }
    
    console.warn('[App] Some critical components may not be available');
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
>>>>>>> Stashed changes
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
        console.log('[App] Raw user data from /api/auth/me:', response.data);
        this.state.user = response.data;
        console.log('[App] User state after /me response:', this.state.user);
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
