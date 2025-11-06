# RELATÓRIO COMPLETO DO PROJETO - JurisFlow
## Plataforma de Orquestração Jurídica - Arquitetura SOA + Flask

**Data de Análise:** 06/11/2025  
**Versão do Sistema:** 1.0.0  
**Ambiente:** Desenvolvimento/Produção

---

## 📋 SUMÁRIO EXECUTIVO

### Visão Geral
O **JurisFlow** é uma plataforma completa de gestão jurídica baseada em **Arquitetura Orientada a Serviços (SOA)**, desenvolvida com Flask e Python. O sistema implementa uma solução moderna para escritórios de advocacia, coordenando e orquestrando tarefas jurídicas através de microserviços independentes e especializados.

### Objetivos Principais
1. **Orquestração** - Coordenar criação e consulta de itens jurídicos via API Gateway
2. **Controle de Acesso** - Sistema RBAC (Role-Based Access Control) com JWT
3. **Separação de Responsabilidades** - Microserviços independentes e especializados
4. **Multi-tenancy** - Suporte a múltiplos escritórios isolados
5. **Segurança Enterprise** - Autenticação, autorização, rate limiting e auditoria

---

## 🏗️ ARQUITETURA DO SISTEMA

### Modelo de Arquitetura: SOA (Service-Oriented Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (UI)                           │
│              HTML5 + CSS3 + JavaScript ES6+                     │
│              Landing Page + Sistema Principal                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ HTTP/REST + JWT
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API GATEWAY (Porta 8000)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Autenticação JWT                                       │  │
│  │ • RBAC (Roles & Permissions)                             │  │
│  │ • Rate Limiting                                          │  │
│  │ • Validação de Input (Marshmallow)                       │  │
│  │ • Security Headers (CORS, CSP, HSTS)                     │  │
│  │ • Orquestração de Serviços                               │  │
│  │ • Health Checking                                         │  │
│  │ • Logging e Auditoria                                     │  │
│  │ • Suporte gRPC (Opcional)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────┬───────────────────────────────┬───────────────────┘
              │                               │
              │ HTTP/REST                     │ gRPC (Opcional)
              │                               │
    ┌─────────┴─────────┬─────────┬──────────┴──────────┬─────────┐
    │                   │         │                     │         │
    ▼                   ▼         ▼                     ▼         ▼
┌─────────┐      ┌─────────┐  ┌─────────┐      ┌──────────┐  ┌──────────┐
│  Auth   │      │Documents│  │Processes│      │Deadlines │  │ Hearings │
│ Service │      │ Service │  │ Service │      │ Service  │  │ Service  │
│(5004)   │      │ (5001)  │  │ (5005)  │      │ (5002)   │  │ (5003)   │
└────┬────┘      └────┬────┘  └────┬────┘      └────┬─────┘  └────┬─────┘
     │                │             │                 │             │
     ▼                ▼             ▼                 ▼             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADA DE PERSISTÊNCIA                           │
