/**
 * API Module
 * Handles API requests and responses
 */

// Variáveis para controle da visualização
let currentViewMode = 'json'; // 'json' ou 'table'
let lastResponseData = null;
let lastResponseMeta = null;

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

// === GERAÇÃO DE MENSAGENS AMIGÁVEIS ===

function generateFriendlyMessage(method, path, status, data) {
  const isSuccess = status >= 200 && status < 300;
  const isError = status >= 400;
  
  // Mensagens baseadas no endpoint e método
  if (path.includes('/auth/login')) {
    if (isSuccess) {
      return `✅ Login realizado com sucesso! Bem-vindo ao sistema.`;
    } else if (status === 401) {
      return `❌ Credenciais inválidas. Verifique seu usuário e senha.`;
    } else {
      return `❌ Erro no login. Tente novamente.`;
    }
  }
  
  if (path.includes('/auth/me')) {
    if (isSuccess) {
      return `✅ Informações do usuário carregadas com sucesso.`;
    } else if (status === 401) {
      return `❌ Sessão expirada. Faça login novamente.`;
    } else {
      return `❌ Erro ao carregar informações do usuário.`;
    }
  }
  
  if (path.includes('/documents')) {
    if (method === 'GET') {
      if (isSuccess) {
        const count = Array.isArray(data) ? data.length : (data?.items?.length || 0);
        return `📄 ${count} documento(s) encontrado(s).`;
      } else {
        return `❌ Erro ao listar documentos.`;
      }
    } else if (method === 'POST') {
      if (isSuccess) {
        return `✅ Documento criado com sucesso!`;
      } else {
        return `❌ Erro ao criar documento.`;
      }
    }
  }
  
  if (path.includes('/deadlines')) {
    if (method === 'GET') {
      if (isSuccess) {
        const count = Array.isArray(data) ? data.length : (data?.items?.length || 0);
        return `⏰ ${count} prazo(s) encontrado(s).`;
      } else {
        return `❌ Erro ao listar prazos.`;
      }
    } else if (method === 'POST') {
      if (isSuccess) {
        return `✅ Prazo criado com sucesso!`;
      } else {
        return `❌ Erro ao criar prazo.`;
      }
    }
  }
  
  if (path.includes('/hearings')) {
    if (method === 'GET') {
      if (isSuccess) {
        const count = Array.isArray(data) ? data.length : (data?.items?.length || 0);
        return `⚖️ ${count} audiência(s) encontrada(s).`;
      } else {
        return `❌ Erro ao listar audiências.`;
      }
    } else if (method === 'POST') {
      if (isSuccess) {
        return `✅ Audiência agendada com sucesso!`;
      } else {
        return `❌ Erro ao agendar audiência.`;
      }
    }
  }
  
  if (path.includes('/health')) {
    if (isSuccess) {
      return `💚 Sistema funcionando perfeitamente!`;
    } else {
      return `❌ Problema no sistema. Verifique a conectividade.`;
    }
  }
  
  // Mensagens genéricas
  if (isSuccess) {
    return `✅ Operação realizada com sucesso!`;
  } else if (isError) {
    if (status === 401) {
      return `❌ Não autorizado. Faça login novamente.`;
    } else if (status === 403) {
      return `❌ Acesso negado. Você não tem permissão para esta operação.`;
    } else if (status === 404) {
      return `❌ Recurso não encontrado.`;
    } else if (status === 500) {
      return `❌ Erro interno do servidor. Tente novamente mais tarde.`;
    } else {
      return `❌ Erro na operação (${status}).`;
    }
  }
  
  return `ℹ️ Status: ${status}`;
}

// Export functions for global access
window.hit = hit;
window.generateFriendlyMessage = generateFriendlyMessage;
