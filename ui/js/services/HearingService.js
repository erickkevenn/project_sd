/**
 * Hearing Service
 * Handles hearing-related operations
 */
class HearingService {
  constructor(app) {
    this.app = app;
    this.api = app.getService('api');
  }

  /**
   * List all hearings - redirects to dedicated page
   */
  async list() {
    // Redirect to dedicated hearing page
    window.location.href = '/ui/components/hearing.html';
  }

  /**
   * List today's hearings - redirects to dedicated page with today filter
   */
  async listToday() {
    // Redirect to dedicated hearing page with today filter
    window.location.href = '/ui/components/hearing.html?filter=today';
  }

  /**
   * Show create hearing modal - redirects to dedicated page with create modal
   */
  showCreateModal() {
    // Redirect to dedicated hearing page with create modal open
    window.location.href = '/ui/components/hearing.html?action=create';
  }

  /**
   * Create new hearing
   */
  async create() {
    const processId = document.getElementById('hearingProcessIdInput')?.value?.trim();
    const date = document.getElementById('hearingDateInput')?.value;
    const courtroom = document.getElementById('hearingCourtroomInput')?.value?.trim();
    const description = document.getElementById('hearingDescInput')?.value?.trim();

    if (!processId || !date || !courtroom || !description) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    const hearingData = {
      process_id: processId,
      date,
      courtroom,
      description
    };

    try {
      this.closeCreateModal();
      const response = await this.api.post('/api/hearings', hearingData);
      
      if (response.ok) {
        this.showSuccessMessage('Audiência agendada com sucesso!');
      } else {
        this.api.handleError(response, 'Agendar audiência');
      }
    } catch (error) {
      this.app.handleError(error);
    }
  }

  /**
   * Close create modal
   */
  closeCreateModal() {
    const modal = document.getElementById('createHearingModal');
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
export { HearingService };