│              JSON Files (users.json, offices.json,                  │
│              processes.json, documents, deadlines, hearings)        │
└─────────────────────────────────────────────────────────────────────┘
```

### Componentes Principais

#### 1. **API Gateway** (Porta 8000)
- **Localização:** `gateway/app.py`
- **Função:** Ponto único de entrada para todas as requisições
- **Responsabilidades:**
  - Roteamento de requisições
  - Autenticação e autorização
  - Validação de dados
  - Orquestração de serviços
  - Rate limiting
  - Security headers
  - Logging e auditoria
  - Health checking

#### 2. **Serviço de Autenticação** (Porta 5004)
- **Localização:** `services/auth/app.py`
- **Função:** Gerenciamento de usuários e escritórios
- **Responsabilidades:**
  - Login por e-mail
  - Registro de usuários e escritórios
  - Validação de credenciais
  - Gestão de papéis e permissões
  - Multi-tenancy (office_id)

#### 3. **Serviço de Processos** (Porta 5005)
- **Localização:** `services/processes/app.py`
- **Função:** Gerenciamento de processos jurídicos
- **Responsabilidades:**
  - CRUD de processos
  - Numeração única (PROC-XXX)
  - Busca por número do processo
  - Isolamento por escritório

#### 4. **Serviço de Documentos** (Porta 5001)
- **Localização:** `services/documents_service.py`
- **Função:** Gerenciamento de documentos jurídicos
- **Responsabilidades:**
  - CRUD de documentos
  - Vinculação com processos
  - Controle de versão (timestamps)
  - Busca e filtros

#### 5. **Serviço de Prazos** (Porta 5002)
- **Localização:** `services/deadlines_service.py`
- **Função:** Gerenciamento de prazos processuais
- **Responsabilidades:**
  - CRUD de prazos
  - Vinculação com processos
  - Consulta de prazos por data
  - Alertas de prazos de hoje

#### 6. **Serviço de Audiências** (Porta 5003)
- **Localização:** `services/hearings_service.py`
- **Função:** Gerenciamento de audiências
- **Responsabilidades:**
  - CRUD de audiências
  - Vinculação com processos
  - Gestão de salas
  - Consulta por data

---

## 🔐 SISTEMA DE SEGURANÇA

### Autenticação JWT

#### Fluxo de Autenticação
1. Cliente envia credenciais (email + senha) para `/api/auth/login`
2. Gateway valida credenciais com Auth Service
3. Gateway emite JWT contendo:
   - Email do usuário
   - Roles (papéis)
   - Permissions (permissões)
   - Office ID (escritório)
   - Nome e tipo de usuário
4. Cliente inclui JWT em todas as requisições no header `Authorization: Bearer <token>`
5. Gateway valida JWT em cada requisição

#### Estrutura do Token JWT
```json
{
  "email": "admin@admin.com",
  "roles": ["admin", "advogado", "user"],
  "permissions": ["read", "write", "delete", "orchestrate", "create_user"],
  "office_id": "office-123",
  "name": "Administrador",
  "user_type": "admin",
  "exp": 1699142400
}
```

### Sistema RBAC (Role-Based Access Control)

#### Domínios e Tipos de Usuário

O sistema detecta automaticamente o tipo de usuário pelo **domínio do e-mail**:

| Domínio | Tipo | Roles | Permissions |
|---------|------|-------|-------------|
| @admin.com | admin | admin, advogado, user | read, write, delete, orchestrate, create_user |
| @advogado.com | advogado | advogado, user | read, write, orchestrate |
| @estagiario.com | estagiario | estagiario, user | read |

#### Decoradores de Segurança

```python
@require_auth                    # Exige JWT válido
@require_permission("write")     # Exige permissão específica
@require_role("admin")           # Exige papel específico
@validate_json(Schema)           # Valida JSON com schema Marshmallow
```

### Usuários de Desenvolvimento (Seed)

```python
# Admin completo
Email: admin@admin.com
Senha: admin123
Acesso: TOTAL

# Advogado
Email: advogado@advogado.com
Senha: lawyer123
Acesso: Leitura, Escrita, Orquestração

# Estagiário
Email: estagiario@estagiario.com
Senha: intern123
Acesso: Somente Leitura
```

### Medidas de Segurança Implementadas

1. **Rate Limiting**
   - Login: 100 requisições/minuto
   - Leitura: 30 requisições/minuto
   - Escrita: 10 requisições/minuto
   - Global: 10.000/dia, 1.000/hora, 200/minuto

2. **Security Headers**
   - Content-Security-Policy (CSP)
   - HTTP Strict Transport Security (HSTS)
   - X-Frame-Options (anti-clickjacking)
   - X-Content-Type-Options
   - X-XSS-Protection

3. **Validação de Entrada**
   - Marshmallow schemas
   - Sanitização de strings
   - Validação de tipos
   - Campos obrigatórios

4. **Auditoria e Logging**
   - Log de eventos de segurança
   - Registro de IP e user agent
   - Correlation IDs para rastreamento
   - Logs estruturados

5. **Multi-tenancy**
   - Isolamento por office_id
   - Header X-Office-ID propagado
   - Filtros automáticos por escritório

---

## 📡 API REST - ENDPOINTS

### Autenticação e Usuários

#### POST /api/auth/register
Cadastro de usuário e escritório
```json
Request:
{
  "email": "novousuario@advogado.com",
  "password": "senha123",
  "name": "Nome do Usuário",
  "office_name": "Escritório Exemplo",
  "cnpj": "12345678000190",
  "responsible_name": "Responsável",
  "oab_number": "OAB/SP 123456",
  "phone": "(11) 99999-9999",
  "accept_terms": true
}

