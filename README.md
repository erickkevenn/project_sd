# SOA Demo — API Gateway + Microserviços (Flask)

Projeto de referência para coordenação e orquestração de tarefas jurídicas em um escritório de advocacia. Inclui um API Gateway em Flask, cinco microserviços (Auth, Processes, Documents, Deadlines, Hearings), UI web para testes, seed de dados e testes automatizados.

## ✅ Status do Projeto
- **15/15 testes principais passando** (100% de sucesso)
- **5/5 testes de refatoração passando** (100% de sucesso)
- **Todos os microserviços funcionando**
- **Autenticação JWT implementada**
- **Segurança completa (RBAC, Rate Limiting, Validação)**
- **Scripts de inicialização corrigidos**

## Pré-requisitos
- Python 3.10+
- pip atualizado
- Postman para testar via coleção

## Arquitetura do Sistema

### Microserviços
- **API Gateway** (porta 8000) - Ponto de entrada único
- **Auth Service** (porta 5001) - Autenticação JWT
- **Processes Service** (porta 5002) - Gestão de processos jurídicos
- **Documents Service** (porta 5003) - Gerenciamento de documentos
- **Deadlines Service** (porta 5004) - Controle de prazos legais
- **Hearings Service** (porta 5005) - Agendamento de audiências
- **Frontend** (porta 8080) - Interface web

### Estrutura de Diretórios
```
project_sd/
├── gateway/                     # API Gateway
│   ├── app.py                   # Aplicação principal
│   ├── config.py                # Configurações
│   ├── security.py              # Segurança
│   ├── services.py              # Clientes de serviços
│   ├── middleware.py            # Middleware
│   └── exceptions.py            # Exceções
├── services/                    # Microserviços
│   ├── auth_service/
│   │   └── app.py              # Serviço de autenticação
│   ├── processes_service/
│   │   └── app.py              # Serviço de processos
│   ├── documents_service/
│   │   └── app.py              # Serviço de documentos
│   ├── deadlines_service/
│   │   └── app.py              # Serviço de prazos
│   └── hearings_service/
│       └── app.py              # Serviço de audiências
├── shared/                      # Módulos compartilhados
│   ├── auth.py                 # Autenticação compartilhada
│   └── validation.py           # Validação compartilhada
├── data/                       # Dados JSON
│   ├── usuarios.json           # Usuários
│   ├── processos.json          # Processos
│   ├── documentos.json         # Documentos
│   ├── audiencias.json         # Audiências
│   └── prazos.json             # Prazos
├── ui/                         # Interface do usuário
├── tests/                      # Testes
│   ├── test_auth.py           # Testes de autenticação
│   ├── test_integration.py    # Testes de integração
│   └── test_security.py       # Testes de segurança
├── test_refactoring.py        # Testes de refatoração
├── run_all.sh                 # Script de execução (Linux/macOS)
├── run_all.ps1               # Script de execução (Windows)
└── requirements.txt          # Dependências
```

## Como executar

### Execução Automatizada (Recomendado)

Os scripts foram melhorados para automatizar todo o processo de setup:

**Linux/macOS/WSL:**
```bash
cd project_sd
bash run_all.sh
```

**Windows (PowerShell):**
```powershell
cd project_sd
.\run_all.ps1
```

Os scripts automaticamente:
- ✅ Verificam se Python 3.8+ está instalado
- ✅ Criam o ambiente virtual (.venv)
- ✅ Instalam todas as dependências
- ✅ Verificam se as portas estão disponíveis
- ✅ Criam arquivo .env a partir do template
- ✅ Iniciam todos os serviços
- ✅ Verificam se os serviços estão respondendo
- ✅ Exibem informações úteis (URLs, usuários, comandos)

### Execução Manual (se necessário)

```bash
cd project_sd
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# ou .\.venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
bash run_all.sh  # ou .\run_all.ps1
```

### Opções dos Scripts

**Linux/macOS:**
```bash
bash run_all.sh  # Setup completo + execução
```

