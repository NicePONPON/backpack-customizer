# Auto Screen Translator v2 — Gemini + Translation Panel Design
_Date: 2026-05-07_

## Overview

A complete redesign of the OCR and translation pipeline. EasyOCR + deep-translator are replaced with a single Gemini Flash API call (OCR + translation in one step). The single-use overlay is replaced with a persistent, scrollable Translation Panel that accumulates cards across multiple captures so users can translate many form fields in sequence and copy each result independently.

## Architecture

**Two persistent windows:**

1. **ToolbarWindow** — minimal always-on-top strip with three controls
2. **TranslationPanel** — always-on-top resizable floating panel showing accumulated translation cards

**Pipeline per capture:**
```
ScreenCaptureWindow (rubber-band) → PIL.ImageGrab → GeminiWorker (QThread)
  → parses ORIGINAL / TRANSLATION → TranslationCard added to panel
```

## File Structure

| File | Change |
|------|--------|
| `main.py` | Updated — creates TranslationPanel instead of OverlayWindow; shows ApiKeyDialog on first launch |
| `toolbar.py` | Simplified — 3 controls only; adds ⚙ settings button |
| `translation_panel.py` | New — scrollable panel holding TranslationCard widgets |
| `translation_card.py` | New — individual card: original (grey) + translation (white), click-to-copy |
| `gemini_client.py` | New — GeminiWorker QThread; wraps google-generativeai |
| `api_key_dialog.py` | New — first-launch setup dialog for Gemini API key |
| `settings.py` | Updated — adds `gemini_api_key`; removes `overlay_*` keys |
| `capture.py` | Unchanged |
| `ocr_engine.py` | Removed |
| `overlay.py` | Removed |
| `translator.py` | Removed |

## Components

### ToolbarWindow
- `FramelessWindowHint | WindowStaysOnTopHint`, solid dark background
- Three controls left-to-right: **Source language combo** → **Target language combo** → **Capture button**
- Small **⚙** settings icon button (far right) opens ApiKeyDialog to update key
- Draggable; position saved to QSettings
- Language combos: 6 favorites + "Other…" searchable dialog (unchanged from v1)

### TranslationPanel
- `FramelessWindowHint | WindowStaysOnTopHint`, solid dark background
- Freely resizable by dragging any edge or corner (via `QSizeGrip` or manual mouse tracking)
- Contains a `QScrollArea` with a `QVBoxLayout` of TranslationCards
- New cards appended at the bottom; panel auto-scrolls to newest
- **Clear All** button at the top of the panel wipes all cards
- Minimum size: 280 × 200px
- Position and size saved to QSettings; restored on next launch

### TranslationCard
- Fixed-width (fills panel), variable height
- **Top section:** original OCR text — small font (11px), grey colour `rgba(255,255,255,140)`, not selectable
- **Bottom section:** translated text — larger font (14px), white, not selectable via mouse
- **× button** top-right: dismisses only this card
- **Click anywhere on card body** (excluding ×): copies translated text to clipboard, briefly shows "Copied ✓" overlay on the card for 1 second
- Hover state: card background lightens slightly to indicate it is clickable
- Rounded corners, dark background `rgb(40, 40, 40)`, 8px gap between cards

### GeminiWorker (QThread)
- Receives: `PIL.Image`, source lang code, target lang code
- Converts image to base64 PNG
- Sends to `gemini-1.5-flash` with prompt:
  ```
  Extract the text from this image exactly as it appears, then translate it to [target language].
  Reply using exactly this format:
  ORIGINAL: [original text]
  TRANSLATION: [translated text]
  ```
- Parses response for `ORIGINAL:` and `TRANSLATION:` lines
- Emits: `result_ready(original: str, translation: str)`
- Emits: `failed(error: str)`
- On failure: emits `failed` with error message; panel shows an error card

### ApiKeyDialog
- Shown on first launch when no key is saved, or when user clicks ⚙
- Single `QLineEdit` (password echo mode) + Save button
- Instructions: "Get a free key at aistudio.google.com/apikey"
- Validates key is non-empty before saving
- Saved to QSettings under key `gemini_api_key`

## Data Flow

```
Capture button clicked
  → ScreenCaptureWindow shown
  → User drags selection
  → region_selected(x, y, w, h) signal
  → PIL.ImageGrab.grab(bbox)
  → TranslationPanel.add_loading_card() — shows spinner card
  → GeminiWorker.start()
  → GeminiWorker.result_ready(original, translation)
  → TranslationPanel.update_card(original, translation)
```

## Settings Keys

| Key | Type | Purpose |
|-----|------|---------|
| `gemini_api_key` | str | Gemini API key |
| `source_lang` | str | Source language code |
| `target_lang` | str | Target language code |
| `toolbar_x/y` | int | Toolbar position |
| `panel_x/y/w/h` | int | Panel position + size |

## Error Handling

| Condition | Behaviour |
|-----------|-----------|
| No API key saved | ApiKeyDialog shown before toolbar |
| Gemini API error / network failure | Error card shown: "Translation failed — [error message]" |
| No text found in image | Card shows "No text detected" as both original and translation |
| Capture cancelled (Escape) | No card added |

## Dependencies

```
PyQt6>=6.5.0
google-generativeai>=0.7.0
Pillow>=10.0.0
certifi>=2024.0.0
```

EasyOCR, deep-translator, numpy removed from requirements.txt (no longer needed).

## Gemini Free Tier

`gemini-1.5-flash`: 15 requests/min, 1,500 requests/day, 1M tokens/day — free, no billing required.
Users obtain their own key at `aistudio.google.com/apikey`.