Response: 200 OK
{
  "user": { ... },
  "office": { ... },
  "message": "Registration successful"
}
```

#### POST /api/auth/login
Login e emissão de JWT
```json
Request:
{
  "email": "admin@admin.com",
  "password": "admin123"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "admin@admin.com",
    "name": "Administrador",
    "roles": ["admin", "advogado", "user"],
    "permissions": ["read", "write", "delete", "orchestrate"],
    "office_id": "office-123",
    "user_type": "admin"
  }
}
```

#### GET /api/auth/me
Informações do usuário autenticado
```json
Response: 200 OK
{
  "user": {
    "email": "admin@admin.com",
    "name": "Administrador",
    "roles": ["admin"],
    "permissions": ["read", "write", "delete"],
    "office_id": "office-123",
    "office": "Escritório Exemplo"
  }
}
```

#### POST /api/users
Criação de usuário pelo admin
```json
Request:
{
  "email": "novo@advogado.com",
  "password": "senha123",
  "name": "Novo Usuário"
}

Response: 201 Created
{
  "user": { ... },
  "message": "User created successfully"
}
```

### Processos

#### GET /api/processes
Lista todos os processos (filtrados por escritório)
```json
Response: 200 OK
[
  {
    "id": "abc123",
    "number": "PROC-001",
    "title": "Ação Trabalhista",
    "description": "Descrição do processo",
    "status": "open",
    "office_id": "office-123",
    "created_at": "2025-11-06T00:00:00Z"
  }
]
```

#### POST /api/processes
Cria novo processo
```json
Request:
{
  "number": "PROC-001",
  "title": "Ação Trabalhista",
  "description": "Descrição",
  "status": "open"
}

Response: 201 Created
{ ... }
```

#### GET /api/processes/by-number/{PROC-XXX}
Busca processo por número
```json
Response: 200 OK
{
  "id": "abc123",
  "number": "PROC-001",
  ...
}
```

#### PUT /api/processes/{id}
Atualiza processo existente

#### DELETE /api/processes/{id}
Remove processo

### Documentos

#### GET /api/documents
Lista documentos (com filtro opcional por process_id)
```json
Response: 200 OK
[
  {
    "id": "doc123",
    "title": "Petição Inicial",
    "content": "Conteúdo do documento",
    "author": "Dr. Silva",
    "process_id": "PROC-001",
    "created_at": "2025-11-06T00:00:00Z"
  }
]
```

#### POST /api/documents
Cria novo documento (exige process_id existente)
```json
Request:
{
  "title": "Petição Inicial",
  "content": "Conteúdo completo",
  "author": "Dr. Silva",
  "process_id": "PROC-001"
}

Response: 201 Created
{ ... }
```

#### GET /api/documents/{id}
Obtém documento específico

#### PUT /api/documents/{id}
Atualiza documento

#### DELETE /api/documents/{id}
Remove documento

### Prazos

#### GET /api/deadlines
Lista todos os prazos

#### POST /api/deadlines
Cria novo prazo (exige process_id existente)
```json
Request:
{
  "process_id": "PROC-001",
  "due_date": "2025-12-31",
  "description": "Apresentar recurso"
}

Response: 201 Created
{ ... }
```

#### GET /api/deadlines/today
Lista prazos de hoje
```json
Response: 200 OK
{
  "date": "2025-11-06",
  "items": [...]
}
```

#### DELETE /api/deadlines/{id}
Remove prazo

### Audiências

#### GET /api/hearings
Lista audiências (com filtro opcional por data)

#### POST /api/hearings
Cria nova audiência (exige process_id existente)
```json
Request:
{
  "process_id": "PROC-001",
  "date": "2025-12-15",
  "courtroom": "Sala 3",
  "description": "Audiência de instrução"
}

Response: 201 Created
{ ... }
```

#### GET /api/hearings/today
Lista audiências de hoje

#### DELETE /api/hearings/{id}
Remove audiência

### Orquestração

#### POST /api/orchestrate/file-case
Cria caso completo (processo + documentos + prazos + audiências)
```json
Request:
{
  "process": {
    "number": "PROC-001",
    "title": "Ação Trabalhista"
  },
  "document": {
    "title": "Petição Inicial",
    "content": "...",
    "author": "Dr. Silva"
  },
  "deadline": {
    "due_date": "2025-12-31",
    "description": "Prazo recurso"
  },
  "hearing": {
    "date": "2025-12-15",
    "courtroom": "Sala 3"
  }
}

