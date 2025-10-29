/**
 * Process Service
 * Handles process-related operations
 */
class ProcessService {
  constructor(app) {
    this.app = app;
    this.api = app.getService('api');
  }

  /**
   * List all processes
   */
  async list() {
    try {
      // Get data from all services to find unique process IDs
      const [docsRes, deadlinesRes, hearingsRes] = await Promise.all([
        this.api.get('/api/documents'),
        this.api.get('/api/deadlines'),
        this.api.get('/api/hearings')
      ]);

      const processIds = new Set();
      // map of process id -> title (when available from /api/processes)
      const processTitleMap = {};

      // Collect process IDs from documents
      if (docsRes.ok && Array.isArray(docsRes.data)) {
        docsRes.data.forEach(doc => {
          if (doc.process_id) processIds.add(doc.process_id);
        });
      }

      // Collect process IDs from deadlines
      if (deadlinesRes.ok && Array.isArray(deadlinesRes.data)) {
        deadlinesRes.data.forEach(deadline => {
          if (deadline.process_id) processIds.add(deadline.process_id);
        });
      }

      // Collect process IDs from hearings
      if (hearingsRes.ok) {
        const hearings = hearingsRes.data.items || hearingsRes.data;
        if (Array.isArray(hearings)) {
          hearings.forEach(hearing => {
            if (hearing.process_id) processIds.add(hearing.process_id);
          });
        }
      }

      const processArray = Array.from(processIds);

      // Also try to fetch explicit processes from the API and merge titles/ids
      try {
        const processesRes = await this.api.get('/api/processes');
        if (processesRes.ok && Array.isArray(processesRes.data)) {
          processesRes.data.forEach(p => {
            const id = p.number || p.id || p.process_id;
            if (id) {
              processIds.add(id);
              processTitleMap[id] = p.title || p.name || `Processo ${id}`;
            }
          });
        }
      } catch (e) {
        // Non-fatal: keep previously collected ids
        /* ignore */
      }

      const mergedArray = Array.from(processIds);

      if (mergedArray.length === 0) {
        this.showDataModal('Processos', []);
      } else {
        const processData = mergedArray.map(id => ({ id, name: processTitleMap[id] || `Processo ${id}` }));
        this.showDataModal('Processos', processData);
      }
    } catch (error) {
      this.app.handleError(error);
    }
  }

