/**
 * UI Display Module
 * Handles data visualization and UI rendering
 */

// === FUNÇÕES DE VISUALIZAÇÃO DE DADOS ===

function displayResponse() {
  const box = document.getElementById('out');
  const tableView = document.getElementById('tableView');
  const toggleButton = document.getElementById('toggleView');
  
  if (!lastResponseData || !lastResponseMeta) {
    return;
  }
  
  // Determina se pode mostrar em tabela
  const canShowTable = canDisplayAsTable(lastResponseData);
  
  if (canShowTable) {
    toggleButton.style.display = 'inline-block';
    toggleButton.textContent = currentViewMode === 'json' ? '📋 Tabela' : '📄 JSON';
  } else {
    toggleButton.style.display = 'none';
    currentViewMode = 'json';
  }
  
  if (currentViewMode === 'table' && canShowTable) {
    box.style.display = 'none';
    tableView.style.display = 'block';
    renderTable();
  } else {
    box.style.display = 'block';
    tableView.style.display = 'none';
    renderJSON();
  }
}

function renderJSON() {
  const box = document.getElementById('out');
  const { method, path, status, time, friendlyMessage } = lastResponseMeta;
  
  if (friendlyMessage) {
    box.textContent = friendlyMessage + "\n\n" + method + " " + path + " → " + status + " (" + time + "ms)\n\n" + JSON.stringify(lastResponseData, null, 2);
  } else {
    box.textContent = method + " " + path + " → " + status + " (" + time + "ms)\n\n" + JSON.stringify(lastResponseData, null, 2);
  }
}

function renderTable() {
  const tableView = document.getElementById('tableView');
  const data = lastResponseData;
  
  if (Array.isArray(data) && data.length > 0) {
    tableView.innerHTML = renderArrayTable(data);
  } else if (data && data.items && Array.isArray(data.items)) {
    if (data.items.length > 0) {
      tableView.innerHTML = renderArrayTable(data.items);
    } else {
      tableView.innerHTML = '<div class="empty-state">📋 Nenhum item encontrado</div>';
    }
  } else if (typeof data === 'object' && data !== null) {
    tableView.innerHTML = renderObjectTable(data);
  }
}

function renderArrayTable(items) {
  if (!items || items.length === 0) {
    return '<div class="empty-state">📋 Nenhum item encontrado</div>';
  }
  
  // Extrai todas as chaves únicas
  const allKeys = new Set();
  items.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });
  
  const keys = Array.from(allKeys);
  
  let html = '<div class="data-table-container"><table class="data-table">';
  
  // Cabeçalho
  html += '<thead><tr>';
  keys.forEach(key => {
    const className = getColumnClass(key);
    html += `<th class="${className}">${formatColumnName(key)}</th>`;
  });
  html += '</tr></thead>';
  
  // Corpo da tabela
  html += '<tbody>';
  items.forEach(item => {
    html += '<tr>';
    keys.forEach(key => {
      const className = getColumnClass(key);
      const value = item[key];
      html += `<td class="${className}">${formatCellValue(key, value)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  
  return html;
}

function renderObjectTable(obj) {
  let html = '<div class="data-table-container"><table class="data-table">';
  html += '<thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>';
  
  Object.entries(obj).forEach(([key, value]) => {
    html += `<tr><td class="col-id">${formatColumnName(key)}</td><td>${formatCellValue(key, value)}</td></tr>`;
  });
  
  html += '</tbody></table></div>';
  return html;
}

function canDisplayAsTable(data) {
  if (Array.isArray(data) && data.length > 0) {
    return data.every(item => typeof item === 'object' && item !== null);
  }
  if (data && data.items && Array.isArray(data.items)) {
    return true; // Mesmo se vazio, pode mostrar tabela
  }
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return true;
  }
  return false;
}

function getColumnClass(key) {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('id')) return 'col-id';
  if (lowerKey.includes('date') || lowerKey.includes('created') || lowerKey.includes('updated')) return 'col-date';
  if (lowerKey.includes('status')) return 'col-status';
  if (lowerKey.includes('content') || lowerKey.includes('description')) return 'col-content';
  return '';
}

function formatColumnName(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatCellValue(key, value) {
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
  
  // Formatar datas
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('created') || key.toLowerCase().includes('updated')) {
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
      return `<span class="col-date">${str}</span>`;
    }
  }
  
  // Truncar texto longo
  if (str.length > 50) {
    return `<span title="${str.replace(/"/g, '&quot;')}">${str.substring(0, 47)}...</span>`;
  }
  
  return str;
}

function toggleResponseView() {
  currentViewMode = currentViewMode === 'json' ? 'table' : 'json';
  displayResponse();
}

// Export functions for global access
window.displayResponse = displayResponse;
window.renderJSON = renderJSON;
window.renderTable = renderTable;
window.renderArrayTable = renderArrayTable;
window.renderObjectTable = renderObjectTable;
window.canDisplayAsTable = canDisplayAsTable;
window.getColumnClass = getColumnClass;
window.formatColumnName = formatColumnName;
window.formatCellValue = formatCellValue;
window.toggleResponseView = toggleResponseView;
