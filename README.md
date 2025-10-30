# Plataforma de Orquestração Jurídica

Projeto enxuto para demonstrar uma arquitetura SOA aplicada ao domínio jurídico, com um API Gateway em Flask, microserviços independentes (Processos, Documentos, Prazos e Audiências), um serviço de Autenticação e uma UI simples para exploração do fluxo fim a fim.

## Objetivos

- Orquestrar criação e consulta de itens jurídicos via Gateway
- Controlar acesso por papéis e permissões (RBAC) com JWT
- Demonstrar separação de responsabilidades entre serviços

## Como funciona (visão rápida)

- Gateway (porta 8000) expõe endpoints REST e emite tokens JWT após login.
- Serviço de Autenticação valida usuários por e-mail e define automaticamente papéis e permissões a partir do domínio do e-mail.
- Microserviços de negócio persistem dados em JSON local e são acessados exclusivamente via Gateway:
  - Processes (CRUD de processos, ex.: PROC-001)
  - Documents (documentos vinculados a processos)
  - Deadlines (prazos vinculados a processos)
  - Hearings (audiências vinculadas a processos)
- UI estática acessível em /ui para explorar rapidamente os fluxos.

## Pré-requisitos

- Python 3.10+
- pip atualizado
- (Opcional) Postman para testar via coleção

## Executando

### Execução automatizada (recomendado)

Linux/macOS/WSL:

```bash
bash run_all.sh
```

Windows (PowerShell):

```powershell
./run_all.ps1
```

### O que o script faz

- Cria .venv e instala dependências
- Sobe Gateway e serviços
- Verifica health e imprime URLs úteis

UI: <http://127.0.0.1:8000/ui>

### Parar serviços

- Linux/macOS/WSL: Ctrl+C no terminal do script
- Windows: feche as janelas; se necessário:
  ```powershell
  Get-Process python | Stop-Process -Force
  ```

### Execução manual (opcional)

```bash
python -m venv .venv
source .venv/bin/activate      # Linux/macOS
# .\.venv\Scripts\Activate.ps1 # Windows
pip install -r requirements.txt
bash run_all.sh  # ou ./run_all.ps1
```

## Autenticação, Domínios e Papéis

O login é por e-mail. O domínio do e-mail determina o tipo de usuário, papéis e permissões automaticamente:

- @admin.com → user_type: admin
  - roles: [admin, advogado, user]
  - permissions: [read, write, delete, orchestrate, create_user]

- @advogado.com → user_type: advogado
  - roles: [advogado, user]
  - permissions: [read, write, orchestrate]

- @estagiario.com → user_type: estagiario
  - roles: [estagiario, user]
  - permissions: [read]

Exemplos de contas de desenvolvimento (seed):
- `admin@admin.com` / `admin123` — administrador (tudo)
- `advogado@advogado.com` / `lawyer123` — advogado (leitura, escrita, orquestração)
- `estagiario@estagiario.com` / `intern123` — estagiário (somente leitura)
- `daniel@advogado.com` / `password` — advogado (exemplo adicional)

Endpoint de login no Gateway:
- POST /api/auth/login
  - body: `{ "email": "seu@dominio.com", "password": "senha" }`
  - retorno: `{ token JWT, user }`

Informações do usuário atual:
- GET /api/auth/me (enviar Authorization: Bearer <token>)

Criação de usuários:
- POST /api/auth/register — auto-registro por e-mail; o escritório (office) pode ser criado junto
- POST /api/users — criação de usuário pelo admin; o usuário criado herda o mesmo office do admin logado

## Lógica de negócio e casos de uso

1) Registrar um escritório e um usuário (auto registro)
- POST /api/auth/register com email do domínio permitido (@admin.com, @advogado.com ou @estagiario.com)
- O serviço detecta o user_type pelo domínio e atribui papéis/permissões automaticamente
- Um office_id é retornado/associado

