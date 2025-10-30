// === FUNÇÕES DE DATATABLE MODAL ===

// Variáveis para controle de exclusão
let currentDeleteItem = null;
let currentDeleteType = null;

// Função para abrir o modal de dados
function openDataModal(title, data, type = null) {
  const modal = document.getElementById('dataModal');
  const titleElement = document.getElementById('dataModalTitle');
  const container = document.getElementById('dataTableContainer');
  const status = document.getElementById('dataStatus');
  
  titleElement.textContent = title;
  modal.style.display = 'flex';
  
  // Clear loading status
  status.textContent = '';
  status.style.display = 'none';
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    container.innerHTML = createEmptyState(title);
    return;
  }
  
  if (Array.isArray(data)) {
    container.innerHTML = createDataTable(data, type);
  } else if (data.items && Array.isArray(data.items)) {
    if (data.items.length === 0) {
      container.innerHTML = createEmptyState(title);
    } else {
      container.innerHTML = createDataTable(data.items, type);
    }
  } else {
    container.innerHTML = createSingleObjectTable(data);
  }
}

// Função para fechar o modal
function closeDataModal() {
  const modal = document.getElementById('dataModal');
  modal.style.display = 'none';
}

// Criar tabela de dados
function createDataTable(items, type = null) {
  if (!items || items.length === 0) {
    return createEmptyState('Dados');
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
  
  // Adiciona coluna de ações apenas se o tipo permite exclusão E usuário tem permissão
  if (type && ['documents', 'deadlines', 'hearings'].includes(type)) {
    const userPermissions = window.App?.state?.user?.permissions || [];
    const canDelete = userPermissions.includes('delete');
    
    if (canDelete) {
      html += '<th class="col-actions">Ações</th>';
    }
  }
  
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
    
    // Adiciona botão de exclusão apenas se o tipo permite E o usuário tem permissão de delete
    if (type && ['documents', 'deadlines', 'hearings'].includes(type)) {
      const itemId = item.id || item._id || item.document_id || item.deadline_id || item.hearing_id;
      
      // Verifica se o usuário tem permissão de delete (apenas admin)
      const userPermissions = window.App?.state?.user?.permissions || [];
      const canDelete = userPermissions.includes('delete');
      
      if (canDelete) {
        html += `<td class="col-actions">
          <button class="btn-delete" onclick="confirmDelete('${itemId}', '${type}', '${getItemDescription(item, type)}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </td>`;
      } else {
        // Mostra célula vazia para manter alinhamento
        html += `<td class="col-actions"></td>`;
      }
    }
    
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  
  return html;
}

// Função para obter descrição do item para confirmação
function getItemDescription(item, type) {
  switch (type) {
    case 'documents':
      return item.title || item.name || 'documento';
    case 'deadlines':
      return item.description || 'prazo';
    case 'hearings':
      return item.description || 'audiência';
    default:
      return 'item';
  }
}

// Função para confirmar exclusão
function confirmDelete(itemId, type, description) {
  currentDeleteItem = itemId;
  currentDeleteType = type;
  
  const modal = document.getElementById('confirmDeleteModal');
  const title = document.getElementById('confirmDeleteTitle');
  const message = document.getElementById('confirmDeleteMessage');
  
  const typeNames = {
    'documents': 'documento',
    'deadlines': 'prazo',
    'hearings': 'audiência'
  };
  
  const typeName = typeNames[type] || 'item';
  
  title.textContent = `Deseja excluir este ${typeName}?`;
  message.textContent = `${description} será excluído permanentemente. Esta ação não pode ser desfeita.`;
  
  modal.style.display = 'flex';
}

// Função para fechar modal de confirmação
function closeConfirmDeleteModal() {
  const modal = document.getElementById('confirmDeleteModal');
  modal.style.display = 'none';
  currentDeleteItem = null;
  currentDeleteType = null;
}

// Função para executar exclusão
async function executeConfirmDelete() {
  if (!currentDeleteItem || !currentDeleteType) {
    closeConfirmDeleteModal();
    return;
  }
  
  const endpoints = {
    'documents': `/api/documents/${currentDeleteItem}`,
    'deadlines': `/api/deadlines/${currentDeleteItem}`,
    'hearings': `/api/hearings/${currentDeleteItem}`
  };
  
  const endpoint = endpoints[currentDeleteType];
  if (!endpoint) {
    closeConfirmDeleteModal();
    return;
  }
  
  try {
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: jwtToken ? { 'Authorization': 'Bearer ' + jwtToken } : {}
    });
    
    if (res.ok) {
      // Fecha modal de confirmação
      closeConfirmDeleteModal();
      
      // Recarrega a lista atual
      switch (currentDeleteType) {
        case 'documents':
          listDocuments();
          break;
        case 'deadlines':
          listDeadlines();
          break;
        case 'hearings':
          listHearings();
          break;
      }
      
      // Mostra mensagem de sucesso
      const typeNames = {
        'documents': 'Documento',
        'deadlines': 'Prazo',
        'hearings': 'Audiência'
      };
      alert(`✅ ${typeNames[currentDeleteType]} excluído com sucesso!`);
      
    } else {
      alert('❌ Erro ao excluir. Verifique suas permissões.');
    }
    
  } catch (e) {
    alert('❌ Erro na conexão: ' + e.message);
  }
}

