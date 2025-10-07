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

// === FUNÇÕES DE AUTENTICAÇÃO ===

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

// === FUNÇÕES DE USUÁRIO ===

async function showUserInfo() {
  const userInfoBox = document.getElementById('userInfo');
  const officeNameBox = document.getElementById('officeName');
  const userNameBox = document.getElementById('userName');
  
  if (!jwtToken) {
    if (userInfoBox) userInfoBox.textContent = "";
    if (officeNameBox) officeNameBox.textContent = "";
    if (userNameBox) userNameBox.textContent = "";
    // Se não há token, esconde todos os botões com permissão
    applyPermissionControl([]);
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + jwtToken }
    });
    
    if (!res.ok) {
      if (userInfoBox) userInfoBox.textContent = "";
      if (officeNameBox) officeNameBox.textContent = "";
      if (userNameBox) userNameBox.textContent = "";
      applyPermissionControl([]);
      return;
    }
    
    const response = await res.json();
    const userInfo = response.user;
    
    // Atualiza informações do usuário na interface
    if (officeNameBox) officeNameBox.textContent = userInfo.office || 'Escritório Não Informado';
    if (userNameBox) userNameBox.textContent = userInfo.username;
    
    console.log('[DEBUG] Permissões do usuário:', userInfo.permissions);
    
    // Aplica controle de permissões baseado nas permissões do usuário
    applyPermissionControl(userInfo.permissions);
    
  } catch (e) {
    if (userInfoBox) userInfoBox.textContent = "";
    if (officeNameBox) officeNameBox.textContent = "";
    if (userNameBox) userNameBox.textContent = "";
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
