# Plataforma de Orquestração Jurídica - SOA + Flask

## Visão Geral

Protótipo de coordenação e orquestração de tarefas jurídicas (documentos, prazos e audiências) usando API Gateway em Flask e microserviços. Este projeto implementa uma arquitetura orientada a serviços (SOA) com foco em segurança, escalabilidade e manutenibilidade.

## Arquitetura

### Diagrama de Componentes

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend UI   │    │   API Gateway    │
│                 │◄──►│   (Flask)        │
│  gateway_ui.html│    │  - Autenticação  │
└─────────────────┘    │  - Autorização   │
                       │  - Rate Limiting │
                       │  - Validação     │
                       │  - Orquestração  │
                       └─────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──────┐ ┌───▼──────┐ ┌──▼─────────┐
            │ Documentos   │ │  Prazos  │ │ Audiências │
            │ Service      │ │ Service  │ │ Service    │
            │ :5001        │ │ :5002    │ │ :5003      │
            └──────────────┘ └──────────┘ └────────────┘
```

### Diagrama de Implantação

```
┌─────────────────────────────────────────────────────────┐
│                    Ambiente de Produção                 │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Nginx     │  │   Redis     │  │  Database   │     │
│  │ (Proxy/SSL) │  │ (Rate Limit)│  │ (PostgreSQL)│     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │API Gateway  │  │ Documentos  │  │   Prazos    │     │
│  │   :8000     │  │   :5001     │  │   :5002     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Audiências  │  │   Logging   │  │ Monitoring  │     │
│  │   :5003     │  │ (ELK Stack) │  │(Prometheus) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Mapeamento dos Serviços

### API Gateway / Orquestrador
- **Função**: Ponto único de entrada, roteamento e agregação
- **Porta**: 8000
- **Responsabilidades**:
  - Autenticação e autorização
  - Rate limiting e throttling
  - Validação de entrada
  - Roteamento para microserviços
  - Orquestração de operações complexas
  - Logging e auditoria

### Serviço de Documentos
- **Função**: CRUD simplificado de peças jurídicas
- **Porta**: 5001
- **Endpoints**: `/documents`

### Serviço de Prazos
- **Função**: Registro e consulta de prazos (inclui `/today`)
- **Porta**: 5002
- **Endpoints**: `/deadlines`, `/deadlines/today`

### Serviço de Audiências
- **Função**: Agendamento e listagem (filtro por data)
- **Porta**: 5003
- **Endpoints**: `/hearings`

## Aspectos de Segurança Implementados

### 1. Autenticação JWT

**Por quê**: Identificar o chamador e habilitar auditoria de forma stateless e escalável.

**Como implementado**:
- Tokens JWT com expiração configurável (24h padrão)
- Algoritmo HS256 para assinatura
- Claims incluem: username, roles, permissions, exp, iat, jti
- Endpoint `/api/auth/login` para obtenção de token
- Decorator `@require_auth` para proteger endpoints

**Exemplo de uso**:
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Usar token
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/documents
```

### 2. Autorização RBAC (Role-Based Access Control)

**Por quê**: Restringir ações por papel (ex.: estagiário vs sócio).

**Como implementado**:
- Sistema de roles: `admin`, `lawyer`, `user`
- Sistema de permissions: `read`, `write`, `delete`, `orchestrate`
- Decorators `@require_role()` e `@require_permission()`
- Usuários pré-configurados com diferentes níveis de acesso

**Roles e Permissões**:
- **Admin**: Todas as permissões
- **Lawyer**: read, write, orchestrate
- **Intern**: apenas read

### 3. Rate Limiting / Throttling

**Por quê**: Mitigar abuso e ataques DoS.

**Como implementado**:
- Flask-Limiter com limites por IP
- Limites globais: 200/dia, 50/hora
- Limites específicos por endpoint:
  - Login: 5/minuto
  - Leitura: 30/minuto
  - Escrita: 10/minuto
  - Orquestração: 5/minuto

### 4. Validação de Entrada

**Por quê**: Bloquear inputs malformados/hostis.

**Como implementado**:
- Marshmallow schemas para validação estruturada
- Sanitização de entrada removendo caracteres perigosos
- Decorator `@validate_json()` para validação automática
- Schemas específicos: DocumentSchema, DeadlineSchema, HearingSchema

### 5. Security Headers

**Por quê**: Reforçar políticas do navegador (HSTS, CSP, etc.).

**Como implementado**:
- Flask-Talisman para headers de segurança
- Content Security Policy (CSP) configurada
- Headers anti-clickjacking e MIME-sniffing
- HTTPS enforcement (desabilitado em desenvolvimento)

### 6. CORS Configurado

**Por quê**: Controlar quais origens podem acessar a API.

**Como implementado**:
- Origins permitidas configuráveis via variável de ambiente
- Headers específicos permitidos
- Métodos HTTP controlados
- Configuração diferenciada por endpoint

### 7. Logging e Auditoria

**Por quê**: Rastreabilidade e detecção de incidentes.

**Como implementado**:
- Logs estruturados com timestamp, IP, user-agent
- Eventos de segurança específicos:
  - LOGIN_SUCCESS/FAILED
  - RATE_LIMIT_EXCEEDED
  - ORCHESTRATION_SUCCESS/FAILED
  - SERVICE_TIMEOUT/ERROR
- Correlation ID para rastreamento ponta a ponta

### 8. Sanitização de Dados

**Por quê**: Prevenir ataques de injeção e XSS.

**Como implementado**:
- Função `sanitize_input()` remove caracteres perigosos
- Aplicada automaticamente em todos os forwards
- Sanitização recursiva para objetos e arrays

### 9. Gestão de Segredos

**Por quê**: Rotação e segurança; nada de segredo no código.

**Como implementado**:
- Variáveis de ambiente para todas as configurações sensíveis
- Arquivo `env.example` com template de configuração
- Chaves JWT e secrets configuráveis
- Senhas hasheadas com SHA-256

### 10. Timeouts e Tratamento de Erro

**Por quê**: Evitar travar o cliente; respostas consistentes.

**Como implementado**:
- Timeout de 5 segundos para chamadas de serviço
- Error handlers específicos (404, 429, 500)
- Respostas de erro padronizadas
- Logging de erros para análise

## Endpoints do API Gateway

### Autenticação
- `POST /api/auth/login` - Login e obtenção de token
- `GET /api/auth/me` - Informações do usuário atual

### Documentos
- `GET /api/documents` - Listar documentos (requer: read)
- `POST /api/documents` - Criar documento (requer: write)
- `GET /api/documents/{id}` - Obter documento específico (requer: read)

### Prazos
- `GET /api/deadlines` - Listar prazos (requer: read)
- `POST /api/deadlines` - Criar prazo (requer: write)
- `GET /api/deadlines/today` - Prazos de hoje (requer: read)

### Audiências
- `GET /api/hearings` - Listar audiências (requer: read)
- `POST /api/hearings` - Criar audiência (requer: write)

### Orquestração
- `GET /api/process/{id}/summary` - Resumo do processo (requer: read)
- `POST /api/orchestrate/file-case` - Criar caso completo (requer: orchestrate)

### Utilitários
- `GET /health` - Status do gateway e serviços
- `GET /ui` - Interface de teste
- `POST /api/seed` - Popular dados de exemplo (apenas desenvolvimento)

## Instalação e Execução

### Pré-requisitos
- Python 3.10+
- pip atualizado

### Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd project_sd

# Criar ambiente virtual
python -m venv .venv

# Ativar ambiente virtual
# Linux/macOS:
source .venv/bin/activate
# Windows:
.\.venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente (opcional)
cp env.example .env
# Editar .env conforme necessário
```