// Criar tabela para objeto único
function createSingleObjectTable(obj) {
  let html = '<div class="data-table-container"><table class="data-table">';
  html += '<thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>';
  
  Object.entries(obj).forEach(([key, value]) => {
    html += `<tr><td class="col-id">${formatColumnName(key)}</td><td>${formatCellValue(key, value)}</td></tr>`;
  });
  
  html += '</tbody></table></div>';
  return html;
}

// Criar estado vazio
function createEmptyState(title) {
  const icons = {
    'Documentos': 'fas fa-file-alt',
    'Prazos': 'fas fa-clock',
    'Audiências': 'fas fa-gavel',
    'Processos': 'fas fa-folder-open'
  };
  
  const icon = icons[title] || 'fas fa-inbox';
  
  return `
    <div class="empty-data-state">
      <i class="${icon}"></i>
      <h3>Nenhum item encontrado</h3>
      <p>Não há ${title.toLowerCase()} cadastrados no sistema.</p>
    </div>
  `;
}

// Funções utilitárias (reutilizadas do system.js)
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
  
  // Truncar texto muito longo
  if (str.length > 100) {
    return `<span title="${str.replace(/"/g, '&quot;')}">${str.substring(0, 97)}...</span>`;
  }
  
  return str;
}

// === FUNÇÕES DE LISTAGEM COM MODAL ===

// Listar Documentos
async function listDocuments() {
  const status = document.getElementById('dataStatus');
  
  try {
    // Abre o modal com loading
    openDataModal('Documentos', null);
    status.style.display = 'block';
    status.textContent = 'Carregando documentos...';
    
    const res = await fetch('/api/documents', {
      headers: jwtToken ? { 'Authorization': 'Bearer ' + jwtToken } : {}
    });
    
    if (!res.ok) {
      status.textContent = 'Erro ao carregar documentos';
      return;
    }
    
    const data = await res.json();
    openDataModal('Documentos', data, 'documents');
    
  } catch (e) {
    status.textContent = 'Erro: ' + e.message;
  }
}

// Listar Prazos
async function listDeadlines() {
  const status = document.getElementById('dataStatus');
  
  try {
    openDataModal('Prazos', null);
    status.style.display = 'block';
    status.textContent = 'Carregando prazos...';
    
    const res = await fetch('/api/deadlines', {
      headers: jwtToken ? { 'Authorization': 'Bearer ' + jwtToken } : {}
    });
    
    if (!res.ok) {
      status.textContent = 'Erro ao carregar prazos';
      return;
    }
    
    const data = await res.json();
    openDataModal('Prazos', data, 'deadlines');
    
  } catch (e) {
    status.textContent = 'Erro: ' + e.message;
  }
}

