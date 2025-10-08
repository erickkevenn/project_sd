/**
 * Authentication Module
 * Handles user authentication, permissions, and user info
 */

// Variável global para armazenar o token JWT
let jwtToken = null;

async function showUserInfo() {
  const infoBox = document.getElementById('userInfo');
  
  if (!infoBox) return;
  
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
  const buttons = document.querySelectorAll('button[data-permission]');
  if (buttons.length === 0) return;
  
  buttons.forEach(button => {
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
  const usernameElement = document.getElementById('username');
  const passwordElement = document.getElementById('password');
  const statusElement = document.getElementById('loginStatus');

  if (!usernameElement || !passwordElement || !statusElement) return;

  const user = usernameElement.value;
  const pass = passwordElement.value;

  if (!user || !pass) {
    statusElement.className = 'auth-status error';
    statusElement.textContent = 'Por favor, preencha usuário e senha.';
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
      statusElement.className = 'auth-status error';
      statusElement.textContent = data.error || "Falha no login";
      return;
    }

    // guarda token
    jwtToken = data.token;
    localStorage.setItem("jwtToken", jwtToken);

    // mostra o sistema principal
    showMainSystem();
    statusElement.textContent = "";

    // Chama showUserInfo para aplicar controle de permissões
    await showUserInfo();

    // opcional: já chama health de início
    hit('/health','GET');
  } catch (e) {
    statusElement.className = 'auth-status error';
    statusElement.textContent = "Erro: " + e.message;
  }
}

function logout() {
  jwtToken = null;
  localStorage.removeItem("jwtToken");
  showLanding();
  document.getElementById('userInfo').textContent = "";
  applyPermissionControl([]);
}

// Export functions for global access
window.showUserInfo = showUserInfo;
window.applyPermissionControl = applyPermissionControl;
window.login = login;
window.logout = logout;