**Windows:**
```powershell
.\run_all.ps1           # Setup completo + execução
.\run_all.ps1 -SkipSetup # Apenas execução (pula setup)
.\run_all.ps1 -Help     # Exibe ajuda
```

UI de testes: http://127.0.0.1:8000/ui  
Na UI, clique em “Seed” para popular dados de exemplo.

Parar os serviços:
- Linux/macOS/WSL: Ctrl+C no terminal do run_all.sh (encerra todos).
- Windows: feche as janelas; se necessário:
  ```powershell
  Get-Process python | Stop-Process -Force
  ```

Dica: o terminal do run_all.sh fica exibindo logs; abra outro terminal para curl/pytest.

## Testes Automatizados

### Como Executar os Testes

**1. Iniciar os Serviços:**
```powershell
# Windows
.\run_all.ps1

# Linux/macOS
bash run_all.sh
```

**2. Verificar se os Serviços Estão Funcionando:**
```bash
curl http://127.0.0.1:8000/health
```

**3. Executar os Testes:**
```bash
# Todos os testes
python -m pytest tests/ -v

# Testes específicos
python -m pytest tests/test_integration.py -v
python -m pytest tests/test_security.py -v
python -m pytest tests/test_auth.py -v

# Testes de refatoração
python -m pytest test_refactoring.py -v
```

### Resultados dos Testes
- ✅ **15/15 testes principais passando** (100% de sucesso)
- ✅ **5/5 testes de refatoração passando** (100% de sucesso)
- ✅ **Todos os microserviços funcionando**
- ✅ **Autenticação e segurança testadas**

## Segurança Implementada

O API Gateway inclui os seguintes aspectos de segurança:

### Autenticação JWT
- Login: `POST /api/auth/login`
- Tokens com expiração de 24h
- Usuários de teste:
  - `admin@escritorio.com/admin123` (Admin - todas as permissões)
  - `adv.um@escritorio.com/admin123` (Advogado - read, write, orchestrate)
  - `est.um@escritorio.com/intern123` (Estagiário - apenas read)

### Autorização RBAC
- Sistema de roles e permissions
- Controle de acesso por endpoint

### Rate Limiting
- Limites por IP e endpoint
- Login: 5/minuto
- Leitura: 30/minuto
- Escrita: 10/minuto

### Validação de Entrada
- Schemas Marshmallow
- Sanitização automática
- Validação de tipos e formatos

### Security Headers
- Content Security Policy
- Anti-clickjacking
- CORS configurado

### Logging e Auditoria
- Eventos de segurança
- Correlation IDs
- Logs estruturados

## Endpoints (Gateway)

### Autenticação
- `POST /api/auth/login` — login e obtenção de token
- `GET /api/auth/me` — informações do usuário atual

### Health/UI/Seed
- `GET /health` — status do gateway e URLs dos serviços
- `GET /ui` — UI de testes
- `POST /api/seed` — cria dados de exemplo

### Processos (requer autenticação)
- `GET /api/processes` — listar processos (requer: read)
- `POST /api/processes` — criar processo (requer: write)
- `GET /api/processes/<id>` — obter processo específico (requer: read)
- `PUT /api/processes/<id>` — atualizar processo (requer: write)
- `DELETE /api/processes/<id>` — remover processo (requer: delete)

### Documentos (requer autenticação)
- `GET /api/documents` — listar documentos (requer: read)
- `POST /api/documents` — criar documento (requer: write)
- `GET /api/documents/<id>` — obter documento específico (requer: read)
- `DELETE /api/documents/<id>` — remover documento (requer: delete)

### Prazos (requer autenticação)
- `GET /api/deadlines` — listar prazos (requer: read)
- `POST /api/deadlines` — criar prazo (requer: write)
- `GET /api/deadlines/today` — prazos de hoje (requer: read)

### Audiências (requer autenticação)
- `GET /api/hearings` — listar audiências (requer: read)
- `POST /api/hearings` — criar audiência (requer: write)
- `GET /api/hearings/today` — audiências de hoje (requer: read)
- `DELETE /api/hearings/<id>` — remover audiência (requer: delete)

