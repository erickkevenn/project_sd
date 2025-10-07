// Variável global para armazenar o token JWT
let jwtToken = null;

// Variáveis para controle da visualização
let currentViewMode = 'json'; // 'json' ou 'table'
let lastResponseData = null;
let lastResponseMeta = null;

console.log('[DEBUG] Script.js carregado com sucesso!');

// === FUNÇÕES DE NAVEGAÇÃO ===

function showLanding() {
  document.getElementById('landingPage').style.display = 'block';
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('registerPage').style.display = 'none';
  document.getElementById('mainUI').style.display = 'none';
}

function showLogin() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'block';
  document.getElementById('registerPage').style.display = 'none';
  document.getElementById('mainUI').style.display = 'none';
  
  // Limpa os campos
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('loginStatus').textContent = '';
  
  // Foca no campo de usuário
  setTimeout(() => document.getElementById('username').focus(), 100);
}

function showRegister() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('registerPage').style.display = 'block';
  document.getElementById('mainUI').style.display = 'none';
  
  // Limpa os campos
  const fields = ['officeName', 'cnpj', 'responsibleName', 'oabNumber', 'email', 'phone', 'newUsername', 'newPassword', 'confirmPassword'];
  fields.forEach(field => {
    const element = document.getElementById(field);
    if (element) element.value = '';
  });
  document.getElementById('userType').value = '';
  document.getElementById('acceptTerms').checked = false;
  document.getElementById('registerStatus').textContent = '';
  
  // Redefine a exibição do campo OAB
  setTimeout(() => {
    toggleOabField();
    document.getElementById('officeName').focus();
  }, 100);
}

function showMainSystem() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('registerPage').style.display = 'none';
  document.getElementById('mainUI').style.display = 'block';
}

// Função para controlar a exibição do campo OAB
function toggleOabField() {
  const userType = document.getElementById('userType').value;
  const oabGroup = document.getElementById('oabNumber').parentElement;
  const oabInput = document.getElementById('oabNumber');
  const oabLabel = oabGroup.querySelector('label');
  
  if (userType === 'estagiario') {
    // Oculta o campo OAB para estagiários
    oabGroup.classList.add('hidden');
    oabInput.value = '';
    oabInput.removeAttribute('required');
  } else if (userType === 'advogado') {
    // Mostra o campo OAB para advogados (obrigatório)
    oabGroup.classList.remove('hidden');
    oabInput.setAttribute('required', 'required');
    oabLabel.textContent = 'Número da OAB *';
  } else {
    // Estado padrão - mostra o campo mas não obrigatório
    oabGroup.classList.remove('hidden');
    oabInput.removeAttribute('required');
    oabLabel.textContent = 'Número da OAB';
  }
}

// Função de cadastro
async function register() {
  const status = document.getElementById('registerStatus');
  
  // Coleta os dados do formulário
  const data = {
    officeName: document.getElementById('officeName').value.trim(),
    cnpj: document.getElementById('cnpj').value.trim(),
    responsibleName: document.getElementById('responsibleName').value.trim(),
    oabNumber: document.getElementById('oabNumber').value.trim(),
    userType: document.getElementById('userType').value,
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    username: document.getElementById('newUsername').value.trim(),
    password: document.getElementById('newPassword').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    acceptTerms: document.getElementById('acceptTerms').checked
  };
  
  // Validações
  if (!data.officeName || !data.cnpj || !data.responsibleName || !data.userType ||
      !data.email || !data.phone || !data.username || !data.password) {
    status.className = 'auth-status error';
    status.textContent = 'Por favor, preencha todos os campos obrigatórios.';
    return;
  }
  
  // Validação específica para advogados
  if (data.userType === 'advogado' && !data.oabNumber) {
    status.className = 'auth-status error';
    status.textContent = 'Número da OAB é obrigatório para advogados.';
    return;
  }
  
  if (data.password !== data.confirmPassword) {
    status.className = 'auth-status error';
    status.textContent = 'As senhas não coincidem.';
    return;
  }
  
  if (data.password.length < 8) {
    status.className = 'auth-status error';
    status.textContent = 'A senha deve ter pelo menos 8 caracteres.';
    return;
  }
  
  if (!data.acceptTerms) {
    status.className = 'auth-status error';
    status.textContent = 'Você deve aceitar os termos de uso e política de privacidade.';
    return;
  }
  
  // Simulação de cadastro (em uma implementação real, enviaria para o backend)
  status.className = 'auth-status success';
  const userTypeText = data.userType === 'advogado' ? 'Advogado' : 'Estagiário';
  status.textContent = `Cadastro realizado com sucesso como ${userTypeText}! Redirecionando para o login...`;
  
  setTimeout(() => {
    showLogin();
    document.getElementById('username').value = data.username;
    const loginStatus = document.getElementById('loginStatus');
    loginStatus.className = 'auth-status success';
    loginStatus.textContent = 'Cadastro concluído! Agora faça login com suas credenciais.';
  }, 2000);
}

