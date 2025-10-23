/**
 * Utility Functions
 * Shared helper functions used across the application
 */

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Format date string to readable format
 * @param {string} dateString - ISO date string
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date
 */
function formatDate(dateString, includeTime = true) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // If includeTime is false or time is midnight, just show date
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    if (!includeTime || (hours === 0 && minutes === 0)) {
      return `${day}/${month}/${year}`;
    }
    
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hoursStr}:${minutesStr}`;
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString;
  }
}

/**
 * Parse process summary data structure
 * Handles different response formats from the API
 * @param {Object} data - Raw data from API
 * @returns {Object} Normalized data structure
 */
function parseProcessSummary(data) {
  // Extract summary if nested
  const summary = data.summary || data;
  
  // Parse documents
  const documents = Array.isArray(summary.documents) ? summary.documents : [];
  
  // Parse deadlines
  const deadlines = Array.isArray(summary.deadlines) ? summary.deadlines : [];
  
  // Parse hearings (handle nested structure)
  let hearings = [];
  if (summary.hearings) {
    if (Array.isArray(summary.hearings)) {
      hearings = summary.hearings;
    } else if (summary.hearings.items && Array.isArray(summary.hearings.items)) {
      hearings = summary.hearings.items;
    }
  }
  
  return { documents, deadlines, hearings };
}

/**
 * Render process summary as HTML cards
 * @param {string} processId - Process ID
 * @param {Object} data - Process data
 * @returns {string} HTML string
 */
function renderProcessSummary(processId, data) {
  const { documents, deadlines, hearings } = parseProcessSummary(data);
  
  let html = '<div style="display: grid; gap: 2rem;">';
  
  // Documents Section
  if (documents.length > 0) {
    html += renderDocumentsSection(documents);
  }
  
  // Deadlines Section
  if (deadlines.length > 0) {
    html += renderDeadlinesSection(deadlines);
  }
  
  // Hearings Section
  if (hearings.length > 0) {
    html += renderHearingsSection(hearings);
  }
  
  // Empty state
  if (documents.length === 0 && deadlines.length === 0 && hearings.length === 0) {
    html += renderEmptyState();
  }
  
  html += '</div>';
  return html;
}

/**
 * Render documents section
 * @param {Array} documents - Array of documents
 * @returns {string} HTML string
 */
function renderDocumentsSection(documents) {
  let html = '<div class="details-section">';
  html += '<h3 class="section-title"><i class="fas fa-file-alt"></i> Documentos</h3>';
  html += '<div class="details-grid">';
  
  documents.forEach((doc, index) => {
    html += `
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-number">#${index + 1}</span>
          <span class="detail-card-id">${escapeHtml(doc.id || 'N/A')}</span>
        </div>
        <div class="detail-card-body">
          <div class="detail-row">
            <span class="detail-label">Título:</span>
            <span class="detail-value">${escapeHtml(doc.title || 'N/A')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Autor:</span>
            <span class="detail-value">${escapeHtml(doc.author || 'N/A')}</span>
          </div>
          ${doc.created_at ? `
          <div class="detail-row">
            <span class="detail-label">Criado em:</span>
            <span class="detail-value col-date">${formatDate(doc.created_at)}</span>
          </div>` : ''}
          ${doc.content ? `
          <div class="detail-row detail-row-full">
            <span class="detail-label">Conteúdo:</span>
            <span class="detail-value detail-content">${escapeHtml(doc.content)}</span>
          </div>` : ''}
        </div>
      </div>`;
  });
  
  html += '</div></div>';
  return html;
}

/**
 * Render deadlines section
 * @param {Array} deadlines - Array of deadlines
 * @returns {string} HTML string
 */
function renderDeadlinesSection(deadlines) {
  let html = '<div class="details-section">';
  html += '<h3 class="section-title"><i class="fas fa-clock"></i> Prazos</h3>';
  html += '<div class="details-grid">';
  
  deadlines.forEach((deadline, index) => {
    html += `
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-number">#${index + 1}</span>
          <span class="detail-card-id">${escapeHtml(deadline.id || 'N/A')}</span>
        </div>
        <div class="detail-card-body">
          <div class="detail-row">
            <span class="detail-label">ID do Processo:</span>
            <span class="detail-value">${escapeHtml(deadline.process_id || 'N/A')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Vencimento:</span>
            <span class="detail-value col-date">${formatDate(deadline.due_date, false)}</span>
          </div>
          ${deadline.created_at ? `
          <div class="detail-row">
            <span class="detail-label">Criado em:</span>
            <span class="detail-value col-date">${formatDate(deadline.created_at)}</span>
          </div>` : ''}
          ${deadline.description ? `
          <div class="detail-row detail-row-full">
            <span class="detail-label">Descrição:</span>
            <span class="detail-value">${escapeHtml(deadline.description)}</span>
          </div>` : ''}
        </div>
      </div>`;
  });
  
  html += '</div></div>';
  return html;
}

/**
 * Render hearings section
 * @param {Array} hearings - Array of hearings
 * @returns {string} HTML string
 */
function renderHearingsSection(hearings) {
  let html = '<div class="details-section">';
  html += '<h3 class="section-title"><i class="fas fa-gavel"></i> Audiências</h3>';
  html += '<div class="details-grid">';
  
  hearings.forEach((hearing, index) => {
    html += `
      <div class="detail-card">
        <div class="detail-card-header">
          <span class="detail-card-number">#${index + 1}</span>
          <span class="detail-card-id">${escapeHtml(hearing.id || 'N/A')}</span>
        </div>
        <div class="detail-card-body">
          <div class="detail-row">
            <span class="detail-label">ID do Processo:</span>
            <span class="detail-value">${escapeHtml(hearing.process_id || 'N/A')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Data:</span>
            <span class="detail-value col-date">${formatDate(hearing.date, false)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Sala:</span>
            <span class="detail-value">${escapeHtml(hearing.courtroom || 'N/A')}</span>
          </div>
          ${hearing.created_at ? `
          <div class="detail-row">
            <span class="detail-label">Criado em:</span>
            <span class="detail-value col-date">${formatDate(hearing.created_at)}</span>
          </div>` : ''}
          ${hearing.description ? `
          <div class="detail-row detail-row-full">
            <span class="detail-label">Descrição:</span>
            <span class="detail-value">${escapeHtml(hearing.description)}</span>
          </div>` : ''}
        </div>
      </div>`;
  });
  
  html += '</div></div>';
  return html;
}

/**
 * Render empty state
 * @returns {string} HTML string
 */
function renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon"><i class="fas fa-inbox"></i></div>
      <div class="empty-state__title">Nenhum dado encontrado</div>
      <div class="empty-state__text">
        Este processo não possui documentos, prazos ou audiências associados.
      </div>
    </div>`;
}

/**
 * Validate process ID
 * @param {string} processId - Process ID to validate
 * @returns {Object} Validation result {valid: boolean, error: string}
 */
function validateProcessId(processId) {
  if (!processId || processId.trim() === '') {
    return { valid: false, error: 'Por favor, informe o ID do processo.' };
  }
  
  const trimmed = processId.trim();
  
  if (trimmed.length < 1) {
    return { valid: false, error: 'ID do processo inválido.' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'ID do processo muito longo.' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Show loading state in modal
 * @param {HTMLElement} container - Container element
 */
function showLoadingState(container) {
  if (container) {
    container.innerHTML = `
      <div class="status-loading" style="text-align: center; padding: 3rem;">
        <div><i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: #60a5fa;"></i></div>
        <div style="margin-top: 1rem; color: #94a3b8;">Carregando...</div>
      </div>`;
  }
}

/**
 * Setup modal close handlers
 * @param {string} modalId - Modal element ID
 * @param {Function} closeFunction - Function to call when closing
 */
function setupModalCloseHandler(modalId, closeFunction) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // Remove existing listeners to avoid duplicates
    modal.replaceWith(modal.cloneNode(true));
    
    // Re-get the modal after cloning
    const newModal = document.getElementById(modalId);
    if (newModal) {
      newModal.addEventListener('click', function(e) {
        if (e.target === this) {
          closeFunction();
        }
      });
    }
  }
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
  window.Utils = {
    escapeHtml,
    formatDate,
    parseProcessSummary,
    renderProcessSummary,
    validateProcessId,
    showLoadingState,
    setupModalCloseHandler
  };
}
