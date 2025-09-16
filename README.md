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

Linux/macOS/WSL:
```bash
cd soa-gateway-ready
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
bash run_all.sh
```
Windows (PowerShell):
```powershell
cd soa-gateway-ready
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
./run_all.ps1
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

## Endpoints (Gateway)

- Health/UI/Seed
  - GET /health — status do gateway e URLs dos serviços
  - GET /ui — UI de testes
  - POST /api/seed — cria dados de exemplo

- Documents
  - GET /api/documents
  - POST /api/documents
  - GET /api/documents/<id>

- Deadlines
  - GET /api/deadlines
  - POST /api/deadlines
  - GET /api/deadlines/today

- Audiences (alias de hearings)
  - GET /api/audiences
  - POST /api/audiences

- Orquestração
  - GET /api/process/<id>/summary — agrega documentos/prazos/audiências
  - POST /api/orchestrate/file-case — cria documento + prazo + audiência em uma chamada

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