// === FUNÇÕES DE AUTENTICAÇÃO E USUÁRIO ===

async function showUserInfo() {
  const infoBox = document.getElementById('userInfo');
  
  if (!jwtToken) {
    infoBox.textContent = "";
    // Se não há token, esconde todos os botões com permissão
    applyPermissionControl([]);
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + jwtToken }
    });
    
    if (!res.ok) {
      infoBox.textContent = "❌ Erro ao obter informações do usuário";
      applyPermissionControl([]);
      return;
    }
    
    const response = await res.json();
    const userInfo = response.user;
    infoBox.textContent = `👤 Usuário: ${userInfo.username} | 🏷️ Roles: ${userInfo.roles.join(', ')} | 🔑 Permissions: ${userInfo.permissions.join(', ')}`;
    
    console.log('[DEBUG] Permissões do usuário:', userInfo.permissions);
    
    // Aplica controle de permissões baseado nas permissões do usuário
    applyPermissionControl(userInfo.permissions);
    
  } catch (e) {
    infoBox.textContent = "";
  }
}

function applyPermissionControl(userPermissions) {
  console.log('[DEBUG] Aplicando controle de permissões para:', userPermissions);
  
  // Para cada botão com data-permission
  document.querySelectorAll('button[data-permission]').forEach(button => {
    const requiredPermission = button.getAttribute('data-permission');
    const buttonText = button.textContent.trim();
    
    if (userPermissions.includes(requiredPermission)) {
      // Usuário tem permissão - mostrar botão
      button.classList.remove('hidden');
      button.disabled = false;
      console.log(`[DEBUG] Mostrando botão "${buttonText}" (requer: ${requiredPermission})`);
    } else {
      // Usuário não tem permissão - esconder botão
      button.classList.add('hidden');
      console.log(`[DEBUG] Escondendo botão "${buttonText}" (requer: ${requiredPermission})`);
    }
  });
}

async function login() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const status = document.getElementById('loginStatus');

  if (!user || !pass) {
    status.className = 'auth-status error';
    status.textContent = 'Por favor, preencha usuário e senha.';
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();

    if (!res.ok) {
      status.className = 'auth-status error';
      status.textContent = data.error || "Falha no login";
      return;
    }

    // guarda token
    jwtToken = data.token;
    localStorage.setItem("jwtToken", jwtToken);

    // mostra o sistema principal
    showMainSystem();
    status.textContent = "";

    // Chama showUserInfo para aplicar controle de permissões
    await showUserInfo();

    // opcional: já chama health de início
    hit('/health','GET');
  } catch (e) {
    status.className = 'auth-status error';
    status.textContent = "Erro: " + e.message;
  }
}

function logout() {
  jwtToken = null;
  localStorage.removeItem("jwtToken");
  showLanding();
  
  // Reset controle de permissões
  showUserInfo();
}

// === FUNÇÃO PRINCIPAL DE REQUISIÇÕES ===

