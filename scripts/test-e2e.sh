#!/usr/bin/env bash

set -euo pipefail

PORT="${PORT:-3064}"
BASE_URL="${BASE_URL:-http://localhost:${PORT}}"
SERVER_STARTED=0
SERVER_PID=""
LOG_FILE=""

cleanup() {
  if [[ "${SERVER_STARTED}" == "1" && -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi

  if [[ -n "${LOG_FILE}" && -f "${LOG_FILE}" ]]; then
    rm -f "${LOG_FILE}"
  fi
}

wait_for_server() {
  local attempts=60

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
      return 0
    fi

    if [[ "${SERVER_STARTED}" == "1" && -n "${SERVER_PID}" ]] && ! kill -0 "${SERVER_PID}" 2>/dev/null; then
      echo "E2E server exited before becoming healthy." >&2
      if [[ -n "${LOG_FILE}" && -f "${LOG_FILE}" ]]; then
        cat "${LOG_FILE}" >&2
      fi
      return 1
    fi

    sleep 1
  done

  echo "Timed out waiting for ${BASE_URL}/api/health" >&2
  if [[ -n "${LOG_FILE}" && -f "${LOG_FILE}" ]]; then
    cat "${LOG_FILE}" >&2
  fi
  return 1
}

trap cleanup EXIT

if ! curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
  LOG_FILE="$(mktemp -t 7care-e2e-server.XXXXXX.log)"
  PORT="${PORT}" npm run dev >"${LOG_FILE}" 2>&1 &
  SERVER_PID=$!
  SERVER_STARTED=1
  wait_for_server
fi

BASE_URL="${BASE_URL}" npx playwright test "$@"
