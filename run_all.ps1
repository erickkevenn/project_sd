# Plataforma de Orquestração Jurídica - SOA + Flask
# Script de setup e execução automatizado para Windows

param(
    [switch]$SkipSetup,
    [switch]$Help
)

if ($Help) {
    Write-Host "Plataforma de Orquestração Jurídica - SOA + Flask"
    Write-Host ""
    Write-Host "USAGE:"
    Write-Host "    .\run_all.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "    -SkipSetup    Pula o setup inicial"
    Write-Host "    -Help         Exibe esta ajuda"
    Write-Host ""
    Write-Host "EXAMPLES:"
    Write-Host "    .\run_all.ps1                 # Setup completo e execução"
    Write-Host "    .\run_all.ps1 -SkipSetup      # Apenas execução"
    exit 0
}

function Write-ColorLog {
    param([string]$Message, [string]$Color = "Green")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

# Banner
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Plataforma de Orquestração Jurídica                ║" -ForegroundColor Cyan
Write-Host "║                    SOA + Flask                               ║" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "║  API Gateway com Segurança Implementada                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar Python
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} else {
    Write-ColorLog "Python não encontrado. Instale Python 3.8+ e tente novamente." "Red"
    Write-Host "Download: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

$pythonVersion = & $pythonCmd --version 2>&1
Write-ColorLog "Python detectado: $pythonVersion" "Green"

if (-not $SkipSetup) {
    Write-ColorLog "Iniciando setup..." "Cyan"
    
    # Criar ambiente virtual
    if (-not (Test-Path ".venv")) {
        Write-ColorLog "Criando ambiente virtual..." "Green"
        & $pythonCmd -m venv .venv
        if ($LASTEXITCODE -ne 0) {
            Write-ColorLog "Falha ao criar ambiente virtual" "Red"
            exit 1
        }
        Write-ColorLog "Ambiente virtual criado " "Green"
    } else {
        Write-ColorLog "Ambiente virtual já existe" "Yellow"
    }

    # Ativar ambiente virtual
    Write-ColorLog "Ativando ambiente virtual..." "Green"
    $activateScript = ".\.venv\Scripts\Activate.ps1"
    if (Test-Path $activateScript) {
        & $activateScript
        Write-ColorLog "Ambiente virtual ativado " "Green"
    } else {
        Write-ColorLog "Script de ativação não encontrado" "Red"
        Write-ColorLog "Tente: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" "Yellow"
        exit 1
    }

    # Atualizar pip
    Write-ColorLog "Atualizando pip..." "Green"
    & python -m pip install --upgrade pip --quiet

    # Instalar dependências básicas
    if (Test-Path "requirements.txt") {
        Write-ColorLog "Instalando dependências básicas..." "Green"
        & pip install -r requirements.txt --quiet
        if ($LASTEXITCODE -ne 0) {
            Write-ColorLog "Falha ao instalar dependências básicas" "Red"
            exit 1
        }
        Write-ColorLog "Dependências básicas instaladas ✓" "Green"
    } else {
        Write-ColorLog "requirements.txt não encontrado" "Red"
        exit 1
    }

    # Instalar dependências gRPC opcionais
    Write-ColorLog "Instalando dependências gRPC..." "Green"
    if (Test-Path "requirements-grpc.txt") {
        & pip install -r requirements-grpc.txt --quiet
        if ($LASTEXITCODE -eq 0) {
            Write-ColorLog "Dependências gRPC instaladas ✓" "Green"
        } else {
            Write-ColorLog "Falha ao instalar gRPC via requirements-grpc.txt, tentando versões pré-compiladas..." "Yellow"
            & pip install --only-binary=grpcio grpcio grpcio-tools protobuf --quiet
            if ($LASTEXITCODE -eq 0) {
                Write-ColorLog "Dependências gRPC pré-compiladas instaladas ✓" "Green"
            } else {
                Write-ColorLog "Não foi possível instalar gRPC. O sistema funcionará apenas com HTTP." "Yellow"
            }
        }
    } else {
        Write-ColorLog "requirements-grpc.txt não encontrado, tentando instalar gRPC diretamente..." "Yellow"
        & pip install --only-binary=grpcio grpcio grpcio-tools protobuf --quiet
        if ($LASTEXITCODE -eq 0) {
            Write-ColorLog "Dependências gRPC instaladas ✓" "Green"
        } else {
            Write-ColorLog "Não foi possível instalar gRPC. O sistema funcionará apenas com HTTP." "Yellow"
        }
    }

    # Verificar dependências críticas
    Write-ColorLog "Verificando dependências críticas..." "Green"
    & python -c "import flask, requests, flask_cors, flask_limiter, jwt, marshmallow, flask_talisman, cryptography, dotenv; print('Dependências básicas OK ✓')" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorLog "Dependências básicas verificadas ✓" "Green"
    } else {
        Write-ColorLog "Algumas dependências básicas podem estar faltando, mas continuando..." "Yellow"
    }

    # Verificar dependências gRPC
    Write-ColorLog "Verificando dependências gRPC..." "Green"
    & python -c "import grpc, grpc_tools; print('gRPC disponível ✓')" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorLog "gRPC verificado ✓" "Green"
        Write-ColorLog "gRPC está disponível - middleware gRPC ativo" "Cyan"
    } else {
        Write-ColorLog "gRPC não disponível - sistema funcionará apenas com HTTP" "Yellow"
    }

    # Criar .env
    if ((-not (Test-Path ".env")) -and (Test-Path "env.example")) {
        Write-ColorLog "Criando arquivo .env..." "Green"
        Copy-Item "env.example" ".env"
        Write-ColorLog "Arquivo .env criado " "Green"
    }
}

