/**
 * Main Module
 * Handles main application functions and orchestration
 */

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

// === FUNÇÕES DE LISTAGEM SIMPLES ===

function listDocuments() {
  hit('/api/documents', 'GET');
}

function listDeadlines() {
  hit('/api/deadlines', 'GET');
}

function listTodayDeadlines() {
  const today = new Date().toISOString().split('T')[0];
  hit(`/api/deadlines?due_date=${today}`, 'GET');
}

function listHearings() {
  hit('/api/hearings', 'GET');
}

function listTodayHearings() {
  const today = new Date().toISOString().split('T')[0];
  hit(`/api/hearings?date=${today}`, 'GET');
}

// === FUNÇÕES DE CRIAÇÃO SIMPLES (para compatibilidade) ===

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
    courtroom:'Sala 1',
    description: 'Audiência criada via UI'
  });
}

// === INICIALIZAÇÃO ===
// A inicialização é feita pelo app.js (sistema modular)

// Export functions for global access
window.listProcesses = listProcesses;
window.orchestrateCase = orchestrateCase;
window.listDocuments = listDocuments;
window.listDeadlines = listDeadlines;
window.listTodayDeadlines = listTodayDeadlines;
window.listHearings = listHearings;
window.listTodayHearings = listTodayHearings;
window.createDeadline = createDeadline;
window.createHearing = createHearing;