Response: 200 OK
{
  "message": "Case filed successfully",
  "process": { ... },
  "document": { ... },
  "deadline": { ... },
  "hearing": { ... }
}
```

#### GET /api/process/{PROC-XXX}/summary
Resumo completo do processo
```json
Response: 200 OK
{
  "process": { ... },
  "documents": [ ... ],
  "deadlines": [ ... ],
  "hearings": [ ... ]
}
```

### Seed e Utilitários

#### POST /api/seed
Popula banco com dados de exemplo (desenvolvimento)

#### GET /health
Health check do sistema
```json
Response: 200 OK
{
  "status": "healthy",
  "services": {
    "documents": "ok",
    "deadlines": "ok",
    "hearings": "ok",
    "auth": "ok",
    "processes": "ok"
  },
  "grpc": {
    "status": "available",
    "services": ["documents", "deadlines", "hearings"]
  }
}
```

---

## 🎨 INTERFACE DO USUÁRIO (UI)

### Estrutura de Páginas

#### 1. Landing Page (`ui/index.html`)
- **Objetivo:** Apresentação do sistema e captação de leads
- **Componentes:**
  - Header com logo e navegação
  - Hero section com benefícios principais
  - Features destacadas
  - CTAs (Call-to-Action) para login e registro
  - Seção de benefícios
  - Footer informativo

#### 2. Autenticação (`ui/components/auth-pages.html`)
- Modal de Login
- Modal de Registro de Escritório
- Recuperação de senha

#### 3. Sistema Principal (`ui/components/main-system.html`)
- **Dashboard central** com cards de navegação
- Acesso rápido a:
  - Processos
  - Documentos
  - Prazos
  - Audiências
  - Orquestração
- Informações do usuário logado
- Menu de navegação lateral

#### 4. Gestão de Processos (`ui/components/process.html`)
- Listagem de processos
- Criação de novos processos
- Edição e exclusão
- Busca e filtros
- Visualização de detalhes

#### 5. Gestão de Documentos (`ui/components/documentos.html`)
- Listagem de documentos
- Upload e criação
- Edição e exclusão
- Busca por título/autor/processo
- Preview de conteúdo

#### 6. Gestão de Prazos (`ui/components/deadlines.html`)
- Listagem de prazos
- Criação de novos prazos
- Filtro por data
- Destaque para prazos urgentes
- Alertas visuais

#### 7. Gestão de Audiências (`ui/components/hearing.html`)
- Listagem de audiências
- Agendamento
- Gestão de salas
- Filtro por data
- Calendário visual

### Tecnologias Frontend

- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna
  - Flexbox/Grid Layout
  - Animações e transições
  - Design responsivo
  - Variáveis CSS
- **JavaScript ES6+** - Interatividade
  - Fetch API para requisições
  - LocalStorage para JWT
  - Modais dinâmicos
  - Validação de formulários

### Serviços JavaScript

```javascript
// AuthService - Gerenciamento de autenticação
AuthService.login(email, password)
AuthService.logout()
AuthService.getToken()
AuthService.isAuthenticated()

// NavigationService - Navegação entre páginas
NavigationService.showLogin()
NavigationService.showRegister()
NavigationService.goToMainSystem()

// API Helper - Requisições autenticadas
apiRequest(endpoint, method, body, useFormData)
```

### Design System

- **Cores principais:**
  - Primary: #2563eb (Azul)
  - Success: #10b981 (Verde)
  - Warning: #f59e0b (Amarelo)
  - Danger: #ef4444 (Vermelho)
  - Gray: Escala de cinzas

- **Typography:**
  - Fonte: System UI stack
  - Hierarquia clara de títulos
  - Legibilidade otimizada

- **Componentes:**
  - Buttons (primary, secondary, ghost)
  - Cards
  - Modals
  - Forms
  - Tables
  - Alerts
  - Badges

---

## 🧪 TESTES

### Estrutura de Testes

#### 1. Testes de Integração (`tests/test_integration.py`)
- Teste de health check
- Fluxo completo de documentos
- Autenticação
- Rate limiting

#### 2. Testes de Segurança (`tests/test_security.py`)
- Validação de JWT
- RBAC
- Rate limiting
- Validação de entrada

#### 3. Testes Unitários por Serviço
- `test_auth_service.py` - Autenticação
- `test_documents_service.py` - Documentos
- `test_deadlines_service.py` - Prazos
- `test_hearings_service.py` - Audiências
- `test_processes_service.py` - Processos

#### 4. Smoke Tests (`tests/smoke.http`)
- Testes rápidos HTTP
- Verificação de endpoints
- Formato HTTP Request

### Execução de Testes

```bash
# Todos os testes
pytest -q

# Testes específicos
pytest tests/test_integration.py -v
pytest tests/test_security.py -v

# Com cobertura
pytest --cov=gateway --cov=services