### Orquestração (requer autenticação)
- `GET /api/process/<id>/summary` — resumo do processo (requer: read)
- `POST /api/orchestrate/file-case` — criar caso completo (requer: orchestrate)

## Exemplo de Uso com Autenticação

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@escritorio.com", "password": "admin123"}' | \
  jq -r '.token')

# 2. Criar documento
curl -X POST http://localhost:8000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Teste", "conteudo": "Conteúdo", "autor_id": "Admin"}'

# 3. Listar documentos
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/documents
```

## Testes de Segurança

```bash
# Testes automatizados de segurança
python -m pytest tests/test_security.py -v

# Teste manual básico
python tests/test_security.py
```

Serviços internos (acesso direto):
- Auth Service: POST /login, GET /me — :5001
- Processes Service: GET/POST/PUT/DELETE /processes — :5002
- Documents Service: GET/POST/DELETE /documents — :5003
- Deadlines Service: GET/POST /deadlines, GET /deadlines/today — :5004
- Hearings Service: GET/POST/DELETE /hearings — :5005

## Teste rápido (curl)

### Com Autenticação
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@escritorio.com", "password": "admin123"}' | \
  jq -r '.token')

# 2. Health check
curl http://127.0.0.1:8000/health

# 3. Criar documento
curl -X POST http://127.0.0.1:8000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Petição","conteudo":"Conteúdo da petição","autor_id":"Admin"}'

# 4. Listar documentos
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/documents

# 5. Prazos de hoje
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/deadlines/today

# 6. Criar audiência
curl -X POST http://127.0.0.1:8000/api/hearings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"process_id":"0001","data_hora":"2025-11-01T15:00:00","link_sala":"https://meet.google.com/xyz"}'

# 7. Listar audiências
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/hearings
```

### Sem Autenticação (Health Check)
```bash
# Verificar se os serviços estão funcionando
curl http://127.0.0.1:8000/health
```

## Postman (opcional)
- Coleção: tests/SOA-Gateway.postman_collection.json
- Fluxo sugerido: Health → Seed → listagens/criações
- (Opcional) Ambiente “SOA Local” com base_url = http://127.0.0.1:8000

## Troubleshooting

### Problemas Comuns

#### 1. Erro "Connection refused"
**Causa:** Serviços não estão rodando
**Solução:** Execute `.\run_all.ps1` e aguarde os serviços iniciarem

#### 2. Erro "Port already in use"
**Causa:** Porta já está sendo usada
**Solução:**
```powershell
# Parar processos Python
Get-Process python | Stop-Process -Force

# Ou encontrar e parar processo específico
netstat -ano | findstr ":8000"
taskkill /PID <PID_NUMERO> /F
```

#### 3. Problemas de Codificação no PowerShell
**Causa:** Caracteres especiais no script
**Solução:** ✅ **CORRIGIDO** - Scripts foram atualizados para evitar problemas de codificação

#### 4. Testes Falhando
**Causa:** Serviços não estão rodando ou hashes incorretas
**Solução:** 
- Verifique se todos os serviços estão rodando: `curl http://127.0.0.1:8000/health`
- ✅ **Hashes foram corrigidas** - Login do estagiário funcionando

### Verificação de Status
```powershell
# Verificar processos Python
Get-Process python

# Verificar portas em uso
netstat -an | findstr ":500"
netstat -an | findstr ":8000"

# Health check
curl http://127.0.0.1:8000/health
```

## Notas
- Projeto voltado a desenvolvimento local e demonstração de arquitetura SOA (Gateway + microserviços + orquestração).
- Logs são exibidos no terminal de cada processo.
- Em caso de conflito de portas, ajuste as portas nos serviços ou finalize processos em uso.
- Sem necessidade de banco externo para testar a orquestração e o fluxo fim a fim.
- ✅ **Todos os problemas conhecidos foram corrigidos**