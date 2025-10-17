#!/bin/bash
# Runs text2ipa.py inside the virtual environment, prints IPA, and copies it to the clipboard.
# Example:
#   ./scripts/run-ipa.sh "best kept secret of"
#
# Flags:
#   --help         Show help
#   --no-clip      Do not copy result to clipboard
#   --debug        Print extra info

set -euo pipefail

show_help() {
  echo "Usage: ${FUNCNAME[0]} [--no-clip] [--debug] <phrase>"
  echo "Runs text2ipa.py in the local virtual environment, prints IPA, and copies it to the clipboard."
  echo
  echo "Examples:"
  echo "  ${FUNCNAME[0]} \"move fast and break things\""
  echo "  ${FUNCNAME[0]} --no-clip \"best kept secret of\""
}

copy_to_clipboard() {
  # Copies stdin to the system clipboard using xclip, wl-copy, or xsel.
  # Prefers xclip on Linux Mint (X11). Falls back to wl-copy (Wayland) or xsel.
  if command -v xclip >/dev/null 2>&1; then
    # Avoid adding a trailing newline to clipboard content
    xclip -selection clipboard -in
    return 0
  fi
  if command -v wl-copy >/dev/null 2>&1; then
    wl-copy
    return 0
  fi
  if command -v xsel >/dev/null 2>&1; then
    xsel --clipboard --input
    return 0
  fi
  return 1
}

# Parse flags
do_clip=true
debug=false
args=()
for arg in "$@"; do
  case "${arg}" in
    --help)
      show_help
      exit 0
      ;;
    --no-clip)
      do_clip=false
      ;;
    --debug)
      debug=true
      ;;
    --*)
      echo "[error] Unknown flag: ${arg}" >&2
      show_help
      exit 2
      ;;
    *)
      args+=("${arg}")
      ;;
  esac
done

if [[ "${#args[@]}" -eq 0 ]]; then
  show_help
  exit 0
fi

# Join remaining args as the phrase
phrase="${args[*]}"

# Paths relative to this script directory (as per your change)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="${PROJECT_ROOT}/.venv"
SCRIPT_PATH="${PROJECT_ROOT}/text2ipa.py"

if [[ "${debug}" == true ]]; then
  echo "[debug] PROJECT_ROOT=${PROJECT_ROOT}"
  echo "[debug] VENV_PATH=${VENV_PATH}"
  echo "[debug] SCRIPT_PATH=${SCRIPT_PATH}"
fi

if [[ ! -d "${VENV_PATH}" ]]; then
  echo "[error] Virtual environment not found. Run ./scripts/setup-python-env.sh first." >&2
  exit 1
fi

if [[ ! -f "${SCRIPT_PATH}" ]]; then
  echo "[error] Python script not found at ${SCRIPT_PATH}" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "${VENV_PATH}/bin/activate"

# Capture IPA (no extra newline in clipboard)
ipa="$(python3 "${SCRIPT_PATH}" --text "${phrase}")" || {
  echo "[error] text2ipa failed" >&2
  deactivate
  exit 1
}

deactivate

# Always print to stdout
echo "${ipa}"

# Optionally copy to clipboard
if [[ "${do_clip}" == true ]]; then
  if printf "%s" "${ipa}" | copy_to_clipboard; then
    if [[ "${debug}" == true ]]; then
      echo "[debug] Copied to clipboard." >&2
    fi
  else
    echo "[warn] Clipboard tool not found. Install xclip (Mint/X11) or wl-clipboard (Wayland), or use --no-clip." >&2
  fi
fi
