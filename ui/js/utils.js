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
  // Render documents as a datatable for compact display inside modal
  let html = '<div class="details-section">';
  html += '<h3 class="section-title"><i class="fas fa-file-alt"></i> Documentos</h3>';
  if (!documents || documents.length === 0) {
    html += '<div class="empty-state__text">Nenhum documento encontrado.</div>';
    html += '</div>';
    return html;
  }

  html += '<div class="data-table-container" style="margin-top: 1rem;">';
  html += '<table class="data-table">';
  html += '<thead><tr><th>#</th><th>ID</th><th>Título</th><th>Autor</th><th>Criado em</th><th>Conteúdo</th></tr></thead>';
  html += '<tbody>';

  documents.forEach((doc, index) => {
    const created = doc.created_at ? formatDate(doc.created_at) : '';
    const content = doc.content ? escapeHtml(doc.content) : '';
    html += `<tr>`;
    html += `<td>${index + 1}</td>`;
    html += `<td><code>${escapeHtml(doc.id || '')}</code></td>`;
    html += `<td>${escapeHtml(doc.title || '')}</td>`;
    html += `<td>${escapeHtml(doc.author || '')}</td>`;
    html += `<td class="col-date">${created}</td>`;
    html += `<td>${content}</td>`;
    html += `</tr>`;
  });

  html += '</tbody></table></div></div>';
  return html;
}

/**
 * Render deadlines section
 * @param {Array} deadlines - Array of deadlines
 * @returns {string} HTML string
 */
function renderDeadlinesSection(deadlines) {
  // Render deadlines as a datatable
  let html = '<div class="details-section">';
  html += '<h3 class="section-title"><i class="fas fa-clock"></i> Prazos</h3>';
  if (!deadlines || deadlines.length === 0) {
    html += '<div class="empty-state__text">Nenhum prazo encontrado.</div>';
    html += '</div>';
    return html;
  }

  html += '<div class="data-table-container" style="margin-top: 1rem;">';
  html += '<table class="data-table">';
  html += '<thead><tr><th>#</th><th>ID do Processo</th><th>Vencimento</th><th>Criado em</th><th>Descrição</th></tr></thead>';
  html += '<tbody>';

  deadlines.forEach((deadline, index) => {
    const due = deadline.due_date ? formatDate(deadline.due_date, false) : '';
    const created = deadline.created_at ? formatDate(deadline.created_at) : '';
    html += `<tr>`;
    html += `<td>${index + 1}</td>`;
    html += `<td>${escapeHtml(deadline.process_id || '')}</td>`;
    html += `<td class="col-date">${due}</td>`;
    html += `<td class="col-date">${created}</td>`;
    html += `<td>${escapeHtml(deadline.description || '')}</td>`;
    html += `</tr>`;
  });

  html += '</tbody></table></div></div>';
  return html;
}

/**
 * Render hearings section
 * @param {Array} hearings - Array of hearings
 * @returns {string} HTML string
 */
