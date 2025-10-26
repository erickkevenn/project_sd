@echo off

REM Script para executar todos os testes do projeto com pytest

echo.
echo =================================================================
echo                  INICIANDO BATERIA DE TESTES
echo =================================================================
echo.

echo.
echo =================================================================
echo                VERIFICANDO SAUDE DOS SERVICOS
echo =================================================================
echo.

python check_services.py
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo =================================================================
    echo         ERRO: SERVICOS NAO ESTAO PRONTOS. ABORTANDO TESTES.
    echo =================================================================
    echo.
    exit /b %ERRORLEVEL%
)

echo.
echo =================================================================
echo                SERVICOS PRONTOS, INICIANDO PYTEST
echo =================================================================
echo.

REM Executa todos os testes com pytest, incluindo refatoração, autenticação, integração e segurança
pytest -v tests/test_auth.py tests/test_integration.py tests/test_security.py test_refactoring.py

echo.
echo =================================================================
echo                   TESTES CONCLUÍDOS
echo =================================================================
echo.
