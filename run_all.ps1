# Script para iniciar todo o projeto (Backend e Frontend) em janelas separadas e visíveis.

$processes = @()

# Registrar um bloco de limpeza para ser executado no encerramento
$cleanup = {
    Write-Host "`nEncerrando todos os processos..." -ForegroundColor Yellow
    $processes | ForEach-Object { 
        Write-Host "Tentando encerrar processo com PID: $($_.Id) (Nome: $($_.ProcessName))" -ForegroundColor DarkYellow
        Start-Sleep -Milliseconds 100 # Pequeno atraso antes de tentar parar
        if (-not $_.HasExited) {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 50 # Pequeno atraso para o processo encerrar
            if (-not $_.HasExited) {
                Write-Warning "Processo $($_.ProcessName) (PID: $($_.Id)) ainda está em execução após tentativa de encerramento forçado."
            }
        }
    }
    Write-Host "Processos encerrados." -ForegroundColor Green
}

Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $cleanup

# Definir os serviços de backend
$backendServices = @{
    "Auth Service"      = "services/auth_service/app.py";
    "Processes Service" = "services/processes_service/app.py";
    "Documents Service" = "services/documents_service/app.py";
    "Deadlines Service" = "services/deadlines_service/app.py";
    "Hearings Service"  = "services/hearings_service/app.py";
    "API Gateway"       = "gateway/app.py";
}

Write-Host "Iniciando serviços de backend em janelas separadas..." -ForegroundColor Cyan

foreach ($name in $backendServices.Keys) {
    $scriptPath = $backendServices[$name]
    if (Test-Path $scriptPath) {
        Write-Host "Iniciando $name..." -ForegroundColor Green
        # Inicia o serviço em uma nova janela do PowerShell
        $proc = Start-Process powershell -ArgumentList "-NoExit -Command python $scriptPath" -WindowStyle Normal -PassThru
        $processes += $proc
        Write-Host "  - [$($proc.Id)] Iniciado: $name" 
        Start-Sleep -Seconds 1 # Pequena pausa para evitar sobrecarga
    } else {
        Write-Host "Arquivo não encontrado para o serviço '$name': $scriptPath" -ForegroundColor Red
    }
}

Write-Host "Aguardando 5 segundos para os serviços iniciarem..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Iniciar frontend
Write-Host "Iniciando servidor do frontend na porta 8080..." -ForegroundColor Cyan
# O frontend é iniciado no terminal atual para facilitar o acesso e visualização de logs do http.server
$frontend_proc = Start-Process python -ArgumentList "-m http.server 8080" -WorkingDirectory "ui" -PassThru
$processes += $frontend_proc
Write-Host "  - [$($frontend_proc.Id)] Frontend iniciado. Acesse em http://localhost:8080/ui/"

Write-Host "`nProjeto iniciado!" -ForegroundColor Green
Write-Host "  - Backend rodando em janelas separadas (verifique-as para logs)"
Write-Host "  - Frontend disponível em http://localhost:8080/"
Write-Host "`nPressione Ctrl+C nesta janela para encerrar todos os serviços." -ForegroundColor Yellow

# Manter o script em execução para que o cleanup funcione com Ctrl+C
while ($true) {
    Start-Sleep -Seconds 1
}