async function hit(path, method="GET", body=null) {
  const box = document.getElementById('out');
  const status = document.getElementById('status');
  box.className = 'result';
  
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
    
    box.classList.add(res.ok ? 'ok' : 'err');
    
    // Gerar mensagem amigável baseada no tipo de operação e erro
    const friendlyMessage = generateFriendlyMessage(method, path, res.status, parsed);
    
    console.log(`[DEBUG] Mensagem amigável gerada:`, friendlyMessage);
    
    // Armazena dados para visualização
    lastResponseData = parsed;
    lastResponseMeta = {
      method: method,
      path: path,
      status: res.status,
      time: ms,
      friendlyMessage: friendlyMessage
    };
    
    // Atualiza metadados
    const responseMeta = document.getElementById('responseMeta');
    responseMeta.textContent = `${method} ${path} → ${res.status} (${ms}ms)`;
    
    // Exibe resposta baseada no modo atual
    displayResponse();
    
    status.textContent = "Última resposta: " + res.status + " em " + ms + "ms";
  } catch (e) {
    box.classList.add('err');
    box.textContent = method + ' ' + path + ' → ERROR\n\n' + e.message;
    status.textContent = "Erro: " + e.message;
  }
}

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
  
  // Excluir documento
  if (method === 'DELETE' && path.match(/\/api\/documents\/[^/]+$/) && status === 404) {
    const docId = path.split('/').pop();
    return `❌ DOCUMENTO NÃO ENCONTRADO\n\nNão foi possível excluir: documento "${docId}" não existe.\n💡 Dica: Verifique o ID e tente novamente.`;
  }
  
  // Excluir prazo
  if (method === 'DELETE' && path.match(/\/api\/deadlines\/[^/]+$/) && status === 404) {
    const deadlineId = path.split('/').pop();
    return `❌ PRAZO NÃO ENCONTRADO\n\nNão foi possível excluir: prazo "${deadlineId}" não existe.\n💡 Dica: Use "Listar Prazos" para ver os IDs disponíveis.`;
  }
  
  // Excluir audiência
  if (method === 'DELETE' && path.match(/\/api\/hearings\/[^/]+$/) && status === 404) {
    const hearingId = path.split('/').pop();
    return `❌ AUDIÊNCIA NÃO ENCONTRADA\n\nNão foi possível cancelar: audiência "${hearingId}" não existe.\n💡 Dica: Use "Listar Audiências" para ver os IDs disponíveis.`;
  }
  
  // Lista vazia de documentos
  if (method === 'GET' && path === '/api/documents' && status === 200 && Array.isArray(data) && data.length === 0) {
    return `📋 LISTA VAZIA\n\nNenhum documento foi encontrado no sistema.\n💡 Dica: Use "Criar Documento" para adicionar o primeiro documento.`;
  }
  
  // Lista vazia de prazos
  if (method === 'GET' && path === '/api/deadlines' && status === 200 && Array.isArray(data) && data.length === 0) {
    return `📋 LISTA VAZIA\n\nNenhum prazo foi encontrado no sistema.\n💡 Dica: Use "Criar Prazo" para adicionar o primeiro prazo.`;
  }
  
  // Lista vazia de audiências
  if (method === 'GET' && path === '/api/hearings' && status === 200 && data && data.items && data.items.length === 0) {
    return `📋 LISTA VAZIA\n\nNenhuma audiência foi encontrada no sistema.\n💡 Dica: Use "Agendar Audiência" para adicionar a primeira audiência.`;
  }
  
  // Sucesso na exclusão
  if (method === 'DELETE' && status === 200) {
    if (path.includes('/documents/')) {
      return `✅ DOCUMENTO EXCLUÍDO\n\nDocumento removido com sucesso do sistema.`;
    } else if (path.includes('/deadlines/')) {
      return `✅ PRAZO EXCLUÍDO\n\nPrazo removido com sucesso do sistema.`;
    } else if (path.includes('/hearings/')) {
      return `✅ AUDIÊNCIA CANCELADA\n\nAudiência cancelada com sucesso.`;
    }
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
  
  // Serviço indisponível
  if (status === 502) {
    return `⚠️ SERVIÇO INDISPONÍVEL\n\nO serviço está temporariamente fora do ar.\n💡 Dica: Tente novamente em alguns segundos.`;
  }
  
  return null; // Usa mensagem padrão
}

// === FUNÇÕES DE CRIAÇÃO COM MODAIS ===

// Criar Documento
function createDocument() {
  const modal = document.getElementById('createDocumentModal');
  const titleInput = document.getElementById('docTitleInput');
  const contentInput = document.getElementById('docContentInput');
  const authorInput = document.getElementById('docAuthorInput');
  const processIdInput = document.getElementById('docProcessIdInput');
  
  // Limpa os campos
  titleInput.value = '';
  contentInput.value = '';
  authorInput.value = '';
  processIdInput.value = '';
  
  modal.style.display = 'flex';
  titleInput.focus();
  
  // Permite criar com Enter no último campo
  processIdInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeCreateDocument();
    }
  };
}

function closeCreateDocumentModal() {
  document.getElementById('createDocumentModal').style.display = 'none';
}

