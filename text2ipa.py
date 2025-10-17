#!/usr/bin/env python3
"""
text2ipa.py — Convert English text to an IPA pronunciation string.

Priority:
1) eng_to_ipa.convert(text)
2) pronouncing + ARPAbet→IPA fallback (word-by-word)

Usage:
  python3 text2ipa.py --text "best kept secret of"
  python3 text2ipa.py --file ./phrases.txt
Options:
  --text <str>           Convert a single phrase.
  --file <path>          Convert each line of a file (blank lines ignored).
  --sep <str>            Separator between words (default: single space).
  --debug                Print intermediate info.
Exit codes:
  0 on success, non-zero on error.
"""

from __future__ import annotations
import argparse
import sys
from typing import List

try:
    import eng_to_ipa as ipa
except Exception:  # noqa: BLE001
    ipa = None  # lazy-fallback

try:
    import pronouncing
except Exception:  # noqa: BLE001
    pronouncing = None

ARPABET_TO_IPA = {
    # Consonants
    "P": "p", "B": "b", "T": "t", "D": "d", "K": "k", "G": "ɡ",
    "CH": "t͡ʃ", "JH": "d͡ʒ",
    "F": "f", "V": "v", "TH": "θ", "DH": "ð",
    "S": "s", "Z": "z", "SH": "ʃ", "ZH": "ʒ",
    "HH": "h", "M": "m", "N": "n", "NG": "ŋ",
    "L": "l", "R": "ɹ", "Y": "j", "W": "w",
    # Vowels (stress digits stripped)
    "AA": "ɑ", "AE": "æ", "AH": "ʌ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ",
    "EH": "ɛ", "ER": "ɝ", "EY": "eɪ",
    "IH": "ɪ", "IY": "i",
    "OW": "oʊ", "OY": "ɔɪ",
    "UH": "ʊ", "UW": "u",
}

def _arpabet_symbol_to_ipa(sym: str) -> str:
    # Strip stress digits from vowels (e.g., AE1 → AE)
    base = "".join([c for c in sym if not c.isdigit()])
    return ARPABET_TO_IPA.get(base, base.lower())

def arpabet_list_to_ipa(arpa: List[str]) -> str:
    return " ".join(_arpabet_symbol_to_ipa(s) for s in arpa)

def words_to_ipa_with_pronouncing(words: List[str], debug: bool = False) -> str:
    if pronouncing is None:
        raise RuntimeError("Module 'pronouncing' not available and eng_to_ipa failed.")
    out_words: List[str] = []
    for w in words:
        phones = pronouncing.phones_for_word(w.lower())
        if debug:
            print(f"[debug] {w} → {phones}", file=sys.stderr)
        if phones:
            arpa = phones[0].split()
            out_words.append(arpabet_list_to_ipa(arpa))
        else:
            # Fallback: keep the original word if unknown
            out_words.append(w)
    return " ".join(out_words)

def text_to_ipa(text: str, sep: str = " ", debug: bool = False) -> str:
    text = text.strip()
    if not text:
        return ""
    # Try eng_to_ipa first
    if ipa is not None:
        try:
            res = ipa.convert(text)
            if res and res.strip():
                return res.strip()
        except Exception as e:  # noqa: BLE001
            if debug:
                print(f"[debug] eng_to_ipa failed: {e}", file=sys.stderr)
    # Fallback to pronouncing (word-by-word ARPAbet → IPA)
    words = [w for w in text.replace("\n", " ").split() if w]
    ipa_fallback = words_to_ipa_with_pronouncing(words, debug=debug)
    # Normalize spaces to chosen separator (visual only; IPA phones are kept)
    return sep.join(ipa_fallback.split())

def main() -> None:
    parser = argparse.ArgumentParser(description="Convert English text to IPA.")
    parser.add_argument("--text", type=str, help="Phrase to convert")
    parser.add_argument("--file", type=str, help="Read phrases from file (one per line)")
    parser.add_argument("--sep", type=str, default=" ", help="Separator between words (default: space)")
    parser.add_argument("--debug", action="store_true", help="Debug output to stderr")
    args = parser.parse_args()

    if not args.text and not args.file:
        parser.print_help(sys.stderr)
        sys.exit(2)

    try:
        if args.text:
            print(text_to_ipa(args.text, sep=args.sep, debug=args.debug))
            return

        # File mode
        count = 0
        with open(args.file, "r", encoding="utf-8") as fh:
            for line in fh:
                phrase = line.strip()
                if not phrase:
                    continue
                print(text_to_ipa(phrase, sep=args.sep, debug=args.debug))
                count += 1
        if count == 0:
            print("[warn] No non-empty lines found.", file=sys.stderr)
    except FileNotFoundError:
        print(f"[error] File not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:  # noqa: BLE001
        print(f"[error] {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
