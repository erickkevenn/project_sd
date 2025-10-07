// === FUNÇÃO PRINCIPAL DE REQUISIÇÕES ===

async function hit(path, method="GET", body=null) {
  console.log(`[DEBUG] Fazendo requisição: ${method} ${path}`);
  
  try {
    const init = { method, headers: {} };
    if (body) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    if (jwtToken) {
      init.headers['Authorization'] = 'Bearer ' + jwtToken;
    }
    const t0 = performance.now();
    const res = await fetch(path, init);
    const text = await res.text();
    const ms = Math.round(performance.now() - t0);
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    
    console.log(`[DEBUG] Resposta recebida: Status ${res.status}, Dados:`, parsed);
    
    // Para operações que devem mostrar em modal, redireciona
    if (method === 'POST' && res.ok) {
      showSuccessMessage(path, parsed);
    } else {
      console.log('Operação concluída:', { method, path, status: res.status, time: ms });
    }
    
  } catch (e) {
    console.error('Erro na requisição:', e.message);
    alert('Erro na operação: ' + e.message);
  }
}

function showSuccessMessage(path, data) {
  let message = 'Operação realizada com sucesso!';
  
  if (path.includes('/documents')) {
    message = '✅ Documento criado com sucesso!';
  } else if (path.includes('/deadlines')) {
    message = '✅ Prazo criado com sucesso!';
  } else if (path.includes('/hearings')) {
    message = '✅ Audiência agendada com sucesso!';
  } else if (path.includes('/orchestrate')) {
    message = '✅ Caso orquestrado com sucesso!';
  }
  
  alert(message);
}

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

// === GERAÇÃO DE MENSAGENS AMIGÁVEIS ===

function generateFriendlyMessage(method, path, status, data) {
  // Buscar documento por ID
  if (method === 'GET' && path.match(/\/api\/documents\/[^/]+$/) && status === 404) {
    const docId = path.split('/').pop();
    return `❌ DOCUMENTO NÃO ENCONTRADO\n\nO documento com ID "${docId}" não existe.\n💡 Dica: Use "Listar Documentos" para ver os IDs disponíveis.`;
  }
  
  // Buscar processo
  if (method === 'GET' && path.match(/\/api\/process\/[^/]+\/summary$/) && status === 404) {
    const processId = path.split('/')[3];
    return `❌ PROCESSO NÃO ENCONTRADO\n\nO processo "${processId}" não foi encontrado.\n💡 Dica: Use "Listar Processos" para ver os processos disponíveis.`;
  }
  
  // Lista vazia de documentos
  if (method === 'GET' && path === '/api/documents' && status === 200 && Array.isArray(data) && data.length === 0) {
    return `📋 LISTA VAZIA\n\nNenhum documento foi encontrado no sistema.\n💡 Dica: Use "Criar Documento" para adicionar o primeiro documento.`;
  }
  
  // Sucesso na criação
  if ((method === 'POST') && status === 201) {
    if (path.includes('/documents')) {
      return `✅ DOCUMENTO CRIADO\n\nNovo documento adicionado ao sistema com sucesso.`;
    } else if (path.includes('/deadlines')) {
      return `✅ PRAZO CRIADO\n\nNovo prazo adicionado ao sistema com sucesso.`;
    } else if (path.includes('/hearings')) {
      return `✅ AUDIÊNCIA AGENDADA\n\nNova audiência agendada com sucesso.`;
    }
  }
  
  // Erro de permissão
  if (status === 401) {
    return `🔐 ACESSO NEGADO\n\nVocê precisa fazer login para acessar esta funcionalidade.`;
  }
  
  if (status === 403) {
    return `🚫 PERMISSÃO INSUFICIENTE\n\nVocê não tem permissão para realizar esta ação.`;
  }
  
  return null; // Usa mensagem padrão
}
