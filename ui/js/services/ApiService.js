/**
 * API Service
 * Handles all HTTP communications with the backend
 */
class ApiService {
  constructor(app) {
    this.app = app;
    this.baseURL = '';
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make HTTP request
   * @param {string} path - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response data
   */
  async request(path, method = 'GET', body = null, options = {}) {
    const config = {
      method,
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    // Add authorization header if token exists
    if (this.app.state.token) {
      config.headers['Authorization'] = `Bearer ${this.app.state.token}`;
    }

    // Add body for POST/PUT requests
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }

    try {
      console.log(`[ApiService] ${method} ${path}`, body ? { body } : '');
      
      const startTime = performance.now();
      const response = await fetch(this.baseURL + path, config);
      const endTime = performance.now();
      
      const responseTime = Math.round(endTime - startTime);
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const result = {
        ok: response.ok,
        status: response.status,
        data,
        responseTime,
        headers: response.headers
      };

      console.log(`[ApiService] Response: ${response.status} (${responseTime}ms)`, data);
      
      return result;
    } catch (error) {
      console.error(`[ApiService] Request failed: ${method} ${path}`, error);
      throw new Error(`Falha na comunicação com o servidor: ${error.message}`);
    }
  }

  /**
   * GET request
   * @param {string} path - API endpoint
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response data
   */
  async get(path, options = {}) {
    return this.request(path, 'GET', null, options);
  }

  /**
   * POST request
   * @param {string} path - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response data
   */
  async post(path, body, options = {}) {
    return this.request(path, 'POST', body, options);
  }

  /**
   * PUT request
   * @param {string} path - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response data
   */
  async put(path, body, options = {}) {
    return this.request(path, 'PUT', body, options);
  }

  /**
   * DELETE request
   * @param {string} path - API endpoint
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response data
   */
  async delete(path, options = {}) {
    return this.request(path, 'DELETE', null, options);
  }

  /**
   * Handle API errors
   * @param {Object} response - API response
   * @param {string} operation - Operation description
   */
  handleError(response, operation = 'Operação') {
    if (response.ok) return;

    let message = `${operation} falhou`;
    
    switch (response.status) {
      case 401:
        message = 'Acesso negado. Faça login novamente.';
        this.app.clearAuth();
        this.app.navigateTo('login');
        break;
      case 403:
        message = 'Você não tem permissão para realizar esta ação.';
        break;
      case 404:
        message = 'Recurso não encontrado.';
        break;
      case 500:
        message = 'Erro interno do servidor.';
        break;
      case 502:
        message = 'Serviço temporariamente indisponível.';
        break;
      default:
        if (response.data && response.data.error) {
          message = response.data.error;
        } else {
          message = `${operation} falhou (${response.status})`;
        }
    }

    throw new Error(message);
  }
}

// Export for module usage
export { ApiService };
