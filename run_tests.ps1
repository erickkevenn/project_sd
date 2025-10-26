param(
    [switch]$Watch
)

Write-Host "[tests] Rodando suite de testes..." -ForegroundColor Green

$pythonCmd = "python"
if (Get-Command py -ErrorAction SilentlyContinue) { $pythonCmd = "py" }

if ($Watch) {
    & $pythonCmd -m pytest -v -s --maxfail=1 --disable-warnings --color=yes --testmon
} else {
    & $pythonCmd -m pytest -v -s --maxfail=1 --disable-warnings --color=yes
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "[tests] Sucesso" -ForegroundColor Green
} else {
    Write-Host "[tests] Falhas detectadas" -ForegroundColor Red
}



