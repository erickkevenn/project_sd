#!/bin/bash

# Script para executar todos os testes do projeto com pytest

echo
echo "================================================================="
echo "                 INICIANDO BATERIA DE TESTES"
echo "================================================================="
echo

# Executa todos os testes com pytest, incluindo refatoração, autenticação, integração e segurança
pytest -v tests/test_auth.py tests/test_integration.py tests/test_security.py test_refactoring.py

echo
echo "================================================================="
echo "                  TESTES CONCLUÍDOS"
echo "================================================================="
echo