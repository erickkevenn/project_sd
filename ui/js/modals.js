// === FUNÇÕES DOS MODAIS E OPERAÇÕES ===

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

// === FUNÇÕES DE BUSCA ===

function searchDocument() {
  const modal = document.getElementById('searchModal');
  const input = document.getElementById('docIdInput');
  
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  
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
  
  closeSearchModal();
  
  if (!docId) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result';
    box.textContent = '🔍 BUSCA CANCELADA\n\nVocê não informou um ID para buscar.\n💡 Dica: Digite um ID válido de documento para realizar a busca.';
    status.textContent = 'Busca cancelada';
    return;
  }
  
  hit(`/api/documents/${docId}`, 'GET');
}

function searchProcess() {
  const modal = document.getElementById('processModal');
  const input = document.getElementById('processIdInput');
  
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  
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
  
  closeProcessModal();
  
  if (!processId) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result';
    box.textContent = '🔍 BUSCA CANCELADA\n\nVocê não informou um ID de processo para buscar.\n💡 Dica: Digite um ID válido de processo para ver o resumo completo.';
    status.textContent = 'Busca cancelada';
    return;
  }
  
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
    
    const processArray = Array.from(processIds);
    
    if (processArray.length === 0) {
      box.textContent = '📋 NENHUM PROCESSO ENCONTRADO\n\nNão há processos cadastrados no sistema.\n💡 Dica: Use "Orquestrar Caso" para criar um processo completo.';
      status.textContent = 'Nenhum processo encontrado';
      return;
    }
    
    box.textContent = `✅ ${processArray.length} PROCESSO(S) ENCONTRADO(S)\n\n` +
                     `Processos disponíveis:\n${processArray.map(id => `• ${id}`).join('\n')}\n\n` +
                     `💡 Use "Buscar Processo" para ver detalhes completos.`;
    status.textContent = `${processArray.length} processo(s) encontrado(s)`;
    
  } catch (e) {
    const box = document.getElementById('out');
    const status = document.getElementById('status');
    box.className = 'result err';
    box.textContent = '⚠️ ERRO AO LISTAR PROCESSOS\n\nNão foi possível acessar os serviços.\n💡 Dica: Verifique se todos os serviços estão funcionando.';
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
