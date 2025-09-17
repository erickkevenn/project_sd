"""
Exceções customizadas para o API Gateway
"""

class GatewayException(Exception):
    """Exceção base do Gateway"""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

class AuthenticationError(GatewayException):
    """Erro de autenticação"""
    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(message, 401, details)

class AuthorizationError(GatewayException):
    """Erro de autorização"""
    def __init__(self, message: str = "Access denied", details: dict = None):
        super().__init__(message, 403, details)

class ValidationError(GatewayException):
    """Erro de validação"""
    def __init__(self, message: str = "Validation failed", details: dict = None):
        super().__init__(message, 400, details)

class ServiceUnavailableError(GatewayException):
    """Erro de serviço indisponível"""
    def __init__(self, service_name: str, details: dict = None):
        message = f"{service_name} service is unavailable"
        super().__init__(message, 502, details)

class ServiceTimeoutError(GatewayException):
    """Erro de timeout do serviço"""
    def __init__(self, service_name: str, details: dict = None):
        message = f"{service_name} service timeout"
        super().__init__(message, 504, details)

class RateLimitExceededError(GatewayException):
    """Erro de rate limit excedido"""
    def __init__(self, message: str = "Rate limit exceeded", details: dict = None):
        super().__init__(message, 429, details)
