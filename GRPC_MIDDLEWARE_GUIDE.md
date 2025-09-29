# Guia do Middleware gRPC - API Gateway

## Visão Geral

Este documento explica a implementação do middleware gRPC no API Gateway da Plataforma de Orquestração Jurídica. O middleware permite que o gateway suporte tanto comunicação HTTP tradicional quanto gRPC, oferecendo flexibilidade e melhor performance para comunicação entre microserviços.

## Arquitetura

### Componentes Implementados

1. **Configuração gRPC** (`gateway/config.py`)
2. **Cliente gRPC** (`gateway/services.py`)
3. **Middleware gRPC** (`gateway/middleware.py`)
4. **Integração nas Rotas** (`gateway/app.py`)

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Habilitar/desabilitar gRPC
GRPC_ENABLED=true

# URLs dos serviços gRPC
DOCUMENTS_GRPC_URL=127.0.0.1:50001
DEADLINES_GRPC_URL=127.0.0.1:50002
HEARINGS_GRPC_URL=127.0.0.1:50003

# Timeout para chamadas gRPC (em segundos)
GRPC_TIMEOUT=5
```

### Dependências

As dependências gRPC são **opcionais** e estão em arquivo separado:

```bash
# Instalar dependências básicas (sempre necessário)
pip install -r requirements.txt

# Instalar dependências gRPC (opcional)
pip install -r requirements-grpc.txt
```

**Nota para Windows**: Se houver problemas de compilação, tente:
```bash
pip install --only-binary=grpcio grpcio grpcio-tools protobuf
```

## Como Funciona

### 1. Middleware de Detecção

O middleware intercepta requisições HTTP e verifica se o cliente prefere usar gRPC através de:

- **Header personalizado**: `X-Prefer-Protocol: grpc`
- **Parâmetro de query**: `?protocol=grpc`

### 2. Seleção Automática de Protocolo

O decorator `@protocol_selector()` permite que as rotas automaticamente escolham entre HTTP e gRPC baseado na preferência do cliente.

### 3. Fallback Inteligente

Se gRPC não estiver disponível ou falhar, o sistema automaticamente faz fallback para HTTP.

## Uso Prático

### Verificar Status do gRPC

```bash
GET /health
```

Resposta (inclui informações gRPC):
```json
{
  "status": "healthy",
  "services": { ... },
  "grpc": {
    "status": "available",
    "services": ["documents", "deadlines", "hearings"]
  }
}
```

### Usar gRPC em Requisições

#### Método 1: Header HTTP
```bash
curl -H "X-Prefer-Protocol: grpc" \
     -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/documents
```

#### Método 2: Parâmetro de Query
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/documents?protocol=grpc
```

### Rotas com Suporte gRPC

As rotas existentes do sistema agora suportam gRPC automaticamente:

1. **Documentos**: `GET/POST /api/documents`
2. **Health Check**: `GET /health` (inclui status gRPC)

Para usar gRPC, adicione o header `X-Prefer-Protocol: grpc` ou parâmetro `?protocol=grpc`

## Headers de Resposta

O middleware adiciona headers informativos:

- `X-Protocol-Used`: Indica se foi usado `http` ou `grpc`
- `X-GRPC-Status`: Indica se gRPC está `available` ou `unavailable`

## Exemplo de Implementação

### Cliente gRPC Simples

```python
from gateway.services import GrpcClient

# Inicializar cliente
grpc_client = GrpcClient()

# Verificar disponibilidade
if grpc_client.is_available('documents'):
    # Fazer chamada gRPC
    response, status = grpc_client.call_service(
        'documents', 
        'ListItems', 
        {'limit': 10, 'offset': 0}
    )
```

### Rota com Suporte Híbrido

```python
@app.get("/api/hybrid/documents")
@require_auth
@protocol_selector()
def hybrid_documents():
    if getattr(request, 'prefer_grpc', False) and grpc_client.is_available('documents'):
        # Usar gRPC
        return grpc_client.call_service('documents', 'ListItems', {})
    else:
        # Usar HTTP
        return service_client.forward_request('documents', 'GET', '/documents')
```

## Vantagens da Implementação

### 1. **Flexibilidade**
- Suporte a ambos os protocolos (HTTP/gRPC)
- Fallback automático para HTTP
- Configuração via variáveis de ambiente

### 2. **Performance**
- gRPC oferece melhor performance para comunicação entre serviços
- Serialização binária mais eficiente
- Multiplexing de conexões

### 3. **Compatibilidade**
- Mantém compatibilidade com clientes HTTP existentes
- Transição gradual para gRPC
- Não quebra APIs existentes

### 4. **Observabilidade**
- Headers informativos sobre protocolo usado
- Logs detalhados de chamadas gRPC
- Status de saúde dos serviços gRPC

## Limitações Atuais

### 1. **Implementação Simplificada**
- Cliente gRPC atual é uma demonstração
- Não inclui stubs reais dos serviços
- Respostas simuladas para fins de exemplo

### 2. **Sem Autenticação gRPC Nativa**
- Autenticação ainda é feita via HTTP headers
- Não implementa autenticação gRPC nativa

### 3. **Configuração Manual**
- Serviços gRPC precisam ser configurados manualmente
- Não há descoberta automática de serviços

## Próximos Passos

### Para Produção

1. **Implementar Stubs Reais**
   ```bash
   # Gerar código Python dos .proto files
   python -m grpc_tools.protoc --python_out=. --grpc_python_out=. simple_service.proto
   ```

2. **Adicionar Autenticação gRPC**
   - Implementar interceptors de autenticação
   - Suporte a JWT em metadata gRPC

3. **Melhorar Error Handling**
   - Mapeamento de códigos de erro gRPC para HTTP
   - Retry automático com backoff

4. **Implementar Health Checks gRPC**
   - Usar protocolo padrão de health check gRPC
   - Integrar com health checker existente

### Exemplo de Uso Completo

```bash
# 1. Instalar dependências básicas
pip install -r requirements.txt

# 2. (Opcional) Instalar gRPC se quiser usar
pip install -r requirements-grpc.txt

# 3. Configurar variáveis de ambiente (se usar gRPC)
export GRPC_ENABLED=true
export DOCUMENTS_GRPC_URL=127.0.0.1:50001

# 4. Iniciar gateway
python gateway/app.py

# 5. Testar (funciona com ou sem gRPC)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/documents

# 6. Testar com gRPC (se instalado)
curl -H "X-Prefer-Protocol: grpc" -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/documents
```

## Conclusão

Esta implementação fornece uma base sólida para suporte gRPC no API Gateway, mantendo compatibilidade com HTTP e oferecendo transição gradual. A arquitetura é extensível e permite evolução para um sistema de produção completo.

Para dúvidas ou melhorias, consulte o código fonte nos arquivos mencionados neste guia.
