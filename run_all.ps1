# Script para executar todos os servicos da Plataforma de Orquestracao Juridica
# Autor: Sistema SOA
# Data: 2024

param(
    [switch]$Help,
    [switch]$SkipSetup
)

# Funcao para exibir ajuda
if ($Help) {
    Write-Host "=== PLATAFORMA DE ORQUESTRACAO JURIDICA - SOA ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\run_all.ps1 [opcoes]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Yellow
    Write-Host "  -Help        Exibe esta ajuda" -ForegroundColor White
    Write-Host "  -SkipSetup   Pula a configuracao inicial" -ForegroundColor White
    Write-Host ""
    Write-Host "Servicos que serao iniciados:" -ForegroundColor Yellow
    Write-Host "  • Documentos Service (porta 5001)" -ForegroundColor White
    Write-Host "  • Deadlines Service (porta 5002)" -ForegroundColor White
    Write-Host "  • Hearings Service (porta 5003)" -ForegroundColor White
    Write-Host "  • API Gateway (porta 8000)" -ForegroundColor White
    Write-Host ""
    Write-Host "URLs de acesso:" -ForegroundColor Yellow
    Write-Host "  • Interface Web: http://127.0.0.1:8000/ui" -ForegroundColor White
    Write-Host "  • Health Check: http://127.0.0.1:8000/health" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Funcao para logs coloridos
function Write-ColorLog {
    param($Message, $Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

# Verificar Python
Write-ColorLog "Verificando Python..." "Green"
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
} else {
    Write-ColorLog "Python nao encontrado! Instale Python 3.8+ e tente novamente." "Red"
    exit 1
}

Write-ColorLog "Python encontrado: $pythonCmd" "Green"

# Configuracao inicial
if (-not $SkipSetup) {
    Write-ColorLog "Configurando ambiente..." "Green"
    
    # Criar ambiente virtual
    if (-not (Test-Path ".venv")) {
        Write-ColorLog "Criando ambiente virtual..." "Green"
        & $pythonCmd -m venv .venv
        if ($LASTEXITCODE -ne 0) {
            Write-ColorLog "Falha ao criar ambiente virtual" "Red"
            exit 1
        }
    }
    
    # Ativar ambiente virtual
    $activateScript = ".venv\Scripts\Activate.ps1"
    if (Test-Path $activateScript) {
        Write-ColorLog "Ativando ambiente virtual..." "Green"
        & $activateScript
    }
    
    # Atualizar pip
    Write-ColorLog "Atualizando pip..." "Green"
    & $pythonCmd -m pip install --upgrade pip --quiet
    
    # Instalar dependencias
    if (Test-Path "requirements.txt") {
        Write-ColorLog "Instalando dependencias..." "Green"
        & pip install -r requirements.txt --quiet
        if ($LASTEXITCODE -ne 0) {
            Write-ColorLog "Falha ao instalar dependencias" "Red"
            exit 1
        }
        Write-ColorLog "Dependencias instaladas OK" "Green"
    }
    
    # Criar .env se nao existir
    if ((-not (Test-Path ".env")) -and (Test-Path "env.example")) {
        Write-ColorLog "Criando arquivo .env..." "Green"
        Copy-Item "env.example" ".env"
    }
}

# Verificar arquivos necessarios
$requiredFiles = @(
    "gateway\app.py",
    "services\documents\app.py",
    "services\deadlines\app.py",
    "services\hearings\app.py",
    "services\auth\app.py",
    "services\processes\app.py"
)

Write-ColorLog "Verificando arquivos necessarios..." "Green"
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-ColorLog "Arquivo nao encontrado: $file" "Red"
        exit 1
    }
}

# Verificar portas
Write-ColorLog "Verificando portas..." "Green"
$ports = @(5001, 5002, 5003, 5004, 5005, 8000)
$busyPorts = @()

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $busyPorts += $port
    }
}

if ($busyPorts.Count -gt 0) {
    Write-ColorLog "Portas ocupadas: $($busyPorts -join ', ')" "Yellow"
    Write-ColorLog "Parando processos existentes e continuando..." "Yellow"
}

# Parar processos Python existentes
Write-ColorLog "Parando processos Python existentes..." "Green"
$processes = Get-Process python -ErrorAction SilentlyContinue
if ($processes) {
    $processes | Stop-Process -Force
    Write-ColorLog "Processos Python parados" "Green"
}