function executeCreateDocument() {
  const titleInput = document.getElementById('docTitleInput');
  const contentInput = document.getElementById('docContentInput');
  const authorInput = document.getElementById('docAuthorInput');
  const processIdInput = document.getElementById('docProcessIdInput');
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const author = authorInput.value.trim();
  const processId = processIdInput.value.trim();
  
  if (!title || !content || !author) {
    alert('Por favor, preencha todos os campos obrigatórios (título, conteúdo e autor).');
    return;
  }
  
  const documentData = {
    title: title,
    content: content,
    author: author
  };
  
  if (processId) {
    documentData.process_id = processId;
  }
  
  closeCreateDocumentModal();
  hit('/api/documents', 'POST', documentData);
}

// Criar Prazo
function createDeadlineModal() {
  const modal = document.getElementById('createDeadlineModal');
  const processIdInput = document.getElementById('deadlineProcessIdInput');
  const dateInput = document.getElementById('deadlineDateInput');
  const descInput = document.getElementById('deadlineDescInput');
  
  // Limpa os campos
  processIdInput.value = '';
  dateInput.value = '';
  descInput.value = '';
  
  // Define data padrão para 30 dias no futuro
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 30);
  dateInput.value = futureDate.toISOString().split('T')[0];
  
  modal.style.display = 'flex';
  processIdInput.focus();
  
  // Permite criar com Enter no último campo
  descInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeCreateDeadline();
    }
  };
}

function closeCreateDeadlineModal() {
  document.getElementById('createDeadlineModal').style.display = 'none';
}

function executeCreateDeadline() {
  const processIdInput = document.getElementById('deadlineProcessIdInput');
  const dateInput = document.getElementById('deadlineDateInput');
  const descInput = document.getElementById('deadlineDescInput');
  
  const processId = processIdInput.value.trim();
  const date = dateInput.value;
  const description = descInput.value.trim();
  
  if (!processId || !date || !description) {
    alert('Por favor, preencha todos os campos.');
    return;
  }
  
  const deadlineData = {
    process_id: processId,
    due_date: date,
    description: description
  };
  
  closeCreateDeadlineModal();
  hit('/api/deadlines', 'POST', deadlineData);
}

// Criar Audiência
function createHearingModal() {
  const modal = document.getElementById('createHearingModal');
  const processIdInput = document.getElementById('hearingProcessIdInput');
  const dateInput = document.getElementById('hearingDateInput');
  const courtroomInput = document.getElementById('hearingCourtroomInput');
  const descInput = document.getElementById('hearingDescInput');
  
  // Limpa os campos
  processIdInput.value = '';
  dateInput.value = '';
  courtroomInput.value = '';
  descInput.value = '';
  
  // Define data padrão para 15 dias no futuro
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 15);
  dateInput.value = futureDate.toISOString().split('T')[0];
  
  modal.style.display = 'flex';
  processIdInput.focus();
  
  // Permite criar com Enter no último campo
  descInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeCreateHearing();
    }
  };
}

function closeCreateHearingModal() {
  document.getElementById('createHearingModal').style.display = 'none';
}

function executeCreateHearing() {
  const processIdInput = document.getElementById('hearingProcessIdInput');
  const dateInput = document.getElementById('hearingDateInput');
  const courtroomInput = document.getElementById('hearingCourtroomInput');
  const descInput = document.getElementById('hearingDescInput');
  
  const processId = processIdInput.value.trim();
  const date = dateInput.value;
  const courtroom = courtroomInput.value.trim();
  const description = descInput.value.trim();
  
  if (!processId || !date || !courtroom || !description) {
    alert('Por favor, preencha todos os campos.');
    return;
  }
  
  const hearingData = {
    process_id: processId,
    date: date,
    courtroom: courtroom,
    description: description
  };
  
  closeCreateHearingModal();
  hit('/api/hearings', 'POST', hearingData);
}

// Manter as funções antigas para compatibilidade (usadas na orquestração)
function createDeadline() {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 30); // 30 dias no futuro
  const dueDateStr = futureDate.toISOString().split('T')[0];
  
  hit('/api/deadlines','POST',{
    process_id:'UI-01',
    due_date: dueDateStr,
    description: 'Prazo criado via UI'
  });
}