  /**
   * Show search process modal
   */
  showSearchModal() {
    const modal = document.getElementById('processModal');
    if (!modal) return;

    modal.style.display = 'flex';
    const input = document.getElementById('processIdInput');
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
   * Search process by ID
   */
  async search() {
    const processIdInput = document.getElementById('processIdInput');
    const processId = processIdInput?.value?.trim();
    
    // Validate process ID
    const validation = window.Utils ? 
      window.Utils.validateProcessId(processId) : 
      { valid: !!processId, value: processId, error: 'Por favor, informe o ID do processo.' };
    
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    this.closeSearchModal();
    
    // Show loading state
    this.showLoadingState();

    try {
      const response = await this.api.get(`/api/process/${validation.value}/summary`);
      
      if (response.ok) {
        this.showProcessSummaryModal(validation.value, response.data);
      } else {
        this.hideLoadingState();
        this.api.handleError(response, 'Buscar processo');
      }
    } catch (error) {
      this.hideLoadingState();
      this.app.handleError(error);
    }
  }

  /**
   * Show loading state in data modal
   */
  showLoadingState() {
    const modal = document.getElementById('dataModal');
    const titleElement = document.getElementById('dataModalTitle');
    const container = document.getElementById('dataTableContainer');
    
    if (!modal || !titleElement || !container) return;
    
    titleElement.textContent = 'Carregando...';
    
    if (window.Utils && window.Utils.showLoadingState) {
      window.Utils.showLoadingState(container);
    } else {
      container.innerHTML = '<div style="text-align: center; padding: 3rem;">Carregando...</div>';
    }
    
    modal.style.display = 'flex';
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    const modal = document.getElementById('dataModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Orchestrate case (create complete case)
   */
  async orchestrate() {
    const today = new Date();
    const deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + 30);
    const hearingDate = new Date(today);
    hearingDate.setDate(today.getDate() + 15);

    const orchestrationData = {
      document: {
        title: 'Petição Inicial via Orquestração',
        content: 'Documento criado através da funcionalidade de orquestração automática.',
        author: 'Sistema'
      },
      deadline: {
        process_id: 'ORCH-01',
        due_date: deadlineDate.toISOString().split('T')[0],
        description: 'Prazo para resposta - criado via orquestração'
      },
      hearing: {
        process_id: 'ORCH-01',
        date: hearingDate.toISOString().split('T')[0],
        courtroom: 'Sala 3',
        description: 'Audiência inicial - criada via orquestração'
      }
    };

    try {
      const response = await this.api.post('/api/orchestrate/file-case', orchestrationData);
      
      if (response.ok) {
        this.showSuccessMessage('Caso orquestrado com sucesso!');
      } else {
        this.api.handleError(response, 'Orquestrar caso');
      }
    } catch (error) {
      this.app.handleError(error);
    }
  }

  /**
   * Close search modal
   */
  closeSearchModal() {
    const modal = document.getElementById('processModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Show process summary in a nicely formatted modal
   * @param {string} processId - Process ID
   * @param {Object} data - Process data
   */
  showProcessSummaryModal(processId, data) {
    const modal = document.getElementById('dataModal');
    const titleElement = document.getElementById('dataModalTitle');
    const container = document.getElementById('dataTableContainer');
    const status = document.getElementById('dataStatus');
    
    if (!modal || !titleElement || !container) {
      console.error('Required modal elements not found');
      return;
    }

    // Use utility function for escaping if available
    const escapeHtml = window.Utils?.escapeHtml || ((text) => String(text).replace(/[&<>"']/g, ''));
    
    titleElement.innerHTML = `<i class="fas fa-folder-open"></i> Resumo do Processo ${escapeHtml(processId)}`;
    
    // Clear loading status
    if (status) {
      status.textContent = '';
      status.style.display = 'none';
    }

    // Use utility function to render if available
    if (window.Utils && window.Utils.renderProcessSummary) {
      container.innerHTML = window.Utils.renderProcessSummary(processId, data);
    } else {
      // Fallback to simple display
      container.innerHTML = this.renderProcessSummaryFallback(data);
    }
    
    modal.style.display = 'flex';
  }

  /**
   * Fallback method to render process summary
   * Used when utility functions are not available
   * @param {Object} data - Process data
   * @returns {string} HTML string
   */
  renderProcessSummaryFallback(data) {
    const summary = data.summary || data;
    return `
      <div class="data-table-container">
        <table class="data-table">
          <thead><tr><th>Campo</th><th>Valor</th></tr></thead>
          <tbody>
            <tr><td>Documentos</td><td>${(summary.documents || []).length}</td></tr>
            <tr><td>Prazos</td><td>${(summary.deadlines || []).length}</td></tr>
            <tr><td>Audiências</td><td>${(summary.hearings?.items || summary.hearings || []).length}</td></tr>
          </tbody>
        </table>
        <p style="margin-top: 1rem; color: #94a3b8; text-align: center;">
          Para visualização detalhada, carregue os arquivos de utilitários.
        </p>
      </div>`;
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
      return '<div class="empty-state">Nenhum processo encontrado</div>';
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
        html += `<td>${this.formatCellValue(key, item[key])}</td>`;
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
      html += `<tr><td>${this.formatColumnName(key)}</td><td>${this.formatCellValue(key, value)}</td></tr>`;
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
   * @param {string} key - Column key
   * @param {*} value - Cell value
   * @returns {string} Formatted value
   */
  formatCellValue(key, value) {
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
    
    // Format dates
    if (key.toLowerCase().includes('date') && str.match(/^\d{4}-\d{2}-\d{2}/)) {
      return `<span class="col-date">${str}</span>`;
    }
    
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
export { ProcessService };