# Iniciar servicos
Write-ColorLog "Iniciando servicos..." "Cyan"

Write-ColorLog "Iniciando Documentos (5001)..." "Green"
$docsProcess = Start-Process $pythonCmd -ArgumentList "-m services.documents.app" -PassThru -WindowStyle Hidden
Start-Sleep 2

Write-ColorLog "Iniciando Prazos (5002)..." "Green"
$deadProcess = Start-Process $pythonCmd -ArgumentList "-m services.deadlines.app" -PassThru -WindowStyle Hidden
Start-Sleep 2

Write-ColorLog "Iniciando Audiencias (5003)..." "Green"
$hearProcess = Start-Process $pythonCmd -ArgumentList "-m services.hearings.app" -PassThru -WindowStyle Hidden
Start-Sleep 2

Write-ColorLog "Iniciando Auth (5004)..." "Green"
$authProcess = Start-Process $pythonCmd -ArgumentList "-m services.auth.app" -PassThru -WindowStyle Hidden
Start-Sleep 2

Write-ColorLog "Iniciando Processes (5005)..." "Green"
$procProcess = Start-Process $pythonCmd -ArgumentList "-m services.processes.app" -PassThru -WindowStyle Hidden
Start-Sleep 2

Write-ColorLog "Iniciando API Gateway (8000)..." "Green"
$gateProcess = Start-Process $pythonCmd -ArgumentList "gateway\app.py" -PassThru -WindowStyle Hidden
Start-Sleep 3

# Verificar se Gateway esta respondendo
Write-ColorLog "Verificando servicos..." "Green"
$maxAttempts = 10
$attempt = 1
$gatewayOk = $false

while ($attempt -le $maxAttempts -and -not $gatewayOk) {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health?fast=1" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response -and $response.StatusCode -eq 200) {
        $gatewayOk = $true
        Write-ColorLog "API Gateway esta respondendo" "Green"
    } else {
        Start-Sleep 1
        $attempt++
    }
}

if ($gatewayOk) {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "                    SERVICOS INICIADOS                        " -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    
    Write-ColorLog "PIDs dos processos:" "Cyan"
    Write-Host "  • Documentos:  $($docsProcess.Id) (porta 5001)" -ForegroundColor Cyan
    Write-Host "  • Prazos:      $($deadProcess.Id) (porta 5002)" -ForegroundColor Cyan
    Write-Host "  • Audiencias:  $($hearProcess.Id) (porta 5003)" -ForegroundColor Cyan
    Write-Host "  • Auth:       $($authProcess.Id) (porta 5004)" -ForegroundColor Cyan
    Write-Host "  • Processes:  $($procProcess.Id) (porta 5005)" -ForegroundColor Cyan
    Write-Host "  • API Gateway: $($gateProcess.Id) (porta 8000)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "URLs de acesso:" "Cyan"
    Write-Host "  • Interface Web:  http://127.0.0.1:8000/ui" -ForegroundColor Cyan
    Write-Host "  • Health Check:   http://127.0.0.1:8000/health" -ForegroundColor Cyan
    Write-Host "  • API Gateway:    http://127.0.0.1:8000" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "Usuarios de teste:" "Cyan"
    Write-Host "  • admin/admin123    (todas as permissoes)" -ForegroundColor Cyan
    Write-Host "  • lawyer/lawyer123  (read, write, orchestrate)" -ForegroundColor Cyan
    Write-Host "  • intern/intern123  (apenas read)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "Comandos uteis:" "Cyan"
    Write-Host "  • Testes: python -m pytest tests/test_security.py -v" -ForegroundColor Cyan
    Write-Host "  • Health: curl http://127.0.0.1:8000/health" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorLog "Pressione Ctrl+C para parar todos os servicos" "Yellow"
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
    Write-ColorLog "API Gateway nao esta respondendo apos $maxAttempts tentativas" "Red"
    exit 1
}

# Limpeza final
Write-ColorLog "Parando servicos..." "Green"
$processes = Get-Process python -ErrorAction SilentlyContinue
if ($processes) {
    $processes | Stop-Process -Force
    Write-ColorLog "Servicos parados" "Green"
}

Write-ColorLog "Script finalizado" "Green"