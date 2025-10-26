#!/usr/bin/env bash
set -euo pipefail

echo "[tests] Rodando suite de testes..."

if command -v python >/dev/null 2>&1; then
  PY=python
else
  PY=python3
fi

$PY -m pytest -v -s --maxfail=1 --disable-warnings --color=yes

echo "[tests] Suite finalizada"



