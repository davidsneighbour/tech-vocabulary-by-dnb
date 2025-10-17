# #TechTranslationsByDNB

* **Part 1:** I want to create a series of "tech translations" cards.
* **Part 2:** I want to automate the rendering of these cards.
* **Part 3:** I want to automate the generation of International Phonetic Alphabet (IPA) pronunciation strings for phrases.

## Replacements

| tag | replacement | example |
|---:|---|---|
| {phrase} | phrase to translate | best kept secret of |
| {pronunciation} | IPA pronunciation string of the phrase | /bɛst kɛpt ˈsiːkrɪt ɒv/ |
| {part_of_speech} |  | idiom (optional) |
| {translation} |  | You say "A is the best kept secret of B".<br>I hear "I did not read the docs. After 5 years of hacks I found the feature that solved my problem years ago." |
| {example} |  | You say: "Framework X is the best kept secret of Y."<br>I hear: "We finally opened page one of the docs." |
| {signature} |  | Patrick Kollitsch / David's Neighbour |
| {url} |  | davids-neighbour.com |
| {timestamp} |   | 2025-10-16 |

## Run

### Render all cards

node scripts/render-tech-translation.ts --config tech-translations.config.toml

### Render the first card (index 0)

node scripts/render-tech-translation.ts --config tech-translations.config.toml --index 0

### Render the second card (index 1) with quick text override

node scripts/render-tech-translation.ts --config tech-translations.config.toml --index 1 \
  --translation "You say speed.\\nI hear unpaid QA." --out out/tts-move-fast-override.svg

## Pronunciation string generation (Part 3)

<!-- vale off -->
We _could_ use the online service of [EasyPronunciation](https://easypronunciation.com/en/english-phonetic-transcription-converter) to generate the pronunciation string.

We _could_ also do it ourselves with Python and the libraries `eng-to-ipa` and `pronouncing`:
<!-- vale on -->

### Setup

```bash
./text2ipa-setup.sh
```

This creates a virtual environment and install the required packages in the local `.venv` folder.

### Quick usages

```bash
./text2ipa-run.sh "the phrase I want to convert"
```

This outputs the IPA string for `the phrase I want to convert` into the terminal and copies it to the clipboard. The copy-to-clipboard feature works on Linux Mint. It works on your system as well if you have `xclip`, `wl-copy`, or `xsel` installed.

### Manual execution of IPA python script

#### Single phrase

```bash
python3 text2ipa.py --text "best kept secret of"
```

#### Batch file (one phrase per line)

```bash
python3 text2ipa.py --file phrases.txt
```

#### Show debug info and use a middle dot between word-IPA blocks

```bash
python3 text2ipa.py --text "move fast and break things" --sep " · " --debug
```

#### CLI parameters for `text2ipa.py`

```plaintext
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
```