function createHearing() {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 15); // 15 dias no futuro
  const hearingDateStr = futureDate.toISOString().split('T')[0];
  
  hit('/api/hearings','POST',{
    process_id:'UI-01',
    date: hearingDateStr,
    courtroom:'Sala 2',
    description: 'Audiência agendada via UI'
  });
}

// === FUNÇÕES DE BUSCA DE DOCUMENTOS ===

function searchDocument() {
  // Abre o modal customizado
  const modal = document.getElementById('searchModal');
  const input = document.getElementById('docIdInput');
  
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  
  // Permite buscar com Enter
  input.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };
}

function closeSearchModal() {
  const modal = document.getElementById('searchModal');
  modal.style.display = 'none';
}

function executeSearch() {
  const input = document.getElementById('docIdInput');
  const docId = input.value.trim();
  
  // Fecha o modal
  closeSearchModal();
  
  // Se não digitou nada
  if (!docId) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result';
    box.textContent = '🔍 BUSCA CANCELADA\n\nVocê não informou um ID para buscar.\n💡 Dica: Digite um ID válido de documento para realizar a busca.';
    status.textContent = 'Busca cancelada';
    return;
  }
  
  // Busca o documento pelo ID informado
  hit(`/api/documents/${docId}`, 'GET');
}

// === FUNÇÕES DE BUSCA DE PROCESSOS ===

function searchProcess() {
  const modal = document.getElementById('processModal');
  const input = document.getElementById('processIdInput');
  
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  
  // Permite buscar com Enter
  input.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeProcessSearch();
    }
  };
}

function closeProcessModal() {
  const modal = document.getElementById('processModal');
  modal.style.display = 'none';
}

function executeProcessSearch() {
  const input = document.getElementById('processIdInput');
  const processId = input.value.trim();
  
  // Fecha o modal
  closeProcessModal();
  
  // Se não digitou nada
  if (!processId) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result';
    box.textContent = '🔍 BUSCA CANCELADA\n\nVocê não informou um ID de processo para buscar.\n💡 Dica: Digite um ID válido de processo para ver o resumo completo.';
    status.textContent = 'Busca cancelada';
    return;
  }
  
  // Busca o resumo do processo pelo ID informado
  hit(`/api/process/${processId}/summary`, 'GET');
}

// === FUNÇÃO PARA LISTAR PROCESSOS ===

async function listProcesses() {
  try {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    
    box.className = 'result';
    box.textContent = 'LISTAR PROCESSOS → Buscando...\n\nColetando informações de todos os serviços...';
    status.textContent = 'Buscando processos...';
    
    // Busca dados de todos os serviços para encontrar process_ids únicos
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
    
    // Coleta process_ids de documentos
    if (docsRes.ok) {
      const docs = await docsRes.json();
      docs.forEach(doc => {
        if (doc.process_id) processIds.add(doc.process_id);
      });
    }
    
    // Coleta process_ids de prazos
    if (deadlinesRes.ok) {
      const deadlines = await deadlinesRes.json();
      deadlines.forEach(deadline => {
        if (deadline.process_id) processIds.add(deadline.process_id);
      });
    }
    
    // Coleta process_ids de audiências
    if (hearingsRes.ok) {
      const hearings = await hearingsRes.json();
      if (hearings.items) {
        hearings.items.forEach(hearing => {
          if (hearing.process_id) processIds.add(hearing.process_id);
        });
      }
    }
    
    const processArray = Array.from(processIds);
    
    if (processArray.length === 0) {
      box.textContent = '📋 NENHUM PROCESSO ENCONTRADO\n\nNão há processos cadastrados no sistema.\n💡 Dica: Use "Orquestrar (Criar tudo)" para criar um processo completo com documento, prazo e audiência.';
      status.textContent = 'Nenhum processo encontrado';
      return;
    }
    
    box.textContent = `✅ ${processArray.length} PROCESSO(S) ENCONTRADO(S)\n\n` +
                     `Processos disponíveis:\n${processArray.map(id => `• ${id}`).join('\n')}\n\n` +
                     `💡 Use "Buscar Processo" para ver detalhes completos de qualquer processo.`;
    status.textContent = `${processArray.length} processo(s) encontrado(s)`;
    
  } catch (e) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result err';
    box.textContent = '⚠️ ERRO AO LISTAR PROCESSOS\n\nNão foi possível acessar os serviços para listar os processos.\n💡 Dica: Verifique se todos os serviços estão funcionando.';
    status.textContent = 'Erro: ' + e.message;
  }
}

