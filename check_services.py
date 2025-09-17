#!/usr/bin/env python3
"""
Script para verificar se todos os serviços estão rodando
"""

import requests
import time
import sys

SERVICES = {
    "API Gateway": "http://127.0.0.1:8000/health",
    "Documents": "http://127.0.0.1:5001/health", 
    "Deadlines": "http://127.0.0.1:5002/health",
    "Hearings": "http://127.0.0.1:5003/health"
}

def check_service(name, url, timeout=3):
    """Verificar se um serviço está respondendo"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            print(f"✅ {name}: OK")
            return True
        else:
            print(f"❌ {name}: HTTP {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ {name}: {e}")
        return False

def main():
    print("🔍 Verificando serviços...")
    print("=" * 50)
    
    all_ok = True
    for name, url in SERVICES.items():
        if not check_service(name, url):
            all_ok = False
    
    print("=" * 50)
    
    if all_ok:
        print("🎉 Todos os serviços estão funcionando!")
        sys.exit(0)
    else:
        print("⚠️  Alguns serviços não estão respondendo.")
        print("💡 Execute './run_all.sh' para iniciar todos os serviços.")
        sys.exit(1)

if __name__ == "__main__":
    main()