# Windows PowerShell
./run_tests.ps1
```

### Coleção Postman
- Arquivo: `tests/SOA-Gateway.postman_collection.json`
- Contém: Todos os endpoints documentados
- Variáveis de ambiente configuráveis
- Testes automatizados

---

## 🚀 DEPLOYMENT E EXECUÇÃO

### Pré-requisitos

- Python 3.10+
- pip atualizado
- virtualenv (recomendado)

### Instalação

```bash
# 1. Clonar repositório
git clone <repo-url>
cd project_sd

# 2. Criar ambiente virtual
python -m venv .venv

# 3. Ativar ambiente
# Linux/macOS
source .venv/bin/activate
# Windows
.\.venv\Scripts\Activate.ps1

# 4. Instalar dependências
pip install -r requirements.txt

# 5. (Opcional) Instalar gRPC
pip install -r requirements-grpc.txt

# 6. Configurar variáveis de ambiente
cp env.example .env
# Editar .env conforme necessário
```

### Execução Automatizada

#### Linux/macOS/WSL
```bash
bash run_all.sh
```

#### Windows PowerShell
```powershell
./run_all.ps1

# Com opções
./run_all.ps1 -Help        # Exibe ajuda
./run_all.ps1 -SkipSetup   # Pula setup inicial
```

### Execução Manual

```bash
# Terminal 1 - Auth Service
python -m services.auth.app

# Terminal 2 - Processes Service
python -m services.processes.app

# Terminal 3 - Documents Service
python -m services.documents.app

# Terminal 4 - Deadlines Service
python -m services.deadlines.app

# Terminal 5 - Hearings Service
python -m services.hearings.app

# Terminal 6 - API Gateway
python gateway/app.py
```

### Verificação de Serviços

```bash
# Health check
curl http://127.0.0.1:8000/health

# Script de verificação
python check_services.py
```

### Parar Serviços

#### Linux/macOS
```bash
# Ctrl+C no terminal do script
# Ou matar processos Python
pkill -f python
```

#### Windows
```powershell
# Fechar janelas
# Ou via PowerShell
Get-Process python | Stop-Process -Force
```

---

## 📦 ESTRUTURA DE ARQUIVOS

```
project_sd/
│
├── gateway/                          # API Gateway
│   ├── app.py                       # Aplicação principal
│   ├── config.py                    # Configurações
│   ├── security.py                  # Segurança (JWT, RBAC, validação)
│   ├── services.py                  # Cliente de serviços
│   ├── middleware.py                # Middlewares (gRPC, logging)
│   ├── exceptions.py                # Exceções customizadas
│   └── __init__.py
│
├── services/                         # Microserviços
│   ├── base_service.py              # Classe base para serviços
│   │
│   ├── auth/                        # Serviço de Autenticação
│   │   ├── app.py                   # Aplicação do serviço
│   │   ├── data/                    # Persistência JSON
│   │   │   ├── users.json
│   │   │   └── offices.json
│   │   └── __init__.py
│   │
│   ├── processes/                   # Serviço de Processos
│   │   ├── app.py
│   │   ├── data/
│   │   │   └── processes.json
│   │   └── __init__.py
│   │
│   ├── documents/                   # Serviço de Documentos (alternativo)
│   │   └── app.py
│   │
│   ├── documents_service.py         # Serviço de Documentos
│   ├── deadlines_service.py         # Serviço de Prazos
│   ├── hearings_service.py          # Serviço de Audiências
│   └── __init__.py
│
├── ui/                              # Interface do Usuário
│   ├── index.html                   # Página principal
│   ├── styles.css                   # Estilos globais
│   ├── logo.png                     # Logo da aplicação
│   ├── logo.svg
│   │
│   ├── components/                  # Componentes da UI
│   │   ├── landing-page.html        # Landing page
│   │   ├── auth-pages.html          # Páginas de autenticação
│   │   ├── main-system.html         # Sistema principal
│   │   ├── process.html             # Gestão de processos
│   │   ├── documentos.html          # Gestão de documentos
│   │   ├── documentos.css
│   │   ├── deadlines.html           # Gestão de prazos
│   │   ├── hearing.html             # Gestão de audiências
│   │   ├── header.html              # Header compartilhado
│   │   ├── navigation.html          # Navegação
│   │   └── modals.html              # Modais compartilhados
│   │
│   ├── css/                         # Estilos CSS
│   │   └── process.css
│   │
│   ├── js/                          # JavaScript
│   │   └── (scripts modulares)
│   │
│   └── README.md                    # Documentação da UI
│
├── tests/                           # Testes
│   ├── test_integration.py          # Testes de integração
│   ├── test_security.py             # Testes de segurança
│   ├── test_auth_service.py         # Testes do Auth
│   ├── test_documents_service.py    # Testes de Documentos
│   ├── test_deadlines_service.py    # Testes de Prazos
│   ├── test_hearings_service.py     # Testes de Audiências
│   ├── test_processes_service.py    # Testes de Processos
│   ├── smoke.http                   # Smoke tests HTTP
│   └── SOA-Gateway.postman_collection.json
│
├── .env                             # Variáveis de ambiente (git-ignored)
├── env.example                      # Exemplo de .env
├── .gitignore                       # Git ignore
│
├── requirements.txt                 # Dependências Python
├── requirements-grpc.txt            # Dependências gRPC (opcional)
│
├── run_all.sh                       # Script Linux/macOS
├── run_all.ps1                      # Script Windows
├── run_tests.sh                     # Script de testes Linux
├── run_tests.ps1                    # Script de testes Windows
│
├── check_services.py                # Verificador de serviços
│
├── README.md                        # Documentação principal
├── pitch.md                         # Apresentação comercial
├── CHANGES_SUMMARY.md               # Resumo de mudanças
├── GRPC_MIDDLEWARE_GUIDE.md         # Guia do gRPC
└── Plataforma de Orquestração Jurídica - SOA + Flask.md
```

---

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente (.env)

```bash
# Segurança
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key
JWT_EXPIRATION_HOURS=24

