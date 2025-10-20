#!/usr/bin/env python3
"""
Script para testar a refatoração do sistema de microserviços
"""
import requests
import json
import time
import sys

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
    print("Testando saude dos servicos...")
    
    for service_name, url in SERVICES.items():
        try:
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code == 200:
                print(f"OK {service_name}: OK")
            else:
                print(f"ERRO {service_name}: Status {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"ERRO {service_name}: Erro de conexao - {e}")

def test_authentication():
    """Testa autenticação"""
    print("\nTestando autenticacao...")
    
    # Teste de login
    login_data = {
        "login": "admin@escritorio.com",
        "senha": "admin123"
    }
    
    try:
        response = requests.post(f"{SERVICES['auth']}/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get('token')
            print("OK Login bem-sucedido")
            return token
        else:
            print(f"ERRO Falha no login: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"ERRO Erro no login: {e}")
        return None

def test_authenticated_requests(token):
    """Testa requisições autenticadas"""
    if not token:
        print("ERRO Token nao disponivel para testes autenticados")
        return
    
    print("\nTestando requisicoes autenticadas...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Teste de processos
    try:
        response = requests.get(f"{SERVICES['processes']}/processes", headers=headers)
        if response.status_code == 200:
            print("OK Listagem de processos: OK")
        else:
            print(f"ERRO Listagem de processos: {response.status_code}")
    except Exception as e:
        print(f"ERRO Erro na listagem de processos: {e}")
    
    # Teste de documentos
    try:
        response = requests.get(f"{SERVICES['documents']}/documents", headers=headers)
        if response.status_code == 200:
            print("OK Listagem de documentos: OK")
        else:
            print(f"ERRO Listagem de documentos: {response.status_code}")
    except Exception as e:
        print(f"ERRO Erro na listagem de documentos: {e}")
    
    # Teste de prazos
    try:
        response = requests.get(f"{SERVICES['deadlines']}/deadlines", headers=headers)
        if response.status_code == 200:
            print("OK Listagem de prazos: OK")
        else:
            print(f"ERRO Listagem de prazos: {response.status_code}")
    except Exception as e:
        print(f"ERRO Erro na listagem de prazos: {e}")
    
    # Teste de audiências
    try:
        response = requests.get(f"{SERVICES['hearings']}/hearings", headers=headers)
        if response.status_code == 200:
            print("OK Listagem de audiencias: OK")
        else:
            print(f"ERRO Listagem de audiencias: {response.status_code}")
    except Exception as e:
        print(f"ERRO Erro na listagem de audiencias: {e}")

def test_validation():
    """Testa validação de dados"""
    print("\nTestando validacao de dados...")
    
    # Teste de criação de processo com dados inválidos
    invalid_process = {
        "numero_processo": "",  # Campo obrigatório vazio
        "cliente_nome": "Teste"
    }
    
    try:
        response = requests.post(f"{SERVICES['processes']}/processes/validate", json=invalid_process)
        if response.status_code == 400:
            print("OK Validacao de processo invalido: OK")
        else:
            print(f"ERRO Validacao de processo invalido: {response.status_code}")
    except Exception as e:
        print(f"ERRO Erro na validacao: {e}")

def test_gateway():
    """Testa o gateway"""
    print("\nTestando gateway...")
    
    try:
        response = requests.get(f"{SERVICES['gateway']}/health")
        if response.status_code == 200:
            print("OK Gateway health check: OK")
        else:
            print(f"ERRO Gateway health check: {response.status_code}")
    except Exception as e:
        print(f"ERRO Erro no gateway: {e}")

def main():
    """Função principal"""
    print("Iniciando testes da refatoracao do sistema de microservicos")
    print("=" * 60)
    
    # Aguarda um pouco para os serviços iniciarem
    print("Aguardando servicos iniciarem...")
    time.sleep(3)
    
    # Executa testes
    test_service_health()
    token = test_authentication()
    test_authenticated_requests(token)
    test_validation()
    test_gateway()
    
    print("\n" + "=" * 60)
    print("Testes concluidos!")
    print("\nPara executar os servicos, use:")
    print("python gateway/app.py")
    print("python services/auth_service/app.py")
    print("python services/processes_service/app.py")
    print("python services/documents_service/app.py")
    print("python services/deadlines_service/app.py")
    print("python services/hearings_service/app.py")

if __name__ == "__main__":
    main()
