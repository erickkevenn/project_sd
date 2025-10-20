# Script de inicialização minimalista para Windows

# Verificar arquivos necessários
$requiredFiles = @(
    "services\auth_service\app.py",
    "services\processes_service\app.py",
    "services\documents_service\app.py",
    "services\deadlines_service\app.py", 
    "services\hearings_service\app.py",
    "gateway\app.py"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "Arquivo não encontrado: $file" -ForegroundColor Red
        exit 1
    }
}

# Iniciar serviços
Write-Host "Iniciando serviços..." -ForegroundColor Cyan

Start-Process python -ArgumentList "services\auth_service\app.py" -PassThru -WindowStyle Hidden
Start-Process python -ArgumentList "services\processes_service\app.py" -PassThru -WindowStyle Hidden
Start-Process python -ArgumentList "services\documents_service\app.py" -PassThru -WindowStyle Hidden
Start-Process python -ArgumentList "services\deadlines_service\app.py" -PassThru -WindowStyle Hidden
Start-Process python -ArgumentList "services\hearings_service\app.py" -PassThru -WindowStyle Hidden
Start-Process python -ArgumentList "gateway\app.py" -PassThru -WindowStyle Hidden

Start-Sleep 5

# Verificar se Gateway está respondendo
Write-Host "Verificando serviços..." -ForegroundColor Green
$response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "API Gateway está respondendo!" -ForegroundColor Green
} else {
    Write-Host "API Gateway não está respondendo." -ForegroundColor Red
}

# Mantém o script rodando
while ($true) { Start-Sleep 1 }