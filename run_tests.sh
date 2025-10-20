#!/bin/bash

# Script para executar todos os testes do projeto

# Executa os testes de refatoração
echo "Executando testes de refatoração..."
python test_refactoring.py

# Executa os testes de autenticação
echo "\nExecutando testes de autenticação..."
python tests/test_auth.py
