/**
 * Document Service
 * Handles document-related operations
 */
class DocumentService {
  constructor(app) {
    this.app = app;
    this.api = app.getService('api');
  }

  /**
   * List all documents
   */
  async list() {
    try {
      const response = await this.api.get('/api/documents');
      
      if (response.ok) {
        this.showDataModal('Documentos', response.data);
      } else {
        this.api.handleError(response, 'Listar documentos');
      }
    } catch (error) {
      this.app.handleError(error);
    }
  }

  /**
   * Show create document modal
   */
  showCreateModal() {
    const modal = document.getElementById('createDocumentModal');
    if (!modal) return;

    // Clear form fields
    const fields = ['docProcessIdInput', 'docTitleInput', 'docContentInput', 'docAuthorInput'];
    fields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) element.value = '';
    });

    modal.style.display = 'flex';
    document.getElementById('docProcessIdInput')?.focus();
  }

  /**
   * Create new document
   */
  async create() {
    const title = document.getElementById('docTitleInput')?.value?.trim();
    const content = document.getElementById('docContentInput')?.value?.trim();
    const author = document.getElementById('docAuthorInput')?.value?.trim();
    const processId = document.getElementById('docProcessIdInput')?.value?.trim();

    // Validate required fields
    if (!processId) {
      alert('⚠️ Por favor, selecione um processo.\n\nDocumentos devem estar associados a um processo existente.');
      return;
    }

    if (!title || !content || !author) {
      alert('Por favor, preencha todos os campos obrigatórios (título, conteúdo e autor).');
      return;
    }

    const documentData = {
      title,
      content,
      author,
      process_id: processId
    };

    try {
      this.closeCreateModal();
      const response = await this.api.post('/api/documents', documentData);
      
      if (response.ok) {
        this.showSuccessMessage(`✅ Documento criado com sucesso!\n\nProcesso: ${processId}`);
      } else {
        this.api.handleError(response, 'Criar documento');
      }
    } catch (error) {
      this.app.handleError(error);
    }
  }

  /**
   * Show search document modal
   */
  showSearchModal() {
    const modal = document.getElementById('searchModal');
    if (!modal) return;

    modal.style.display = 'flex';
    const input = document.getElementById('docIdInput');
    if (input) {
      input.value = '';
      input.focus();
      
      input.onkeypress = (e) => {
        if (e.key === 'Enter') {
          this.search();
        }
      };
    }
  }

  /**
   * Search document by ID
   */
  async search() {
    const docId = document.getElementById('docIdInput')?.value?.trim();
    
    this.closeSearchModal();
    
    if (!docId) {
      alert('Por favor, informe o ID do documento.');
      return;
    }

    try {
      const response = await this.api.get(`/api/documents/${docId}`);
      
      if (response.ok) {
        this.showDataModal(`Documento ${docId}`, response.data);
      } else {
        this.api.handleError(response, 'Buscar documento');
      }
    } catch (error) {
      this.app.handleError(error);
    }
  }

  /**
   * Close create modal
   */
  closeCreateModal() {
    const modal = document.getElementById('createDocumentModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Close search modal
   */
  closeSearchModal() {
    const modal = document.getElementById('searchModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Show data in modal
   * @param {string} title - Modal title
   * @param {*} data - Data to display
   */
  showDataModal(title, data) {
    const modal = document.getElementById('dataModal');
    const titleElement = document.getElementById('dataModalTitle');
    const container = document.getElementById('dataTableContainer');
    const status = document.getElementById('dataStatus');
    
    if (!modal || !titleElement || !container) return;

    titleElement.textContent = title;
    
    // Clear loading status
    if (status) {
      status.textContent = '';
      status.style.display = 'none';
    }
    
    if (Array.isArray(data) && data.length > 0) {
      container.innerHTML = this.renderTable(data);
    } else if (data && typeof data === 'object') {
      container.innerHTML = this.renderObjectTable(data);
    } else {
      container.innerHTML = '<div class="empty-state">Nenhum dado encontrado</div>';
    }
    
    modal.style.display = 'flex';
  }

  /**
   * Render data as table
   * @param {Array} items - Data items
   * @returns {string} HTML table
   */
  renderTable(items) {
    if (!items || items.length === 0) {
      return '<div class="empty-state">Nenhum item encontrado</div>';
    }

    const keys = Object.keys(items[0]);
    
    let html = '<div class="data-table-container"><table class="data-table">';
    
    // Header
    html += '<thead><tr>';
    keys.forEach(key => {
      html += `<th>${this.formatColumnName(key)}</th>`;
    });
    html += '</tr></thead>';
    
    // Body
    html += '<tbody>';
    items.forEach(item => {
      html += '<tr>';
      keys.forEach(key => {
        html += `<td>${this.formatCellValue(item[key])}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    
    return html;
  }

  /**
   * Render object as table
   * @param {Object} obj - Object to render
   * @returns {string} HTML table
   */
  renderObjectTable(obj) {
    let html = '<div class="data-table-container"><table class="data-table">';
    html += '<thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>';
    
    Object.entries(obj).forEach(([key, value]) => {
      html += `<tr><td>${this.formatColumnName(key)}</td><td>${this.formatCellValue(value)}</td></tr>`;
    });
    
    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Format column name
   * @param {string} key - Column key
   * @returns {string} Formatted name
   */
  formatColumnName(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format cell value
   * @param {*} value - Cell value
   * @returns {string} Formatted value
   */
  formatCellValue(value) {
    if (value === null || value === undefined) {
      return '<span style="color: #6b7280;">null</span>';
    }
    
    if (typeof value === 'boolean') {
      return value ? '<span class="status-badge status-success">✓</span>' : '<span class="status-badge status-error">✗</span>';
    }
    
    if (typeof value === 'object') {
      return '<span style="color: #94a3b8;">' + JSON.stringify(value) + '</span>';
    }
    
    const str = String(value);
    
    if (str.length > 50) {
      return `<span title="${str.replace(/"/g, '&quot;')}">${str.substring(0, 47)}...</span>`;
    }
    
    return str;
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccessMessage(message) {
    alert(message);
  }
}

// Export for module usage
export { DocumentService };
