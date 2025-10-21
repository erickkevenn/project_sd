#!/usr/bin/env python3
"""
Script para verificar se todos os serviços estão rodando, com retentativas.
"""

import requests
import time
import sys

SERVICES = {
    "API Gateway": "http://127.0.0.1:8000/health",
    "Auth Service": "http://127.0.0.1:5001/health",
    "Processes Service": "http://127.0.0.1:5002/health",
    "Documents Service": "http://127.0.0.1:5003/health",
    "Deadlines Service": "http://127.0.0.1:5004/health",
    "Hearings Service": "http://127.0.0.1:5005/health"
}

MAX_WAIT_SECONDS = 30  # Tempo máximo de espera
RETRY_INTERVAL_SECONDS = 2  # Intervalo entre tentativas

def check_service(name, url, timeout=5):
    """Verificar se um serviço está respondendo"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            return True
        return False
    except requests.exceptions.RequestException:
        return False

def main():
    print("Verificando servicos com retentativas...")
    print("=" * 50)

    start_time = time.time()
    services_status = {name: False for name in SERVICES}

    while time.time() - start_time < MAX_WAIT_SECONDS:
        all_services_ok = True
        for name, url in SERVICES.items():
            if not services_status[name]:  # Só verifica se ainda não estiver OK
                if check_service(name, url):
                    print(f"- {name}: OK")
                    services_status[name] = True
                else:
                    all_services_ok = False
        
        if all_services_ok:
            print("=" * 50)
            print("Todos os servicos estao funcionando!")
            sys.exit(0)

        # Imprime o status atual para dar feedback
        current_status = " | ".join([f"{name}: {'OK' if status else 'FAIL'}" for name, status in services_status.items()])
        print(f"Status: {current_status}", end="\r")
        time.sleep(RETRY_INTERVAL_SECONDS)

    print("\n" + "=" * 50)
    print("Tempo de espera esgotado. Alguns servicos nao responderam:")
    for name, status in services_status.items():
        if not status:
            print(f"  - {name}")
    
    print("\nExecute './run_all.sh' para iniciar todos os servicos manualmente.")
    sys.exit(1)

if __name__ == "__main__":
    main()