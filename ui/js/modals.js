/**
 * Modals Module
 * Handles modal management and form operations
 */

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

async function executeCreateDeadline() {
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

  try {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch('/api/deadlines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(deadlineData)
    });
    
    if (response.ok) {
      alert('✅ Prazo criado com sucesso!');
      if (typeof loadAllDeadlines === 'function') {
        loadAllDeadlines();
      }
    } else {
      const error = await response.json();
      alert('❌ Erro ao criar prazo: ' + (error.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('❌ Erro ao criar prazo.');
  }
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

// === FUNÇÕES DE BUSCA DE DOCUMENTOS ===

function searchDocument() {
  const modal = document.getElementById('searchModal');
  const searchInput = document.getElementById('searchIdInput');
  
  searchInput.value = '';
  modal.style.display = 'flex';
  searchInput.focus();
  
  searchInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };
}

function closeSearchModal() {
  document.getElementById('searchModal').style.display = 'none';
}

function executeSearch() {
  const searchInput = document.getElementById('searchIdInput');
  const docId = searchInput.value.trim();
  
  if (!docId) {
    alert('Por favor, digite o ID do documento.');
    return;
  }
  
  closeSearchModal();
  hit(`/api/documents/${docId}`, 'GET');
}

// === FUNÇÕES DE BUSCA DE PROCESSOS ===

function searchProcess() {
  const modal = document.getElementById('processModal');
  const processInput = document.getElementById('processIdInput');
  
  processInput.value = '';
  modal.style.display = 'flex';
  processInput.focus();
  
  processInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeProcessSearch();
    }
  };
}

function closeProcessModal() {
  document.getElementById('processModal').style.display = 'none';
}

function executeProcessSearch() {
  const processInput = document.getElementById('processIdInput');
  const processId = processInput.value.trim();
  
  if (!processId) {
    alert('Por favor, digite o ID do processo.');
    return;
  }
  
  closeProcessModal();
  hit(`/api/process/${processId}/summary`, 'GET');
}

// === FUNÇÕES DE EXCLUSÃO ===

function deleteDocument() {
  const modal = document.getElementById('deleteModal');
  const deleteInput = document.getElementById('deleteIdInput');
  
  deleteInput.value = '';
  modal.style.display = 'flex';
  deleteInput.focus();
  
  deleteInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeDelete();
    }
  };
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
}

function executeDelete() {
  const deleteInput = document.getElementById('deleteIdInput');
  const docId = deleteInput.value.trim();
  
  if (!docId) {
    alert('Por favor, digite o ID do documento.');
    return;
  }
  
  closeDeleteModal();
  hit(`/api/documents/${docId}`, 'DELETE');
}

function deleteDeadline() {
  const modal = document.getElementById('deleteDeadlineModal');
  const deleteInput = document.getElementById('deleteDeadlineIdInput');
  
  deleteInput.value = '';
  modal.style.display = 'flex';
  deleteInput.focus();
  
  deleteInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeDeleteDeadline();
    }
  };
}

function closeDeleteDeadlineModal() {
  document.getElementById('deleteDeadlineModal').style.display = 'none';
}

async function executeDeleteDeadline() {
  const deleteInput = document.getElementById('deleteDeadlineIdInput');
  const deadlineId = deleteInput.value.trim();
  
  if (!deadlineId) {
    alert('Por favor, digite o ID do prazo.');
    return;
  }
  
  closeDeleteDeadlineModal();
  
  try {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`/api/deadlines/${deadlineId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      alert('✅ Prazo excluído com sucesso!');
      if (typeof loadAllDeadlines === 'function') {
        loadAllDeadlines();
      }
    } else {
      const error = await response.json();
      alert('❌ Erro ao excluir prazo: ' + (error.error || 'Prazo não encontrado'));
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('❌ Erro ao excluir prazo.');
  }
}

function deleteHearing() {
  const modal = document.getElementById('deleteHearingModal');
  const deleteInput = document.getElementById('deleteHearingIdInput');
  
  deleteInput.value = '';
  modal.style.display = 'flex';
  deleteInput.focus();
  
  deleteInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      executeDeleteHearing();
    }
  };
}

function closeDeleteHearingModal() {
  document.getElementById('deleteHearingModal').style.display = 'none';
}

function executeDeleteHearing() {
  const deleteInput = document.getElementById('deleteHearingIdInput');
  const hearingId = deleteInput.value.trim();
  
  if (!hearingId) {
    alert('Por favor, digite o ID da audiência.');
    return;
  }
  
  closeDeleteHearingModal();
  hit(`/api/hearings/${hearingId}`, 'DELETE');
}

// Export functions for global access
window.createDocument = createDocument;
window.closeCreateDocumentModal = closeCreateDocumentModal;
window.executeCreateDocument = executeCreateDocument;
window.createDeadlineModal = createDeadlineModal;
window.closeCreateDeadlineModal = closeCreateDeadlineModal;
window.executeCreateDeadline = executeCreateDeadline;
window.createHearingModal = createHearingModal;
window.closeCreateHearingModal = closeCreateHearingModal;
window.executeCreateHearing = executeCreateHearing;
window.searchDocument = searchDocument;
window.closeSearchModal = closeSearchModal;
window.executeSearch = executeSearch;
window.searchProcess = searchProcess;
window.closeProcessModal = closeProcessModal;
window.executeProcessSearch = executeProcessSearch;
window.deleteDocument = deleteDocument;
window.closeDeleteModal = closeDeleteModal;
window.executeDelete = executeDelete;
window.deleteDeadline = deleteDeadline;
window.closeDeleteDeadlineModal = closeDeleteDeadlineModal;
window.executeDeleteDeadline = executeDeleteDeadline;
window.deleteHearing = deleteHearing;
window.closeDeleteHearingModal = closeDeleteHearingModal;
window.executeDeleteHearing = executeDeleteHearing;