"""
Serviços e utilitários para comunicação com microserviços
"""

import requests
import uuid
from typing import Dict, Any, Optional, Tuple
from flask import request, jsonify
import logging

from config import get_config
from exceptions import ServiceUnavailableError, ServiceTimeoutError
from security import sanitize_input, log_security_event

logger = logging.getLogger(__name__)
config = get_config()

class ServiceClient:
    """Cliente para comunicação com microserviços"""
    
    def __init__(self):
        self.services = config.SERVICES
        self.timeout = config.REQUEST_TIMEOUT
    
    def _get_correlation_id(self) -> str:
        """Gera ou obtém correlation ID"""
        return request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    
    def _prepare_headers(self) -> Dict[str, str]:
        """Prepara headers para requisição"""
        headers = {"X-Correlation-ID": self._get_correlation_id()}
        
        # Propaga token de autorização
        if "Authorization" in request.headers:
            headers["Authorization"] = request.headers["Authorization"]
        
        return headers
    
    def _sanitize_data(self, data: Any) -> Any:
        """Sanitiza dados de entrada"""
        if data is None:
            return None
        return sanitize_input(data)
    
    def forward_request(
        self, 
        service_name: str, 
        method: str, 
        path: str, 
        json_body: Optional[Dict] = None, 
        params: Optional[Dict] = None
    ) -> Tuple[Dict, int]:
        """
        Encaminha requisição para microserviço
        
        Args:
            service_name: Nome do serviço
            method: Método HTTP
            path: Caminho da requisição
            json_body: Corpo da requisição JSON
            params: Parâmetros da query string
            
        Returns:
            Tuple com resposta JSON e status code
            
        Raises:
            ServiceUnavailableError: Quando serviço não está disponível
            ServiceTimeoutError: Quando há timeout na requisição
        """
        if service_name not in self.services:
            raise ServiceUnavailableError(service_name, {"reason": "Service not configured"})
        
        base_url = self.services[service_name]
        url = f"{base_url}{path}"
        headers = self._prepare_headers()
        
        # Sanitiza dados de entrada
        json_body = self._sanitize_data(json_body)
        params = self._sanitize_data(params)
        
        try:
            logger.info(f"Forwarding {method} request to {service_name}: {url}")
            
            response = requests.request(
                method=method,
                url=url,
                json=json_body,
                params=params,
                headers=headers,
                timeout=self.timeout
            )
            
            logger.info(f"Response from {service_name}: {response.status_code}")
            
            # Tenta parsear JSON, se falhar retorna texto
            try:
                response_data = response.json()
            except ValueError:
                response_data = {"message": response.text}
            
            return response_data, response.status_code
            
        except requests.exceptions.Timeout:
            log_security_event("SERVICE_TIMEOUT", f"Timeout calling {service_name}")
            raise ServiceTimeoutError(service_name, {"url": url, "timeout": self.timeout})
            
        except requests.exceptions.ConnectionError:
            log_security_event("SERVICE_CONNECTION_ERROR", f"Connection error to {service_name}")
            raise ServiceUnavailableError(service_name, {"url": url, "reason": "Connection failed"})
            
        except Exception as e:
            log_security_event("SERVICE_ERROR", f"Error calling {service_name}: {str(e)}")
            raise ServiceUnavailableError(service_name, {"url": url, "reason": str(e)})

class HealthChecker:
    """Verificador de saúde dos serviços"""
    
    def __init__(self, service_client: ServiceClient):
        self.service_client = service_client
    
    def check_service_health(self, service_name: str) -> Dict[str, Any]:
        """Verifica saúde de um serviço específico"""
        try:
            response_data, status_code = self.service_client.forward_request(
                service_name, "GET", "/health"
            )
            
            return {
                "service": service_name,
                "status": "healthy" if status_code == 200 else "unhealthy",
                "status_code": status_code,
                "response": response_data
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
        
        for service_name in self.service_client.services.keys():
            health_info = self.check_service_health(service_name)
            results[service_name] = health_info
            
            if health_info["status"] != "healthy":
                overall_healthy = False
        
        return {
            "status": "healthy" if overall_healthy else "degraded",
            "services": results,
            "timestamp": uuid.uuid4().hex
        }
