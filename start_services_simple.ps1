# Script Simplificado de Inicialização
# Execute: .\start_services_simple.ps1

Write-Host "=== INICIANDO JURISFLOW ===" -ForegroundColor Cyan
Write-Host ""

# Limpar processos anteriores
Write-Host "[1/7] Limpando processos anteriores..." -ForegroundColor Yellow
Get-Process py,python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

# Ativar ambiente virtual
Write-Host "[2/7] Ativando ambiente virtual..." -ForegroundColor Yellow
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    .\.venv\Scripts\Activate.ps1
} else {
    Write-Host "ERRO: Ambiente virtual não encontrado!" -ForegroundColor Red
    Write-Host "Execute: py -m venv .venv" -ForegroundColor Yellow
    exit 1
}

# Iniciar Auth Service
Write-Host "[3/7] Iniciando Auth Service (porta 5004)..." -ForegroundColor Yellow
Start-Process py -ArgumentList "-m","services.auth.app" -WindowStyle Hidden
Start-Sleep 3

# Iniciar Processes Service
Write-Host "[4/7] Iniciando Processes Service (porta 5005)..." -ForegroundColor Yellow
Start-Process py -ArgumentList "-m","services.processes.app" -WindowStyle Hidden
Start-Sleep 3

# Iniciar Documents Service
Write-Host "[5/7] Iniciando Documents Service (porta 5001)..." -ForegroundColor Yellow
Start-Process py -ArgumentList "services\documents_service.py" -WindowStyle Hidden
Start-Sleep 3

# Iniciar Deadlines Service
Write-Host "[6/7] Iniciando Deadlines Service (porta 5002)..." -ForegroundColor Yellow
Start-Process py -ArgumentList "services\deadlines_service.py" -WindowStyle Hidden
Start-Sleep 3

# Iniciar Hearings Service
Write-Host "[7/7] Iniciando Hearings Service (porta 5003)..." -ForegroundColor Yellow
Start-Process py -ArgumentList "services\hearings_service.py" -WindowStyle Hidden
Start-Sleep 3

# Iniciar API Gateway
Write-Host "[FINAL] Iniciando API Gateway (porta 8000)..." -ForegroundColor Yellow
Start-Process py -ArgumentList "gateway\app.py" -WindowStyle Hidden
Start-Sleep 5

Write-Host ""
Write-Host "=== VERIFICANDO SERVIÇOS ===" -ForegroundColor Cyan
Write-Host ""

# Contar processos Python
$pythonProcesses = (Get-Process py,python -ErrorAction SilentlyContinue).Count
Write-Host "Processos Python rodando: $pythonProcesses" -ForegroundColor $(if($pythonProcesses -ge 6){"Green"}else{"Red"})

# Verificar portas
Write-Host ""
Write-Host "Verificando portas:" -ForegroundColor Cyan
$ports = @(5001, 5002, 5003, 5004, 5005, 8000)
$portsOK = 0

foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "  ✅ Porta $port ATIVA" -ForegroundColor Green
        $portsOK++
    } else {
        Write-Host "  ❌ Porta $port INATIVA" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESULTADO ===" -ForegroundColor Cyan
Write-Host ""

if ($portsOK -eq 6) {
    Write-Host "✅ SUCESSO! Todos os serviços estão rodando!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Acesse: http://127.0.0.1:8000/ui" -ForegroundColor Cyan
    Write-Host "Health: http://127.0.0.1:8000/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para parar os serviços:" -ForegroundColor Yellow
    Write-Host "  Get-Process py,python | Stop-Process -Force" -ForegroundColor White
} else {
    Write-Host "⚠️  ATENÇÃO: Apenas $portsOK de 6 serviços iniciaram" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "  1. Portas já estão em uso" -ForegroundColor White
    Write-Host "  2. Firewall bloqueando" -ForegroundColor White
    Write-Host "  3. Dependências faltando" -ForegroundColor White
    Write-Host ""
    Write-Host "Tente:" -ForegroundColor Yellow
    Write-Host "  1. Executar como Administrador" -ForegroundColor White
    Write-Host "  2. pip install -r requirements.txt" -ForegroundColor White
    Write-Host "  3. Verificar logs: py services\deadlines_service.py" -ForegroundColor White
}

Write-Host ""