# Ambiente
FLASK_ENV=development  # ou production, testing

# Portas
GATEWAY_PORT=8000
DOCS_PORT=5001
DEADLINES_PORT=5002
HEARINGS_PORT=5003
AUTH_PORT=5004
PROCESSES_PORT=5005

# URLs dos Serviços
DOCUMENTS_URL=http://127.0.0.1:5001
DEADLINES_URL=http://127.0.0.1:5002
HEARINGS_URL=http://127.0.0.1:5003
AUTH_URL=http://127.0.0.1:5004
PROCESSES_URL=http://127.0.0.1:5005

# gRPC (Opcional)
GRPC_ENABLED=true
DOCUMENTS_GRPC_URL=127.0.0.1:50001
DEADLINES_GRPC_URL=127.0.0.1:50002
HEARINGS_GRPC_URL=127.0.0.1:50003
GRPC_TIMEOUT=5

# Timeouts
REQUEST_TIMEOUT=5

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:8000

# Rate Limiting
RATELIMIT_STORAGE_URL=memory://
LOGIN_RATE_LIMIT=100 per minute

# Security
FORCE_HTTPS=false  # true em produção
HSTS_ENABLED=false  # true em produção

# Logging
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
```

---

## 📊 DEPENDÊNCIAS

### requirements.txt (Essenciais)
```
Flask==3.0.3                # Framework web
requests==2.32.3            # Cliente HTTP
Flask-Cors==4.0.1           # CORS support
pytest==8.2.1               # Framework de testes
PyJWT==2.8.0                # JSON Web Tokens
Flask-Limiter==3.5.0        # Rate limiting
marshmallow==3.20.1         # Validação de dados
flask-talisman==1.1.0       # Security headers
cryptography==41.0.7        # Criptografia
python-dotenv==1.0.0        # Variáveis de ambiente
```

### requirements-grpc.txt (Opcionais)
```
grpcio>=1.50.0              # gRPC runtime
grpcio-tools>=1.50.0        # gRPC tools
protobuf>=4.21.0            # Protocol buffers
```

---

## 🎯 CASOS DE USO

### Caso de Uso 1: Registro de Escritório e Usuário
1. Usuário acessa landing page
2. Clica em "Cadastrar Escritório"
3. Preenche formulário com:
   - Dados do escritório (nome, CNPJ, etc.)
   - Dados do usuário responsável (email, senha)
4. Sistema detecta tipo de usuário pelo domínio do email
5. Cria escritório e usuário
6. Redireciona para login

### Caso de Uso 2: Login e Navegação
1. Usuário insere email e senha
2. Sistema valida credenciais
3. Emite JWT contendo roles e permissions
4. Redireciona para dashboard principal
5. Usuário navega pelos módulos conforme permissões

### Caso de Uso 3: Criar Processo Completo (Orquestração)
1. Advogado faz login
2. Acessa "Orquestração de Caso"
3. Preenche formulário único com:
   - Dados do processo
   - Documento inicial
   - Prazo importante
   - Audiência agendada
4. Sistema valida dados
5. Gateway orquestra criação em múltiplos serviços:
   - Cria processo no Processes Service
   - Cria documento no Documents Service (vinculado)
   - Cria prazo no Deadlines Service (vinculado)
   - Cria audiência no Hearings Service (vinculado)
6. Retorna confirmação com todos os IDs criados

### Caso de Uso 4: Consultar Resumo de Processo
1. Usuário faz login
2. Busca processo por número (PROC-001)
3. Clica em "Ver Resumo"
4. Gateway busca em múltiplos serviços:
   - Dados do processo
   - Documentos relacionados
   - Prazos relacionados
   - Audiências relacionadas
5. Apresenta visão consolidada em uma única tela

### Caso de Uso 5: Gestão de Prazos
1. Advogado faz login
2. Acessa "Prazos"
3. Visualiza lista de todos os prazos
4. Filtra "Prazos de Hoje"
5. Recebe destaque visual para prazos urgentes
6. Cria novo prazo vinculado a processo existente

### Caso de Uso 6: Multi-tenancy (Isolamento)
1. Escritório A e Escritório B estão no sistema
2. Usuário do Escritório A faz login
3. JWT contém office_id do Escritório A
4. Todas as requisições incluem X-Office-ID header
5. Serviços filtram dados automaticamente por office_id
6. Usuário do Escritório A não vê dados do Escritório B

---

## 🔄 MIDDLEWARE gRPC

### Visão Geral
O sistema suporta **comunicação híbrida**: HTTP/REST (padrão) e gRPC (opcional), permitindo melhor performance para comunicação entre serviços.

### Características
- **Opt-in**: gRPC é opcional, não obrigatório
- **Fallback automático**: Se gRPC falhar, usa HTTP
- **Detecção por header**: `X-Prefer-Protocol: grpc`
- **Detecção por query**: `?protocol=grpc`

### Configuração gRPC
```bash
# .env
GRPC_ENABLED=true
DOCUMENTS_GRPC_URL=127.0.0.1:50001
DEADLINES_GRPC_URL=127.0.0.1:50002
HEARINGS_GRPC_URL=127.0.0.1:50003
GRPC_TIMEOUT=5
```

### Uso
```bash
# Requisição HTTP normal
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/documents

