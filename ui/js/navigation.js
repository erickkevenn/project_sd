/**
 * Navigation Module
 * Handles page navigation and form management
 */

// === FUNÇÕES DE NAVEGAÇÃO ===

function showLanding() {
  const landingPage = document.getElementById('landingPage');
  const loginPage = document.getElementById('loginPage');
  const registerPage = document.getElementById('registerPage');
  const mainUI = document.getElementById('mainUI');
  
  if (landingPage) landingPage.style.display = 'block';
  if (loginPage) loginPage.style.display = 'none';
  if (registerPage) registerPage.style.display = 'none';
  if (mainUI) mainUI.style.display = 'none';
}

function showLogin() {
  const landingPage = document.getElementById('landingPage');
  const loginPage = document.getElementById('loginPage');
  const registerPage = document.getElementById('registerPage');
  const mainUI = document.getElementById('mainUI');
  
  if (landingPage) landingPage.style.display = 'none';
  if (loginPage) loginPage.style.display = 'block';
  if (registerPage) registerPage.style.display = 'none';
  if (mainUI) mainUI.style.display = 'none';
  
  // Limpa os campos
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const loginStatus = document.getElementById('loginStatus');
  
  if (username) username.value = '';
  if (password) password.value = '';
  if (loginStatus) loginStatus.textContent = '';
  
  // Foca no campo de usuário
  setTimeout(() => {
    if (username) username.focus();
  }, 100);
}

function showRegister() {
  const landingPage = document.getElementById('landingPage');
  const loginPage = document.getElementById('loginPage');
  const registerPage = document.getElementById('registerPage');
  const mainUI = document.getElementById('mainUI');
  
  if (landingPage) landingPage.style.display = 'none';
  if (loginPage) loginPage.style.display = 'none';
  if (registerPage) registerPage.style.display = 'block';
  if (mainUI) mainUI.style.display = 'none';
  
  // Limpa os campos
  const fields = ['officeName', 'cnpj', 'responsibleName', 'oabNumber', 'email', 'phone', 'newUsername', 'newPassword', 'confirmPassword'];
  fields.forEach(field => {
    const element = document.getElementById(field);
    if (element) element.value = '';
  });
  
  const userType = document.getElementById('userType');
  const acceptTerms = document.getElementById('acceptTerms');
  const registerStatus = document.getElementById('registerStatus');
  
  if (userType) userType.value = '';
  if (acceptTerms) acceptTerms.checked = false;
  if (registerStatus) registerStatus.textContent = '';
  
  // Redefine a exibição do campo OAB
  setTimeout(() => {
    toggleOabField();
    const officeName = document.getElementById('officeName');
    if (officeName) officeName.focus();
  }, 100);
}

function showMainSystem() {
  const landingPage = document.getElementById('landingPage');
  const loginPage = document.getElementById('loginPage');
  const registerPage = document.getElementById('registerPage');
  const mainUI = document.getElementById('mainUI');
  
  if (landingPage) landingPage.style.display = 'none';
  if (loginPage) loginPage.style.display = 'none';
  if (registerPage) registerPage.style.display = 'none';
  if (mainUI) mainUI.style.display = 'block';
}

// Função para controlar a exibição do campo OAB
function toggleOabField() {
  const userTypeElement = document.getElementById('userType');
  const oabNumberElement = document.getElementById('oabNumber');
  
  if (!userTypeElement || !oabNumberElement) return;
  
  const userType = userTypeElement.value;
  const oabGroup = oabNumberElement.parentElement;
  const oabInput = oabNumberElement;
  const oabLabel = oabGroup ? oabGroup.querySelector('label') : null;
  
  if (userType === 'estagiario') {
    // Oculta o campo OAB para estagiários
    if (oabGroup) oabGroup.classList.add('hidden');
    oabInput.value = '';
    oabInput.removeAttribute('required');
  } else if (userType === 'advogado') {
    // Mostra o campo OAB para advogados (obrigatório)
    if (oabGroup) oabGroup.classList.remove('hidden');
    oabInput.setAttribute('required', 'required');
    if (oabLabel) oabLabel.textContent = 'Número da OAB *';
  } else {
    // Estado padrão - mostra o campo mas não obrigatório
    if (oabGroup) oabGroup.classList.remove('hidden');
    oabInput.removeAttribute('required');
    if (oabLabel) oabLabel.textContent = 'Número da OAB';
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

// Export functions for global access
window.showLanding = showLanding;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showMainSystem = showMainSystem;
window.toggleOabField = toggleOabField;
window.register = register;