# Verificar arquivos necessários
$requiredFiles = @(
    "services\documents_service.py",
    "services\deadlines_service.py", 
    "services\hearings_service.py",
    "gateway\app.py"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-ColorLog "Arquivo não encontrado: $file" "Red"
        exit 1
    }
}

Write-ColorLog "Todos os arquivos encontrados " "Green"

# Verificar portas
$ports = @(5001, 5002, 5003, 8000)
$busyPorts = @()

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $busyPorts += $port
    }
}

if ($busyPorts.Count -gt 0) {
    Write-ColorLog "Portas em uso: $($busyPorts -join ', ')" "Yellow"
    $response = Read-Host "Continuar? (y/N)"
    if ($response -notmatch '^[Yy]$') {
        Write-ColorLog "Cancelado pelo usuário" "Yellow"
        exit 0
    }
}

# Função de limpeza
function Stop-AllServices {
    Write-ColorLog "Parando serviços..." "Yellow"
    $processes = Get-Process -Name "python*" -ErrorAction SilentlyContinue
    if ($processes) {
        $processes | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-ColorLog "Processos Python parados" "Green"
    }
}

# Iniciar serviços
Write-ColorLog "Iniciando serviços..." "Cyan"

Write-ColorLog "Iniciando Documentos (5001)..." "Green"
$docsProcess = Start-Process python -ArgumentList "services\documents_service.py" -PassThru -WindowStyle Hidden
Start-Sleep 2

Write-ColorLog "Iniciando Prazos (5002)..." "Green"
$deadProcess = Start-Process python -ArgumentList "services\deadlines_service.py" -PassThru -WindowStyle Hidden
Start-Sleep 2

Write-ColorLog "Iniciando Audiências (5003)..." "Green"
$hearProcess = Start-Process python -ArgumentList "services\hearings_service.py" -PassThru -WindowStyle Hidden
Start-Sleep 2

Write-ColorLog "Iniciando API Gateway (8000)..." "Green"
$gateProcess = Start-Process python -ArgumentList "gateway\app.py" -PassThru -WindowStyle Hidden
Start-Sleep 3

# Verificar se Gateway está respondendo
Write-ColorLog "Verificando serviços..." "Green"
$maxAttempts = 10
$attempt = 1
$gatewayOk = $false

while ($attempt -le $maxAttempts -and -not $gatewayOk) {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response -and $response.StatusCode -eq 200) {
        $gatewayOk = $true
        Write-ColorLog "API Gateway está respondendo " "Green"
    } else {
        Start-Sleep 1
        $attempt++
    }
}

if ($gatewayOk) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                    SERVIÇOS INICIADOS                        ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    Write-ColorLog "PIDs dos processos:" "Cyan"
    Write-Host "  • Documentos:  $($docsProcess.Id) (porta 5001)" -ForegroundColor Cyan
    Write-Host "  • Prazos:      $($deadProcess.Id) (porta 5002)" -ForegroundColor Cyan
    Write-Host "  • Audiências:  $($hearProcess.Id) (porta 5003)" -ForegroundColor Cyan
    Write-Host "  • API Gateway: $($gateProcess.Id) (porta 8000)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "URLs de acesso:" "Cyan"
    Write-Host "  • Interface Web:  http://127.0.0.1:8000/ui" -ForegroundColor Cyan
    Write-Host "  • Health Check:   http://127.0.0.1:8000/health" -ForegroundColor Cyan
    Write-Host "  • API Gateway:    http://127.0.0.1:8000" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "Usuários de teste:" "Cyan"
    Write-Host "  • admin/admin123    (todas as permissões)" -ForegroundColor Cyan
    Write-Host "  • lawyer/lawyer123  (read, write, orchestrate)" -ForegroundColor Cyan
    Write-Host "  • intern/intern123  (apenas read)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "Comandos úteis:" "Cyan"
    Write-Host "  • Testes: python -m pytest tests/test_security.py -v" -ForegroundColor Cyan
    Write-Host "  • Health: curl http://127.0.0.1:8000/health" -ForegroundColor Cyan
    Write-Host "  • Health (gRPC): curl -H 'X-Prefer-Protocol: grpc' http://127.0.0.1:8000/health" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "Middleware gRPC:" "Cyan"
    Write-Host "  • Para usar gRPC: adicione header 'X-Prefer-Protocol: grpc'" -ForegroundColor Cyan
    Write-Host "  • Ou use parâmetro: ?protocol=grpc" -ForegroundColor Cyan
    Write-Host "  • Status gRPC: verificar header 'X-GRPC-Status' na resposta" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "Pressione Ctrl+C para parar todos os serviços" "Yellow"
    Write-Host ""

    # Loop principal - aguardar Ctrl+C
    while ($true) {
        Start-Sleep 1
        if ($gateProcess.HasExited) {
            Write-ColorLog "API Gateway parou inesperadamente" "Red"
            break
        }
    }
} else {
    Write-ColorLog "API Gateway não está respondendo após $maxAttempts tentativas" "Red"
    Stop-AllServices
    exit 1
}

# Limpeza final
Stop-AllServices