### Execução

```bash
# Linux/macOS/WSL:
bash run_all.sh

# Windows (PowerShell):
./run_all.ps1
```

### Acesso
- **UI de testes**: http://127.0.0.1:8000/ui
- **API Gateway**: http://127.0.0.1:8000
- **Health Check**: http://127.0.0.1:8000/health

### Usuários de Teste

| Username | Password | Roles | Permissions |
|----------|----------|-------|-------------|
| admin | admin123 | admin, lawyer, user | read, write, delete, orchestrate |
| lawyer | lawyer123 | lawyer, user | read, write, orchestrate |
| intern | intern123 | user | read |

## Testes

### Testes Automatizados
```bash
# Com os serviços rodando
pytest -q

# Teste específico
python -m pytest tests/test_integration.py -v
```

### Teste Manual com cURL

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | \
  jq -r '.token')

# 2. Criar documento
curl -X POST http://localhost:8000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Teste", "content": "Conteúdo", "author": "Admin"}'

# 3. Listar documentos
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/documents
```

## Considerações para Produção

### Segurança Adicional Recomendada

1. **HTTPS/TLS**
   - Certificados SSL/TLS válidos
   - Redirect HTTP → HTTPS
   - HSTS headers habilitados

2. **Banco de Dados**
   - Substituir usuários em memória por banco de dados
   - Senhas com bcrypt/scrypt (mais seguro que SHA-256)
   - Rotação de chaves JWT

3. **Infraestrutura**
   - WAF (Web Application Firewall)
   - DDoS protection
   - Network segmentation
   - Container security

4. **Monitoring**
   - SIEM integration
   - Alertas de segurança
   - Métricas de performance
   - Health checks avançados

5. **Rate Limiting Avançado**
   - Redis para storage distribuído
   - Rate limiting por usuário
   - Adaptive rate limiting

### Configurações de Produção

```bash
# Variáveis de ambiente para produção
FLASK_ENV=production
SECRET_KEY=<strong-random-key>
JWT_SECRET_KEY=<strong-random-jwt-key>
ALLOWED_ORIGINS=https://yourdomain.com
RATELIMIT_STORAGE_URL=redis://redis:6379
```

## Estrutura do Projeto

```
project_sd/
├── gateway/
│   ├── app.py              # API Gateway principal
│   └── security.py         # Módulo de segurança
├── services/
│   ├── documents_service.py
│   ├── deadlines_service.py
│   └── hearings_service.py
├── ui/
│   └── gateway_ui.html     # Interface de teste
├── tests/
│   ├── test_integration.py
│   ├── smoke.http
│   └── SOA-Gateway.postman_collection.json
├── requirements.txt        # Dependências Python
├── env.example            # Template de configuração
├── run_all.sh             # Script de execução (Linux/macOS)
├── run_all.ps1            # Script de execução (Windows)
└── README.md              # Documentação básica
```

## Conclusão

Esta implementação demonstra uma arquitetura SOA robusta com foco em segurança, implementando as principais práticas recomendadas para APIs em produção. O middleware API Gateway atua como um ponto central de controle, fornecendo autenticação, autorização, rate limiting, validação e orquestração de serviços.

Os aspectos de segurança implementados cobrem as principais vulnerabilidades identificadas no OWASP Top 10 e fornecem uma base sólida para expansão e evolução do sistema em ambiente de produção.
