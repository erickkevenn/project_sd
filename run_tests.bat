@echo off

REM Script para executar todos os testes do projeto

REM Executa os testes de refatoração
echo Executando testes de refatoração...
python test_refactoring.py

REM Executa os testes de autenticação
echo.
echo Executando testes de autenticação...
python tests/test_auth.py
