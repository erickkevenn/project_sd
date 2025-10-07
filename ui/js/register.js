// === FUNÇÕES DE CADASTRO ===

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
