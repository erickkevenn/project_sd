#!/usr/bin/env python3
"""
Testes para o serviço de autenticação
"""
import requests
import json

# URL do serviço de autenticação
AUTH_SERVICE_URL = "http://127.0.0.1:5001"

def test_successful_login():
    """Testa um login bem-sucedido"""
    print("Testando login bem-sucedido...")
    
    login_data = {
        "login": "admin@escritorio.com",
        "senha": "admin123"
    }
    
    try:
        response = requests.post(f"{AUTH_SERVICE_URL}/login", json=login_data)
        if response.status_code == 200:
            print("OK Login bem-sucedido")
        else:
            print(f"ERRO Login bem-sucedido: {response.status_code}")
    except Exception as e:
        print(f"ERRO Erro no login bem-sucedido: {e}")

def test_failed_login():
    """Testa um login mal-sucedido"""
    print("\nTestando login mal-sucedido...")
    
    login_data = {
        "login": "admin@escritorio.com",
        "senha": "senhaerrada"
    }
    
    try:
        response = requests.post(f"{AUTH_SERVICE_URL}/login", json=login_data)
        if response.status_code == 401:
            print("OK Login mal-sucedido")
        else:
            print(f"ERRO Login mal-sucedido: {response.status_code}")
    except Exception as e:
        print(f"ERRO Erro no login mal-sucedido: {e}")

if __name__ == "__main__":
    test_successful_login()
    test_failed_login()