// === FUNÇÃO DE ORQUESTRAÇÃO ===

function orchestrateCase() {
  const today = new Date();
  const deadlineDate = new Date(today);
  deadlineDate.setDate(today.getDate() + 30);
  const hearingDate = new Date(today);
  hearingDate.setDate(today.getDate() + 15);
  
  hit('/api/orchestrate/file-case','POST',{
    document:{
      title:'Petição Inicial via Orquestração',
      content:'Documento criado através da funcionalidade de orquestração automática.',
      author:'Sistema'
    },
    deadline:{
      process_id:'ORCH-01',
      due_date: deadlineDate.toISOString().split('T')[0],
      description: 'Prazo para resposta - criado via orquestração'
    },
    hearing:{
      process_id:'ORCH-01',
      date: hearingDate.toISOString().split('T')[0],
      courtroom:'Sala 3',
      description: 'Audiência inicial - criada via orquestração'
    }
  });
}

// === FUNÇÕES DE EXCLUSÃO DE DOCUMENTOS ===

function deleteDocument() {
  const modal = document.getElementById('deleteModal');
  const input = document.getElementById('deleteIdInput');
  
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  
  input.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeDelete();
    }
  };
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
}

function executeDelete() {
  const input = document.getElementById('deleteIdInput');
  const docId = input.value.trim();
  
  closeDeleteModal();
  
  if (!docId) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result';
    box.textContent = '🗑️ EXCLUSÃO CANCELADA\n\nVocê não informou um ID para excluir.\n💡 Dica: Digite o ID do documento que deseja remover.';
    status.textContent = 'Exclusão cancelada';
    return;
  }
  
  hit(`/api/documents/${docId}`, 'DELETE');
}

// === FUNÇÕES DE EXCLUSÃO DE PRAZOS ===

function deleteDeadline() {
  const modal = document.getElementById('deleteDeadlineModal');
  const input = document.getElementById('deleteDeadlineIdInput');
  
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  
  input.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeDeleteDeadline();
    }
  };
}

function closeDeleteDeadlineModal() {
  document.getElementById('deleteDeadlineModal').style.display = 'none';
}

function executeDeleteDeadline() {
  const input = document.getElementById('deleteDeadlineIdInput');
  const deadlineId = input.value.trim();
  
  closeDeleteDeadlineModal();
  
  if (!deadlineId) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result';
    box.textContent = '🗑️ EXCLUSÃO CANCELADA\n\nVocê não informou um ID de prazo para excluir.\n💡 Dica: Digite o ID do prazo que deseja remover.';
    status.textContent = 'Exclusão cancelada';
    return;
  }
  
  hit(`/api/deadlines/${deadlineId}`, 'DELETE');
}

// === FUNÇÕES DE EXCLUSÃO DE AUDIÊNCIAS ===

function deleteHearing() {
  const modal = document.getElementById('deleteHearingModal');
  const input = document.getElementById('deleteHearingIdInput');
  
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  
  input.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeDeleteHearing();
    }
  };
}

function closeDeleteHearingModal() {
  document.getElementById('deleteHearingModal').style.display = 'none';
}

function executeDeleteHearing() {
  const input = document.getElementById('deleteHearingIdInput');
  const hearingId = input.value.trim();
  
  closeDeleteHearingModal();
  
  if (!hearingId) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result';
    box.textContent = '🗑️ CANCELAMENTO CANCELADO\n\nVocê não informou um ID de audiência para cancelar.\n💡 Dica: Digite o ID da audiência que deseja cancelar.';
    status.textContent = 'Cancelamento cancelado';
    return;
  }
  
  hit(`/api/hearings/${hearingId}`, 'DELETE');
}

// === INICIALIZAÇÃO ===

window.addEventListener('DOMContentLoaded', async () => {
  const savedToken = localStorage.getItem("jwtToken");
  if (savedToken) {
    jwtToken = savedToken;
    showMainSystem();
    
    // Aplica controle de permissões
    await showUserInfo();
    
    hit('/health','GET');
  } else {
    // Mostra a landing page por padrão
    showLanding();
  }
  
  // Adiciona listeners para tecla Enter nos formulários
  document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      login();
    }
  });
  
  document.getElementById('confirmPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      register();
    }
  });
});
