# SOA Demo — API Gateway + Microserviços (Flask)

Projeto de referência para coordenação e orquestração de tarefas jurídicas em um escritório de advocacia. Inclui um API Gateway em Flask, três microserviços (Documentos, Prazos, Audiências), UI web para testes, seed de dados e testes automatizados.

## Pré-requisitos
- Python 3.10+
- pip atualizado
- Postman para testar via coleção

## Estrutura
```
soa-gateway-ready/
  gateway/app.py          # API Gateway (serve UI em /ui na porta 8000)
  services/
    documents_service.py  # porta :5001
    deadlines_service.py  # porta :5002
    hearings_service.py   # porta :5003
  ui/
    gateway_ui.html       # frontend de teste servido pelo Gateway
  tests/
    test_integration.py
    smoke.http
    SOA-Gateway.postman_collection.json
  run_all.sh
  run_all.ps1
  requirements.txt
  README.md
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

## Testes automatizados
Com os serviços rodando:
```bash
pytest -q
# ou, arquivo específico:
python -m pytest tests/test_integration.py -v
```

## Segurança Implementada

O API Gateway inclui os seguintes aspectos de segurança:

### Autenticação JWT
- Login: `POST /api/auth/login`
- Tokens com expiração de 24h
- Usuários de teste:
  - `admin/admin123` (todas as permissões)
  - `lawyer/lawyer123` (read, write, orchestrate)
  - `intern/intern123` (apenas read)

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
- POST /api/auth/login — login e obtenção de token
- GET /api/auth/me — informações do usuário atual

- Health/UI/Seed
  - GET /health — status do gateway e URLs dos serviços
  - GET /ui — UI de testes
  - POST /api/seed — cria dados de exemplo

- Documents (requer autenticação)
  - GET /api/documents — listar (requer: read)
  - POST /api/documents — criar (requer: write)
  - GET /api/documents/<id> — obter específico (requer: read)

- Deadlines (requer autenticação)
  - GET /api/deadlines — listar (requer: read)
  - POST /api/deadlines — criar (requer: write)
  - GET /api/deadlines/today — prazos de hoje (requer: read)

- Hearings/Audiences (requer autenticação)
  - GET /api/hearings — listar (requer: read)
  - POST /api/hearings — criar (requer: write)
  - GET /api/audiences — alias para hearings (requer: read)
  - POST /api/audiences — alias para hearings (requer: write)

- Orchestration (requer autenticação)
  - GET /api/process/<id>/summary — resumo do processo (requer: read)
  - POST /api/orchestrate/file-case — criar caso completo (requer: orchestrate)

## Exemplo de Uso com Autenticação

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

## Testes de Segurança

```bash
# Testes automatizados de segurança
python -m pytest tests/test_security.py -v

# Teste manual básico
python tests/test_security.py
```

Serviços internos (acesso direto):
- Documents: GET/POST /documents, GET /documents/<id> — :5001
- Deadlines: GET/POST /deadlines, GET /deadlines/today — :5002
- Hearings: GET/POST /hearings (suporta ?date=YYYY-MM-DD) — :5003

## Teste rápido (curl)
```bash
# Gateway ok?
curl http://127.0.0.1:8000/health

# Criar documento
curl -X POST http://127.0.0.1:8000/api/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"Petição","content":"...","author":"Erick"}'

# Listar documentos
curl http://127.0.0.1:8000/api/documents

# Prazos de hoje
curl http://127.0.0.1:8000/api/deadlines/today

# Criar audiência
curl -X POST http://127.0.0.1:8000/api/audiences \
  -H "Content-Type: application/json" \
  -d '{"process_id":"0001","date":"2025-11-01","courtroom":"Sala 2"}'

# Listar audiências
curl http://127.0.0.1:8000/api/audiences
```

## Postman (opcional)
- Coleção: tests/SOA-Gateway.postman_collection.json
- Fluxo sugerido: Health → Seed → listagens/criações
- (Opcional) Ambiente “SOA Local” com base_url = http://127.0.0.1:8000

## Notas
- Projeto voltado a desenvolvimento local e demonstração de arquitetura SOA (Gateway + microserviços + orquestração).
- Logs são exibidos no terminal de cada processo.
- Em caso de conflito de portas, ajuste as portas nos serviços ou finalize processos em uso.
- Sem necessidade de banco externo para testar a orquestração e o fluxo fim a fim.