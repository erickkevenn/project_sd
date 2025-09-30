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

# Imports gRPC (opcionais)
try:
    import grpc
    from google.protobuf.json_format import MessageToDict, ParseDict
    GRPC_AVAILABLE = True
except ImportError:
    GRPC_AVAILABLE = False
    grpc = None

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

class GrpcClient:
    """Cliente para comunicação gRPC com microserviços"""
    
    def __init__(self):
        self.config = get_config()
        self.channels = {}
        self.stubs = {}
        
        if not GRPC_AVAILABLE:
            logger.info("gRPC não está disponível. Para usar gRPC, instale: pip install -r requirements-grpc.txt")
            return
            
        if not hasattr(self.config, 'GRPC_ENABLED') or not self.config.GRPC_ENABLED:
            logger.info("gRPC está desabilitado na configuração.")
            return
            
        try:
            self._initialize_channels()
        except Exception as e:
            logger.warning(f"Falha ao inicializar gRPC: {str(e)}")
    
    def _initialize_channels(self):
        """Inicializa canais gRPC para os serviços configurados"""
        if not GRPC_AVAILABLE or not hasattr(self.config, 'GRPC_ENABLED') or not self.config.GRPC_ENABLED:
            return
            
        if not hasattr(self.config, 'GRPC_SERVICES'):
            logger.warning("GRPC_SERVICES não configurado")
            return
            
        for service_name, address in self.config.GRPC_SERVICES.items():
            try:
                # Cria canal gRPC
                channel = grpc.insecure_channel(address)
                self.channels[service_name] = channel
                
                # Verifica conectividade
                grpc.channel_ready_future(channel).result(timeout=2)
                logger.info(f"Canal gRPC conectado para {service_name}: {address}")
                
            except Exception as e:
                logger.warning(f"Falha ao conectar gRPC {service_name}: {str(e)}")
    
    def is_available(self, service_name: str = None) -> bool:
        """Verifica se gRPC está disponível"""
        if not GRPC_AVAILABLE:
            return False
            
        if not hasattr(self.config, 'GRPC_ENABLED') or not self.config.GRPC_ENABLED:
            return False
            
        if service_name:
            return service_name in self.channels
            
        return len(self.channels) > 0
    
    def call_service(self, service_name: str, method_name: str, request_data: Dict[str, Any]) -> Tuple[Dict, int]:
        """
        Chama um método gRPC de um serviço
        
        Args:
            service_name: Nome do serviço
            method_name: Nome do método gRPC
            request_data: Dados da requisição
            
        Returns:
            Tuple com resposta JSON e status code
        """
        if not self.is_available(service_name):
            raise ServiceUnavailableError(service_name, {"reason": "gRPC not available"})
        
        try:
            channel = self.channels[service_name]
            
            # Exemplo simples de chamada gRPC
            # Em uma implementação real, você teria stubs específicos para cada serviço
            logger.info(f"Chamando gRPC {service_name}.{method_name} com dados: {request_data}")
            
            # Simula uma resposta gRPC bem-sucedida
            response_data = {
                "grpc_service": service_name,
                "grpc_method": method_name,
                "request_data": request_data,
                "status": "success",
                "message": "gRPC call completed successfully"
            }
            
            return response_data, 200
            
        except grpc.RpcError as e:
            logger.error(f"Erro gRPC {service_name}.{method_name}: {e.code()} - {e.details()}")
            raise ServiceUnavailableError(service_name, {
                "grpc_error": str(e.code()),
                "details": e.details()
            })
            
        except Exception as e:
            logger.error(f"Erro inesperado gRPC {service_name}.{method_name}: {str(e)}")
            raise ServiceUnavailableError(service_name, {"error": str(e)})
    
    def close_channels(self):
        """Fecha todos os canais gRPC"""
        for service_name, channel in self.channels.items():
            try:
                channel.close()
                logger.info(f"Canal gRPC fechado para {service_name}")
            except Exception as e:
                logger.warning(f"Erro ao fechar canal gRPC {service_name}: {str(e)}")
        
        self.channels.clear()
        self.stubs.clear()
    
    def __del__(self):
        """Destructor para limpar recursos"""
        self.close_channels()
