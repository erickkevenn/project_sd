#!/usr/bin/env python3
"""
Script para testar a refatoração do sistema de microserviços
"""
import requests
import json
import time
import sys
import pytest

# URLs dos serviços
SERVICES = {
    "gateway": "http://127.0.0.1:8000",
    "auth": "http://127.0.0.1:5001",
    "processes": "http://127.0.0.1:5002",
    "documents": "http://127.0.0.1:5003",
    "deadlines": "http://127.0.0.1:5004",
    "hearings": "http://127.0.0.1:5005"
}

def test_service_health():
    """Testa se todos os serviços estão funcionando"""
    print("\n---\n[*] Teste: Verificando a saúde dos serviços...")
    
    for service_name, url in SERVICES.items():
        try:
            response = requests.get(f"{url}/health", timeout=5)
            assert response.status_code == 200, f"Serviço {service_name} retornou status {response.status_code}"
            print(f"  [+] Serviço {service_name}: OK")
        except requests.exceptions.RequestException as e:
            assert False, f"Erro de conexão com o serviço {service_name}: {e}"

def get_token():
    """Helper function to get an authentication token."""
    login_data = {
        "login": "admin@escritorio.com",
        "senha": "admin123"
    }
    try:
        response = requests.post(f"{SERVICES['auth']}/login", json=login_data)
        response.raise_for_status()
        token_data = response.json()
        token = token_data.get('token')
        return token
    except requests.exceptions.RequestException as e:
        pytest.fail(f"Erro no login: {e}")

def test_authentication():
    """Testa autenticação"""
    print("\n---\n[*] Teste: Autenticação de usuário...")
    token = get_token()
    assert token is not None, "Token não encontrado na resposta de login"
    print("  [+] Login bem-sucedido")

def test_authenticated_requests():
    """Testa requisições autenticadas"""
    print("\n---\n[*] Teste: Requisições autenticadas...")
    token = get_token()
    assert token, "Token não disponível para testes autenticados"
    
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = {
        "processos": f"{SERVICES['processes']}/processes",
        "documentos": f"{SERVICES['documents']}/documents",
        "prazos": f"{SERVICES['deadlines']}/deadlines",
        "audiências": f"{SERVICES['hearings']}/hearings"
    }
    
    for name, url in endpoints.items():
        try:
            response = requests.get(url, headers=headers)
            assert response.status_code == 200, f"Falha na listagem de {name}: {response.status_code}"
            print(f"  [+] Listagem de {name}: OK")
        except Exception as e:
            assert False, f"Erro na listagem de {name}: {e}"

def test_validation():
    """Testa validação de dados"""
    print("\n---\n[*] Teste: Validação de dados de entrada...")
    
    invalid_process = {
        "numero_processo": "",
        "cliente_nome": "Teste"
    }
    
    try:
        response = requests.post(f"{SERVICES['processes']}/processes/validate", json=invalid_process)
        assert response.status_code == 400, f"Validação de processo inválido falhou: {response.status_code}"
        print("  [+] Validação de processo inválido: OK")
    except Exception as e:
        assert False, f"Erro na validação: {e}"

def test_gateway():
    """Testa o gateway"""
    print("\n---\n[*] Teste: Verificando o gateway...")
    
    try:
        response = requests.get(f"{SERVICES['gateway']}/health")
        assert response.status_code == 200, f"Gateway health check falhou: {response.status_code}"
        print("  [+] Gateway health check: OK")
    except Exception as e:
        assert False, f"Erro no gateway: {e}"