2) Login e emissão de JWT
- POST /api/auth/login → Gateway valida no Auth Service e emite JWT contendo email, roles, permissions, office_id

3) Operar recursos de negócio
- Processos: criar e consultar números como PROC-001
- Documentos/Prazos/Audiências: sempre vinculados a um process_id (número do processo)

4) Orquestrar um caso completo
- POST /api/orchestrate/file-case com payload opcional contendo process/document/deadline/hearing
- O Gateway valida a existência do processo e cria os itens na sequência

5) Resumo de um processo
- GET /api/process/<process_number>/summary retorna, em uma chamada, documentos, prazos e audiências vinculados

## Endpoints principais (Gateway)

Autenticação e Usuários
- POST /api/auth/register — registrar usuário (e opcionalmente o escritório)
- POST /api/auth/login — login por e-mail + senha
- GET  /api/auth/me — dados do usuário autenticado
- POST /api/users — criar usuário (apenas admin)

Health/UI/Seed
- GET /health — status do gateway e serviços
- GET /ui — interface estática
- POST /api/seed — popular dados de exemplo (dev)

Processos
- GET  /api/processes — listar
- POST /api/processes — criar (requer write)
- GET  /api/processes/<id> — detalhar
- PUT  /api/processes/<id> — atualizar (requer write)
- DELETE /api/processes/<id> — remover (requer delete)
- GET  /api/processes/by-number/<PROC-XXX> — buscar por número

Documentos
- GET  /api/documents — listar (requer read)
- POST /api/documents — criar (requer write; exige process_id existente)
- GET  /api/documents/<id> — detalhar (requer read)
- DELETE /api/documents/<id> — remover (requer delete)

Prazos
- GET  /api/deadlines — listar (requer read)
- POST /api/deadlines — criar (requer write; exige process_id existente)
- GET  /api/deadlines/today — prazos de hoje (requer read)
- DELETE /api/deadlines/<id> — remover (requer delete)

Audiências
- GET  /api/hearings — listar (requer read)
- GET  /api/hearings/today — audiências de hoje (requer read)
- POST /api/hearings — criar (requer write; exige process_id existente)
- DELETE /api/hearings/<id> — remover (requer delete)

Orquestração
- GET  /api/process/<PROC-XXX>/summary — resumo do processo (read)
- POST /api/orchestrate/file-case — cria caso completo (orchestrate)

## Exemplo rápido (curl)

Login e uso do token:
```bash
# 1) Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@admin.com", "password": "admin123"}' | jq -r '.token')

# 2) Criar processo
curl -s -X POST http://localhost:8000/api/processes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"number":"PROC-001","title":"Ação de Exemplo"}'

# 3) Criar documento vinculado
curl -s -X POST http://localhost:8000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Petição","content":"...","author":"Admin","process_id":"PROC-001"}'

# 4) Resumo do processo
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/process/PROC-001/summary
```

## Testes
Com os serviços rodando:
```bash
pytest -q
# Ou um arquivo específico:
python -m pytest tests/test_integration.py -v
```

No Windows (PowerShell) você também pode usar:
```powershell
./run_tests.ps1
```

## Segurança (resumo)
- JWT emitido pelo Gateway (expiração padrão: 24h)
- RBAC por roles e permissions em cada endpoint
- Rate limiting por rota (login, leitura, escrita)
- Validação com Marshmallow e sanitização de entrada
- Security headers (CSP, HSTS, anti-clickjacking) e CORS
- Logging de eventos de segurança com IP e user agent

## Postman (opcional)
- Coleção: `tests/SOA-Gateway.postman_collection.json`
- Fluxo sugerido: Health → Register/Login → Seed → CRUDs e Orquestração
- (Opcional) Ambiente: base_url = http://127.0.0.1:8000

## Notas
- Projeto focado em uso local e demonstração de arquitetura (sem banco externo)
- Logs são exibidos no terminal de cada processo
- Em caso de conflito de portas, finalize processos antigos ou ajuste as variáveis de ambiente