# Requisição preferindo gRPC
curl -H "Authorization: Bearer <token>" \
     -H "X-Prefer-Protocol: grpc" \
  http://localhost:8000/api/documents

# Ou via query parameter
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/documents?protocol=grpc"
```

### Status gRPC no Health Check
```json
{
  "status": "healthy",
  "services": {...},
  "grpc": {
    "status": "available",
    "services": ["documents", "deadlines", "hearings"]
  }
}
```

---

## 📈 MÉTRICAS E OBSERVABILIDADE

### Logs Estruturados
- Timestamp
- Nome do serviço
- Nível (INFO, WARNING, ERROR)
- Mensagem
- Correlation ID para rastreamento

### Health Checks
- `/health` - Status de todos os serviços
- `/health?fast=1` - Status rápido (sem consultar dependências)
- Status individual de cada microserviço

### Auditoria
- Logs de eventos de segurança
- Login/logout
- Tentativas falhadas de autenticação
- Violações de rate limit
- IP e user agent registrados

---

## 🚧 LIMITAÇÕES ATUAIS

1. **Persistência**
   - Dados em JSON (não recomendado para produção)
   - Sem transações ACID
   - Sem backup automático

2. **Escalabilidade**
   - Serviços em single instance
   - Sem load balancing
   - Sem service discovery

3. **gRPC**
   - Implementação demonstrativa
   - Sem stubs reais dos serviços
   - Autenticação ainda via HTTP headers

4. **Validações**
   - Validações básicas implementadas
   - Algumas regras de negócio podem ser expandidas

5. **Monitoramento**
   - Sem dashboards de métricas
   - Logs em arquivos locais
   - Sem APM integrado

---

## 🎯 ROADMAP E MELHORIAS FUTURAS

### Curto Prazo
1. **Banco de Dados Relacional**
   - Migrar de JSON para PostgreSQL/MySQL
   - Implementar migrations
   - Transações ACID

2. **Dockerização**
   - Dockerfile para cada serviço
   - Docker Compose para orquestração
   - Imagens otimizadas

3. **CI/CD**
   - Pipeline de testes automatizados
   - Deploy automático
   - Versionamento semântico

### Médio Prazo
1. **Service Mesh**
   - Istio ou Linkerd
   - Service discovery automático
   - Circuit breakers

2. **Observabilidade Completa**
   - Prometheus + Grafana
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Distributed tracing (Jaeger)

3. **gRPC Completo**
   - Implementar stubs reais
   - Autenticação gRPC nativa
   - Health checks gRPC padrão

4. **Cache Distribuído**
   - Redis para sessões
   - Cache de consultas frequentes
   - Rate limiting distribuído

### Longo Prazo
1. **Kubernetes**
   - Deploy em K8s
   - Auto-scaling
   - Self-healing

2. **Event-Driven Architecture**
   - Message broker (RabbitMQ/Kafka)
   - Event sourcing
   - CQRS

3. **API GraphQL**
   - Alternativa ao REST
   - Queries flexíveis
   - Subscriptions

4. **Mobile Apps**
   - React Native
   - Flutter
   - Sincronização offline

---

## 💡 BOAS PRÁTICAS IMPLEMENTADAS

### Código Limpo
- Nomes descritivos
- Funções pequenas e focadas
- Separação de responsabilidades
- Comentários onde necessário

### Segurança
- Princípio do menor privilégio
- Validação de entrada
- Sanitização de saída
- Auditoria completa
- Defense in depth

### Arquitetura
- Single Responsibility Principle
- Dependency Injection
- Factory Pattern
- Service-Oriented Architecture
- API Gateway Pattern

### DevOps
- Scripts de automação
- Configuração via environment
- Health checks
- Logging estruturado
- Testes automatizados

---

## 📚 DOCUMENTAÇÃO ADICIONAL

### Arquivos de Documentação
1. **README.md** - Documentação principal e quick start
2. **pitch.md** - Apresentação comercial do produto
3. **GRPC_MIDDLEWARE_GUIDE.md** - Guia completo do gRPC
4. **CHANGES_SUMMARY.md** - Log de mudanças da UI
5. **Plataforma de Orquestração Jurídica - SOA + Flask.md** - Visão técnica

### Recursos Externos
- Documentação do Flask: https://flask.palletsprojects.com/
- JWT: https://jwt.io/
- gRPC: https://grpc.io/
- Marshmallow: https://marshmallow.readthedocs.io/

---

## 🤝 CONTRIBUIÇÃO

### Como Contribuir
1. Fork o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

### Padrões de Código
- PEP 8 para Python
- ESLint para JavaScript
- Commits semânticos
- Testes para novas features

---

## 📞 SUPORTE E CONTATO

### Informações de Contato
- **Website:** www.jurisflow.com.br
- **Email:** contato@jurisflow.com.br
- **WhatsApp:** (82) 99999-9999
- **Endereço:** Maceió, AL - Brasil

### Suporte Técnico
- Issues no GitHub
- Documentação inline
- Exemplos de uso
- Coleção Postman

---

## 📝 CONCLUSÃO

O **JurisFlow** representa uma implementação completa e moderna de uma plataforma de gestão jurídica baseada em **Arquitetura Orientada a Serviços (SOA)**. O sistema demonstra:

### Pontos Fortes
✅ Arquitetura escalável e manutenível  
✅ Segurança enterprise (JWT, RBAC, rate limiting)  
✅ Multi-tenancy com isolamento completo  
✅ API REST bem documentada  
✅ Interface moderna e responsiva  
✅ Orquestração inteligente de serviços  
✅ Suporte a protocolos HTTP e gRPC  
✅ Testes automatizados  
✅ Scripts de deployment  
✅ Documentação completa  

### Aplicações Práticas
- Escritórios de advocacia (pequeno a médio porte)
- Departamentos jurídicos corporativos
- Consultorias jurídicas
- Ambiente educacional (ensino de SOA)

### Tecnologias e Conceitos Demonstrados
- Service-Oriented Architecture (SOA)
- Microserviços
- API Gateway Pattern
- JWT Authentication
- RBAC (Role-Based Access Control)
- Multi-tenancy
- Rate Limiting
- gRPC (opcional)
- RESTful APIs
- Security Headers
- Input Validation
- Logging e Auditoria
- Health Checks
- Service Orchestration

O projeto serve como **referência sólida** para implementação de sistemas distribuídos modernos, combinando boas práticas de arquitetura, segurança e usabilidade.

---

**Documento gerado em:** 06/11/2025  
**Versão:** 1.0.0  
**Autor:** Análise Completa do Sistema JurisFlow
