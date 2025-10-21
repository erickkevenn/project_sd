#!/bin/bash

# Script para executar todos os testes do projeto com pytest

echo
echo "================================================================="
echo "                 INICIANDO BATERIA DE TESTES"
echo "================================================================="
echo

echo
echo "================================================================="
echo "               VERIFICANDO SAUDE DOS SERVICOS"
echo "================================================================="
echo

python check_services.py
if [ $? -ne 0 ]; then
    echo
    echo "================================================================="
    echo "        ERRO: SERVICOS NAO ESTAO PRONTOS. ABORTANDO TESTES."
    echo "================================================================="
    echo
    exit 1
fi

echo
echo "================================================================="
echo "               SERVICOS PRONTOS, INICIANDO PYTEST"
echo "================================================================="
echo

# Executa todos os testes com pytest, incluindo refatoração, autenticação, integração e segurança
pytest -v tests/test_auth.py tests/test_integration.py tests/test_security.py test_refactoring.py

echo
echo "================================================================="
echo "                  TESTES CONCLUÍDOS"
echo "================================================================="
echo
