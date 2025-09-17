#!/usr/bin/env bash

# Plataforma de Orquestração Jurídica - SOA + Flask
# Script de setup e execução automatizado

# Configurações do script
set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          Plataforma de Orquestração Jurídica                ║"
echo "║                    SOA + Flask                               ║"
echo "║                                                              ║"
echo "║  API Gateway com Segurança Implementada                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

info "Iniciando setup do projeto..."

# Verificar se Python está instalado
info "Verificando Python..."
PYTHON_CMD=""

# Tentar python primeiro (comum no Windows)
if command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1)
    if [[ "$PYTHON_VERSION" == *"Python 3"* ]]; then
        PYTHON_CMD="python"
        info "Python encontrado: python"
    fi
fi

# Se não encontrou, tentar python3
if [ -z "$PYTHON_CMD" ] && command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PYTHON_VERSION=$(python3 --version 2>&1)
    info "Python encontrado: python3"
fi

# Se ainda não encontrou
if [ -z "$PYTHON_CMD" ]; then
    error "Python não encontrado. Instale Python 3.8+ e tente novamente."
    echo "Comandos testados: python, python3"
    exit 1
fi

# Verificar versão do Python
info "Verificando versão do Python..."
PYTHON_VERSION_NUM=$(echo "$PYTHON_VERSION" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
if [ -z "$PYTHON_VERSION_NUM" ]; then
    error "Não foi possível determinar a versão do Python"
    echo "Output do --version: $PYTHON_VERSION"
    exit 1
fi

PYTHON_MAJOR=$(echo $PYTHON_VERSION_NUM | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION_NUM | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    error "Python 3.8+ é necessário. Versão atual: $PYTHON_VERSION_NUM"
    exit 1
fi

log "Python $PYTHON_VERSION_NUM detectado "

# Verificar se pip está instalado
info "Verificando pip..."
PIP_CMD=""

# Tentar pip primeiro (comum no Windows)
if command -v pip &> /dev/null; then
    PIP_CMD="pip"
    info "pip encontrado: pip"
elif command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
    info "pip encontrado: pip3"
else
    error "pip não encontrado. Instale pip e tente novamente."
    echo "Comandos testados: pip, pip3"
    exit 1
fi

log "pip $PIP_CMD detectado "

# Criar ambiente virtual se não existir
info "Verificando ambiente virtual..."
if [ ! -d ".venv" ]; then
    log "Criando ambiente virtual..."
    if $PYTHON_CMD -m venv .venv; then
        log "Ambiente virtual criado "
    else
        error "Falha ao criar ambiente virtual"
        exit 1
    fi
else
    info "Ambiente virtual já existe"
fi

# Ativar ambiente virtual
log "Ativando ambiente virtual..."

# Detectar se estamos no Git Bash (Windows) ou Linux/macOS
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "${MSYSTEM:-}" ]]; then
    # Git Bash no Windows
    if [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
        info "Usando ativação do Windows (Scripts/activate)"
    elif [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
        info "Usando ativação Unix (bin/activate)"
    else
        error "Script de ativação não encontrado"
        exit 1
    fi
else
    # Linux/macOS
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
        info "Usando ativação Unix (bin/activate)"
    else
        error "Script de ativação não encontrado"
        exit 1
    fi
fi

# Verificar se está no ambiente virtual
if [ -n "${VIRTUAL_ENV:-}" ]; then
    log "Ambiente virtual ativado "
    info "VIRTUAL_ENV: $VIRTUAL_ENV"
else
    warn "VIRTUAL_ENV não definido, mas continuando..."
fi

# Atualizar pip
log "Atualizando pip..."
if python -m pip install --upgrade pip --quiet; then
    info "pip atualizado "
else
    warn "Falha ao atualizar pip, mas continuando..."
fi

# Verificar se requirements.txt existe
if [ ! -f "requirements.txt" ]; then
    error "Arquivo requirements.txt não encontrado"
    exit 1
fi

# Instalar dependências
log "Instalando dependências..."
if python -m pip install -r requirements.txt --quiet; then
    log "Dependências instaladas "
else
    error "Falha ao instalar dependências"
    exit 1
fi

# Verificar dependências críticas
log "Verificando dependências críticas..."
if python -c "import flask, requests, flask_cors, flask_limiter, jwt, marshmallow, flask_talisman, cryptography, dotenv; print('Todas as dependências estão instaladas ')" 2>/dev/null; then
    log "Verificação de dependências concluída "
else
    warn "Algumas dependências podem estar faltando, mas continuando..."
fi

# Remover verificação redundante

log "Dependências instaladas "

# Criar arquivo .env se não existir
if [ ! -f ".env" ] && [ -f "env.example" ]; then
    log "Criando arquivo .env a partir do template..."
    cp env.example .env
    log "Arquivo .env criado "
    warn "Revise o arquivo .env para configurações de produção"
fi

# Verificar se os arquivos de serviço existem
info "Verificando arquivos necessários..."
REQUIRED_FILES=("services/documents_service.py" "services/deadlines_service.py" "services/hearings_service.py" "gateway/app.py")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "Arquivo necessário não encontrado: $file"
        exit 1
    else
        info " $file"
    fi
done

log "Todos os arquivos necessários encontrados "

# Verificar se as portas estão disponíveis
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

PORTS=(5001 5002 5003 8000)
BUSY_PORTS=()

for port in "${PORTS[@]}"; do
    if ! check_port $port; then
        BUSY_PORTS+=($port)
    fi
done

if [ ${#BUSY_PORTS[@]} -ne 0 ]; then
    warn "As seguintes portas estão em uso: ${BUSY_PORTS[*]}"
    warn "Os serviços podem falhar ao iniciar"
    echo -n "Continuar mesmo assim? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        info "Execução cancelada pelo usuário"
        exit 0
    fi
fi

# Função de limpeza
cleanup() {
    echo
    log "Encerrando serviços..."
    if [ -n "${DOCS_PID:-}" ]; then kill $DOCS_PID 2>/dev/null || true; fi
    if [ -n "${DEAD_PID:-}" ]; then kill $DEAD_PID 2>/dev/null || true; fi
    if [ -n "${HEAR_PID:-}" ]; then kill $HEAR_PID 2>/dev/null || true; fi
    if [ -n "${GATE_PID:-}" ]; then kill $GATE_PID 2>/dev/null || true; fi
    
    # Aguardar um pouco para os processos terminarem
    sleep 2
    
    # Forçar kill se necessário
    for pid in "${DOCS_PID:-}" "${DEAD_PID:-}" "${HEAR_PID:-}" "${GATE_PID:-}"; do
        if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
            warn "Forçando encerramento do processo $pid"
            kill -9 $pid 2>/dev/null || true
        fi
    done
    
    log "Todos os serviços foram encerrados"
    log "Ambiente virtual ainda está ativo. Use 'deactivate' para sair."
}

# Configurar trap para limpeza
trap cleanup INT TERM EXIT

# Iniciar serviços
log "Iniciando serviços..."

log "Iniciando Serviço de Documentos (porta 5001)..."
( python services/documents_service.py ) & DOCS_PID=$!
sleep 1

log "Iniciando Serviço de Prazos (porta 5002)..."
( python services/deadlines_service.py ) & DEAD_PID=$!
sleep 1

log "Iniciando Serviço de Audiências (porta 5003)..."
( python services/hearings_service.py ) & HEAR_PID=$!
sleep 1

log "Iniciando API Gateway (porta 8000)..."
( python gateway/app.py ) & GATE_PID=$!
sleep 2

# Verificar se os serviços iniciaram corretamente
log "Verificando se os serviços estão respondendo..."

check_service() {
    local url=$1
    local name=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --connect-timeout 2 "$url" > /dev/null 2>&1; then
            log "$name está respondendo "
            return 0
        fi
        sleep 1
        ((attempt++))
    done
    
    error "$name não está respondendo após $max_attempts tentativas"
    return 1
}

# Verificar serviços (com timeout)
SERVICES_OK=true
check_service "http://127.0.0.1:8000/health" "API Gateway" || SERVICES_OK=false

if [ "$SERVICES_OK" = true ]; then
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    SERVIÇOS INICIADOS                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    log "PIDs dos processos:"
    info "  • Documentos:  $DOCS_PID (porta 5001)"
    info "  • Prazos:      $DEAD_PID (porta 5002)"
    info "  • Audiências:  $HEAR_PID (porta 5003)"
    info "  • API Gateway: $GATE_PID (porta 8000)"
    echo
    log "URLs de acesso:"
    info "  • Interface Web:  http://127.0.0.1:8000/ui"
    info "  • Health Check:   http://127.0.0.1:8000/health"
    info "  • API Gateway:    http://127.0.0.1:8000"
    echo
    log "Usuários de teste:"
    info "  • admin/admin123    (todas as permissões)"
    info "  • lawyer/lawyer123  (read, write, orchestrate)"
    info "  • intern/intern123  (apenas read)"
    echo
    log "Comandos úteis:"
    info "  • Testes de segurança: python -m pytest tests/test_security.py -v"
    info "  • Testes integração:   python -m pytest tests/test_integration.py -v"
    info "  • Health check:        curl http://127.0.0.1:8000/health"
    echo
    warn "Pressione Ctrl+C para parar todos os serviços"
    echo
    
    # Aguardar todos os processos
    wait
else
    error "Alguns serviços falharam ao iniciar. Verifique os logs acima."
    exit 1
fi