// Listar Prazos de Hoje
async function listTodayDeadlines() {
  const status = document.getElementById('dataStatus');
  
  try {
    openDataModal('Prazos de Hoje', null);
    status.style.display = 'block';
    status.textContent = 'Carregando prazos de hoje...';
    
    const res = await fetch('/api/deadlines/today', {
      headers: jwtToken ? { 'Authorization': 'Bearer ' + jwtToken } : {}
    });
    
    if (!res.ok) {
      status.textContent = 'Erro ao carregar prazos';
      return;
    }
    
    const data = await res.json();
    openDataModal('Prazos de Hoje', data, 'deadlines');
    
  } catch (e) {
    status.textContent = 'Erro: ' + e.message;
  }
}

// Listar Audiências
async function listHearings() {
  const status = document.getElementById('dataStatus');
  
  try {
    openDataModal('Audiências', null);
    status.style.display = 'block';
    status.textContent = 'Carregando audiências...';
    
    const res = await fetch('/api/hearings', {
      headers: jwtToken ? { 'Authorization': 'Bearer ' + jwtToken } : {}
    });
    
    if (!res.ok) {
      status.textContent = 'Erro ao carregar audiências';
      return;
    }
    
    const data = await res.json();
    openDataModal('Audiências', data, 'hearings');
    
  } catch (e) {
    status.textContent = 'Erro: ' + e.message;
  }
}

// Listar Audiências de Hoje
async function listTodayHearings() {
  const status = document.getElementById('dataStatus');
  
  try {
    openDataModal('Audiências de Hoje', null);
    status.style.display = 'block';
    status.textContent = 'Carregando audiências de hoje...';
    
    const res = await fetch('/api/hearings/today', {
      headers: jwtToken ? { 'Authorization': 'Bearer ' + jwtToken } : {}
    });
    
    if (!res.ok) {
      status.textContent = 'Erro ao carregar audiências';
      return;
    }
    
    const data = await res.json();
    openDataModal('Audiências de Hoje', data, 'hearings');
    
  } catch (e) {
    status.textContent = 'Erro: ' + e.message;
  }
}

// Listar Processos (versão modal)
async function listProcessesModal() {
  const status = document.getElementById('dataStatus');
  
  try {
    openDataModal('Processos', null);
    status.style.display = 'block';
    status.textContent = 'Coletando informações dos processos...';
    
    const init = { 
      method: 'GET', 
      headers: jwtToken ? { 'Authorization': 'Bearer ' + jwtToken } : {}
    };
    
    const [docsRes, deadlinesRes, hearingsRes] = await Promise.all([
      fetch('/api/documents', init),
      fetch('/api/deadlines', init), 
      fetch('/api/hearings', init)
    ]);
    
    const processIds = new Set();
    
    if (docsRes.ok) {
      const docs = await docsRes.json();
      docs.forEach(doc => {
        if (doc.process_id) processIds.add(doc.process_id);
      });
    }
    
    if (deadlinesRes.ok) {
      const deadlines = await deadlinesRes.json();
      deadlines.forEach(deadline => {
        if (deadline.process_id) processIds.add(deadline.process_id);
      });
    }
    
    if (hearingsRes.ok) {
      const hearings = await hearingsRes.json();
      if (hearings.items) {
        hearings.items.forEach(hearing => {
          if (hearing.process_id) processIds.add(hearing.process_id);
        });
      }
    }
    
    const processArray = Array.from(processIds).map(id => ({ process_id: id, status: 'Ativo' }));
    openDataModal('Processos', processArray);
    
  } catch (e) {
    status.textContent = 'Erro: ' + e.message;
  }
}
