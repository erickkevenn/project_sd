// Variável global para armazenar o token JWT
let jwtToken = null;

console.log('[DEBUG] Sistema JurisFlow carregado com sucesso!');

// === INICIALIZAÇÃO ===

window.addEventListener('DOMContentLoaded', async () => {
  const savedToken = localStorage.getItem("jwtToken");
  if (savedToken) {
    jwtToken = savedToken;
    showMainSystem();
    
    // Aplica controle de permissões
    await showUserInfo();
  } else {
    // Mostra a landing page por padrão
    showLanding();
  }
  
  // Adiciona listeners para tecla Enter nos formulários
  const passwordField = document.getElementById('password');
  if (passwordField) {
    passwordField.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        login();
      }
    });
  }
  
  const confirmPasswordField = document.getElementById('confirmPassword');
  if (confirmPasswordField) {
    confirmPasswordField.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        register();
      }
    });
  }
});
