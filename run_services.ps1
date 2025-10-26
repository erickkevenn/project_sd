# Script para iniciar todos os serviços em janelas separadas, mostrando a saída diretamente.

Write-Host "Iniciando serviços em janelas separadas..." -ForegroundColor Cyan

$services = @{
    "Auth Service"      = "services/auth_service/app.py";
    "Processes Service" = "services/processes_service/app.py";
    "Documents Service" = "services/documents_service/app.py";
    "Deadlines Service" = "services/deadlines_service/app.py";
    "Hearings Service"  = "services/hearings_service/app.py";
    "API Gateway"       = "gateway/app.py";
}

foreach ($name in $services.Keys) {
    $scriptPath = $services[$name]
    if (Test-Path $scriptPath) {
        Write-Host "Iniciando $name..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit -Command python $scriptPath" -WindowStyle Normal
        Start-Sleep -Seconds 1 # Pequena pausa para evitar sobrecarga
    } else {
        Write-Host "Arquivo não encontrado para o serviço '$name': $scriptPath" -ForegroundColor Red
    }
}

Write-Host "`nTodos os serviços foram iniciados em janelas separadas." -ForegroundColor Green
Write-Host "Verifique as novas janelas do PowerShell para a saída de cada serviço." -ForegroundColor Yellow
Write-Host "Pressione Enter para fechar esta janela de controle." -ForegroundColor Yellow
Read-Host
