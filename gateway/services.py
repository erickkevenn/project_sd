"""
Serviços e utilitários para comunicação com microserviços
"""

import requests
import uuid
from typing import Dict, Any
import logging

from config import get_config

logger = logging.getLogger(__name__)
config = get_config()

class ServiceClient:
    """Cliente para comunicação com microserviços"""
    
    def __init__(self):
        self.services = config.SERVICES
        self.timeout = config.REQUEST_TIMEOUT

    def forward_request(self, service_name: str, method: str, path: str, 
                       json_body: Dict = None, params: Dict = None, 
                       headers: Dict = None) -> tuple:
        """Encaminha requisição para um microserviço"""
        try:
            url = f"{self.services[service_name]}{path}"
            
            # Headers padrão
            default_headers = {}
            if headers:
                default_headers.update(headers)
            
            response = requests.request(
                method,
                url,
                json=json_body,
                params=params,
                headers=default_headers,
                timeout=self.timeout
            )
            
            return response.json(), response.status_code
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling {service_name}: {str(e)}")
            return {"error": f"Error calling {service_name}"}, 503

class HealthChecker:
    """Verificador de saúde dos serviços"""
    
    def __init__(self):
        self.services = config.SERVICES
        self.timeout = config.REQUEST_TIMEOUT

    def check_service_health(self, service_name: str) -> Dict[str, Any]:
        """Verifica saúde de um serviço específico"""
        try:
            url = f"{self.services[service_name]}/health"
            response = requests.get(url, timeout=self.timeout)
            
            return {
                "service": service_name,
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "status_code": response.status_code,
                "response": response.json()
            }
        except Exception as e:
            return {
                "service": service_name,
                "status": "unhealthy",
                "error": str(e)
            }
    
    def check_all_services(self) -> Dict[str, Any]:
        """Verifica saúde de todos os serviços"""
        results = {}
        overall_healthy = True
        
        for service_name in self.services.keys():
            health_info = self.check_service_health(service_name)
            results[service_name] = health_info
            
            if health_info["status"] != "healthy":
                overall_healthy = False
        
        return {
            "status": "healthy" if overall_healthy else "degraded",
            "services": results,
            "timestamp": uuid.uuid4().hex
        }