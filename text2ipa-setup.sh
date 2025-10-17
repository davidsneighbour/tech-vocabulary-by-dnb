#!/bin/bash
# Sets up a local virtual environment for text2ipa.py
# Run once per project to create venv under .venv

set -euo pipefail

show_help() {
  echo "Usage: ${FUNCNAME[0]} [--help]"
  echo "Creates a Python virtual environment in .venv and installs required packages."
  echo
  echo "Flags:"
  echo "  --help   Show this help message."
}

if [[ "${1:-}" == "--help" ]]; then
  show_help
  exit 0
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="${PROJECT_ROOT}/.venv"

if [[ ! -d "${VENV_PATH}" ]]; then
  echo "[+] Creating virtual environment at ${VENV_PATH}"
  python3 -m venv "${VENV_PATH}"
else
  echo "[+] Virtual environment already exists."
fi

echo "[+] Activating environment and installing dependencies..."
# shellcheck disable=SC1091
source "${VENV_PATH}/bin/activate"

pip install --upgrade pip
pip install eng-to-ipa pronouncing

deactivate
echo "[✓] Virtual environment ready at ${VENV_PATH}"