function renderHearingsSection(hearings) {
  // Render hearings as a datatable
  let html = '<div class="details-section">';
  html += '<h3 class="section-title"><i class="fas fa-gavel"></i> Audiências</h3>';
  if (!hearings || hearings.length === 0) {
    html += '<div class="empty-state__text">Nenhuma audiência encontrada.</div>';
    html += '</div>';
    return html;
  }

  html += '<div class="data-table-container" style="margin-top: 1rem;">';
  html += '<table class="data-table">';
  html += '<thead><tr><th>#</th><th>ID do Processo</th><th>Data</th><th>Sala</th><th>Criado em</th><th>Descrição</th></tr></thead>';
  html += '<tbody>';

  hearings.forEach((hearing, index) => {
    const date = hearing.date ? formatDate(hearing.date, false) : '';
    const created = hearing.created_at ? formatDate(hearing.created_at) : '';
    html += `<tr>`;
    html += `<td>${index + 1}</td>`;
    html += `<td>${escapeHtml(hearing.process_id || '')}</td>`;
    html += `<td class="col-date">${date}</td>`;
    html += `<td>${escapeHtml(hearing.courtroom || '')}</td>`;
    html += `<td class="col-date">${created}</td>`;
    html += `<td>${escapeHtml(hearing.description || '')}</td>`;
    html += `</tr>`;
  });

  html += '</tbody></table></div></div>';
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

/**
 * Fetch all processes from API
 * @returns {Promise<Array>} List of processes
 */
async function fetchAllProcesses() {
  try {
    const token = localStorage.getItem('jwtToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    // Try to get from processes endpoint first
    try {
      const response = await fetch('/api/processes', { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map(p => ({
            id: p.id || p.number || p.process_id,
            number: p.number || p.id || p.process_id,
            title: p.title || p.name || `Processo ${p.number || p.id}`,
            created_at: p.created_at
          }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch from /api/processes:', e);
    }

    // Fallback: aggregate from documents, deadlines, and hearings
    const [docsRes, deadlinesRes, hearingsRes] = await Promise.all([
      fetch('/api/documents', { headers }),
      fetch('/api/deadlines', { headers }),
      fetch('/api/hearings', { headers })
    ]);

    const processMap = new Map();

    // Collect from documents
    if (docsRes.ok) {
      const docs = await docsRes.json();
      if (Array.isArray(docs)) {
        docs.forEach(doc => {
          if (doc.process_id && !processMap.has(doc.process_id)) {
            processMap.set(doc.process_id, {
              id: doc.process_id,
              number: doc.process_id,
              title: `Processo ${doc.process_id}`,
              created_at: doc.created_at || doc.timestamp
            });
          }
        });
      }
    }

    // Collect from deadlines
    if (deadlinesRes.ok) {
      const deadlines = await deadlinesRes.json();
      if (Array.isArray(deadlines)) {
        deadlines.forEach(deadline => {
          if (deadline.process_id && !processMap.has(deadline.process_id)) {
            processMap.set(deadline.process_id, {
              id: deadline.process_id,
              number: deadline.process_id,
              title: `Processo ${deadline.process_id}`,
              created_at: deadline.created_at
            });
          }
        });
      }
    }

    // Collect from hearings
    if (hearingsRes.ok) {
      const hearingsData = await hearingsRes.json();
      const hearings = hearingsData.items || hearingsData;
      if (Array.isArray(hearings)) {
        hearings.forEach(hearing => {
          if (hearing.process_id && !processMap.has(hearing.process_id)) {
            processMap.set(hearing.process_id, {
              id: hearing.process_id,
              number: hearing.process_id,
              title: `Processo ${hearing.process_id}`,
              created_at: hearing.created_at
            });
          }
        });
      }
    }

    return Array.from(processMap.values()).sort((a, b) => {
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return [];
  }
}

/**
 * Render process select dropdown
 * @param {string} selectId - ID of the select element
 * @param {string} selectedValue - Currently selected value (optional)
 */
async function renderProcessSelect(selectId, selectedValue = null) {
  const selectElement = document.getElementById(selectId);
  if (!selectElement) return;

  // Show loading
  selectElement.innerHTML = '<option value="">Carregando processos...</option>';
  selectElement.disabled = true;

  try {
    const processes = await fetchAllProcesses();
    
    if (processes.length === 0) {
      selectElement.innerHTML = '<option value="">Nenhum processo encontrado</option>';
      return;
    }

    let html = '<option value="">Selecione um processo *</option>';
    processes.forEach(process => {
      const selected = selectedValue === process.number ? 'selected' : '';
      html += `<option value="${escapeHtml(process.number)}" ${selected}>${escapeHtml(process.number)} - ${escapeHtml(process.title)}</option>`;
    });
    
    selectElement.innerHTML = html;
    selectElement.disabled = false;
  } catch (error) {
    console.error('Error rendering process select:', error);
    selectElement.innerHTML = '<option value="">Erro ao carregar processos</option>';
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
    setupModalCloseHandler,
    fetchAllProcesses,
    renderProcessSelect
  };
}

/**
 * Enhance rendered tables with a small pagination / page-size selector.
 * This will add a control above any element with class `data-table-container`
 * so the user can choose to show 5 / 10 / all rows and navigate pages.
 */
function enhanceDataTable(container) {
  if (!container || container.dataset.dtEnhanced === '1') return;
  const table = container.querySelector('table.data-table');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (rows.length === 0) return;

  // Create top controls (selector on top-right)
  const topControls = document.createElement('div');
  topControls.className = 'dt-controls dt-controls-top';
  topControls.style.display = 'flex';
  topControls.style.justifyContent = 'flex-end';
  topControls.style.alignItems = 'center';
  topControls.style.margin = '0 0 0.5rem 0';

  const label = document.createElement('label');
  label.textContent = 'Mostrar:';
  label.style.color = '#cbd5e1';
  label.style.fontWeight = '600';
  label.style.marginRight = '0.5rem';

  const select = document.createElement('select');
  select.innerHTML = '<option value="5">5</option><option value="10">10</option><option value="0">Todos</option>';
  select.style.padding = '6px 8px';
  select.style.borderRadius = '6px';
  select.style.background = 'rgba(15, 23, 42, 0.8)';
  select.style.color = '#e2e8f0';
  select.style.border = '1px solid rgba(51,65,85,0.4)';

  topControls.appendChild(label);
  topControls.appendChild(select);
  
  // Always place the controls just above the table, inside the container
  container.insertBefore(topControls, table);

  // Create bottom controls (pagination) - align right for all tables
  const bottomControls = document.createElement('div');
  bottomControls.className = 'dt-controls dt-controls-bottom';
  bottomControls.style.display = 'flex';
  bottomControls.style.justifyContent = 'flex-end';
  bottomControls.style.alignItems = 'center';
  bottomControls.style.margin = '0.5rem 0 0 0';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn--secondary btn--small';
  prevBtn.textContent = '«';
  prevBtn.disabled = true;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn--secondary btn--small';
  nextBtn.textContent = '»';

  const pageInfo = document.createElement('span');
  pageInfo.style.color = '#94a3b8';
  pageInfo.style.fontSize = '0.95rem';
  pageInfo.style.margin = '0 0.5rem';
  pageInfo.textContent = '';

  bottomControls.appendChild(prevBtn);
  bottomControls.appendChild(pageInfo);
  bottomControls.appendChild(nextBtn);

  // append bottomControls after the table
  table.insertAdjacentElement('afterend', bottomControls);

  // Pagination state
  let state = { page: 1, pageSize: 10 };

  function renderPage() {
    const ps = state.pageSize;
    if (ps === 0) {
      rows.forEach(r => r.style.display = 'table-row');
      pageInfo.textContent = `1 / 1 (${rows.length} linhas)`;
      prevBtn.disabled = true; nextBtn.disabled = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(rows.length / ps));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * ps;
    const end = start + ps;

    rows.forEach((r, i) => {
      r.style.display = (i >= start && i < end) ? 'table-row' : 'none';
    });

    pageInfo.textContent = `${state.page} / ${totalPages} (${rows.length} linhas)`;
    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= totalPages;
  }

  select.addEventListener('change', () => {
    const v = parseInt(select.value, 10);
    state.pageSize = isNaN(v) ? 10 : v;
    state.page = 1;
    renderPage();
  });

  prevBtn.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); renderPage(); });
  nextBtn.addEventListener('click', () => { state.page = state.page + 1; renderPage(); });

  // Initialize default
  select.value = rows.length <= 5 ? '5' : (rows.length <= 10 ? '10' : '10');
  state.pageSize = parseInt(select.value, 10) || 10;
  renderPage();

  // mark as enhanced
  container.dataset.dtEnhanced = '1';
}

function setupDataTableEnhancer() {
  // Initial pass
  document.querySelectorAll('.data-table-container').forEach(enhanceDataTable);

  // Observe future inserts (pages render tables dynamically)
  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches && node.matches('.data-table-container')) {
          enhanceDataTable(node);
        } else {
          node.querySelectorAll && node.querySelectorAll('.data-table-container').forEach(enhanceDataTable);
        }
      }
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
}

// Auto start when DOM ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    try { setupDataTableEnhancer(); } catch (e) { console.warn('DataTable enhancer failed:', e); }
  });
}
