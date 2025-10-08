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

      if (processArray.length === 0) {
        this.showDataModal('Processos', []);
      } else {
        const processData = processArray.map(id => ({ id, name: `Processo ${id}` }));
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
    const processId = document.getElementById('processIdInput')?.value?.trim();
    
    this.closeSearchModal();
    
    if (!processId) {
      alert('Por favor, informe o ID do processo.');
      return;
    }

    try {
      const response = await this.api.get(`/api/process/${processId}/summary`);
      
      if (response.ok) {
        this.showDataModal(`Resumo do Processo ${processId}`, response.data);
      } else {
        this.api.handleError(response, 'Buscar processo');
      }
    } catch (error) {
      this.app.handleError(error);
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
