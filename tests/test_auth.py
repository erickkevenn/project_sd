"""
Testes para o serviço de autenticação
"""
import requests
import json

# URL do serviço de autenticação
AUTH_SERVICE_URL = "http://127.0.0.1:5001"

def test_successful_login():
    """Testa um login bem-sucedido"""
    print("\n---\n[*] Teste: Login de usuário bem-sucedido...")
    
    login_data = {
        "login": "admin@escritorio.com",
        "senha": "admin123"
    }
    
    try:
        response = requests.post(f"{AUTH_SERVICE_URL}/login", json=login_data)
        assert response.status_code == 200, f"Login bem-sucedido falhou: {response.status_code}"
        print("  [+] Login bem-sucedido: OK")
    except Exception as e:
        assert False, f"Erro no login bem-sucedido: {e}"

def test_failed_login():
    """Testa um login mal-sucedido"""
    print("\n---\n[*] Teste: Login de usuário mal-sucedido...")
    
    login_data = {
        "login": "admin@escritorio.com",
        "senha": "senhaerrada"
    }
    
    try:
        response = requests.post(f"{AUTH_SERVICE_URL}/login", json=login_data)
        assert response.status_code == 401, f"Login mal-sucedido falhou: {response.status_code}"
        print("  [+] Login mal-sucedido: OK")
    except Exception as e:
        assert False, f"Erro no login mal-sucedido: {e}"