#!/usr/bin/env bash
set -euo pipefail
( python services/documents_service.py ) & DOCS_PID=$!
( python services/deadlines_service.py ) & DEAD_PID=$!
( python services/hearings_service.py )  & HEAR_PID=$!
( python gateway/app.py )                & GATE_PID=$!
trap 'echo; echo "Shutting down..."; kill $DOCS_PID $DEAD_PID $HEAR_PID $GATE_PID 2>/dev/null || true' INT TERM
echo "PIDs => docs:$DOCS_PID deadlines:$DEAD_PID hearings:$HEAR_PID gateway:$GATE_PID"
echo "Press Ctrl+C to stop all."
wait
