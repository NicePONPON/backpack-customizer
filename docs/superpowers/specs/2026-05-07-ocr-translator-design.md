# Always-on-Top Floating OCR Translator — Design Spec
_Date: 2026-05-07_

## Overview

A standalone Windows desktop application that lets users capture any region of their screen, run OCR on it, and display a translation in a floating overlay adjacent to the selected area. Primary use case: reading mixed-language content (Traditional Chinese / English) while working across multiple applications.

## Architecture

**Pattern:** Single Python process, two persistent `QWidget` windows + one ephemeral full-screen capture window.

**File structure:**
```
ocr_translator/
├── main.py           # Entry point: DPI awareness, QApplication init, signal wiring
├── toolbar.py        # ToolbarWindow — always-on-top floating controller
├── overlay.py        # OverlayWindow — translucent result display
├── capture.py        # ScreenCaptureWindow — full-screen rubber-band selection
├── ocr_engine.py     # EasyOCR wrapper with lazy model loading + QThread worker
├── translator.py     # deep-translator (Google backend) wrapper + language registry
├── settings.py       # QSettings persistence (HKCU\Software\OCRTranslator)
├── requirements.txt
└── build.py          # PyInstaller packaging script
```

**Data flow:**
1. User clicks Capture → `ScreenCaptureWindow` opens full-screen
2. User drags to select region → window emits `region_selected(x, y, w, h)` and closes
3. `PIL.ImageGrab.grab(bbox)` screenshots the physical region
4. `OcrWorker(QThread)` runs EasyOCR on the image → emits `ocr_done(text)`
5. `TranslatorWorker(QThread)` translates via deep-translator → emits `translation_ready(text)`
6. `OverlayWindow` positions itself on the user-chosen side of the captured region and displays the result

**Thread model:** OCR and translation each run in a `QThread` worker. Workers emit signals to the main thread for all UI updates. The UI never blocks.

## Components

### ToolbarWindow
- Size: ~380×60px, `Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint`
- Source language dropdown (hybrid: 6 favorites + "Other…" → searchable `QDialog`)
- Arrow label (→)
- Target language dropdown (same hybrid pattern)
- Position selector: 4-button toggle group (↑ ↓ ← →) — controls overlay placement
- "Capture" button (primary action)
- Opacity slider for overlay (collapsed by default, revealed on hover)
- Draggable via mouse-press on any non-interactive area

**Favorite languages:** English, Traditional Chinese (zh-tw), Simplified Chinese (zh-cn), Japanese, Korean, Spanish

### OverlayWindow
- `Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.WA_TranslucentBackground`
- Semi-transparent dark background, white text, rounded corners
- Auto-positions adjacent to the captured region on the chosen side; stays within screen bounds
- Shows spinner (animated `QLabel`) while OCR/translation is in progress
- Displays translated text when ready; falls back to raw OCR text on translation failure
- Draggable by the user after positioning
- "×" close button top-right corner

### ScreenCaptureWindow
- Full-screen, spans `QApplication.primaryScreen().virtualGeometry()` (covers all monitors)
- Cursor: crosshair
- Dim tint overlay (rgba 0,0,0,80)
- Rubber-band rectangle drawn as user drags (`QPainter` in `paintEvent`)
- `Escape` → cancel (no overlay shown)
- Mouse release → emit `region_selected(x, y, w, h)` → window closes itself

### OcrEngine / OcrWorker
- Wraps `easyocr.Reader` with lazy initialization (created on first use, not at startup)
- Supported languages loaded from user's source language selection
- Model files cached at `%APPDATA%\ocr_translator\models`
- First-run progress dialog shown during model download
- Returns concatenated text string from EasyOCR result list

### Translator / TranslatorWorker
- Wraps `deep_translator.GoogleTranslator`
- Language registry maps display names + codes to deep-translator language codes
- Hybrid picker: `QComboBox` with 6 favorites; "Other…" item opens `LanguageSearchDialog` (`QDialog` with `QLineEdit` filter + `QListWidget`)
- On network failure: returns `None`; overlay shows fallback message + raw OCR text

### Settings
- `QSettings("OCRTranslator", "OCRTranslator")` (Windows registry)
- Persisted keys: `source_lang`, `target_lang`, `overlay_position` (top/bottom/left/right), `overlay_opacity` (0.4–1.0)
- Read on startup, written on every change

## Windows-Specific Details

- `ctypes.windll.shcore.SetProcessDpiAwareness(1)` called at the very top of `main.py`, before `QApplication` is constructed
- All coordinate math uses Qt logical pixels internally; `PIL.ImageGrab.grab()` receives physical pixel coordinates (logical × `devicePixelRatio`)
- Overlay position calculation accounts for `devicePixelRatio` when offsetting from the capture region

## Error Handling

| Condition | Behavior |
|-----------|----------|
| First run, models not cached | Progress dialog during EasyOCR download |
| No text found by OCR | Overlay shows "No text found" |
| Translation network failure | Overlay shows "Translation unavailable" + raw OCR text |
| Capture cancelled (Escape) | Silent — no overlay shown |
| Region too small (<10×10px) | Ignored — no action |
| Multi-monitor capture | `PIL.ImageGrab` bbox spans virtual desktop; ScreenCaptureWindow covers virtualGeometry |

## Packaging

**PyInstaller command (single `.exe`):**
```bash
pyinstaller --onefile --windowed --name OCRTranslator \
  --add-data "easyocr/model_storage:easyocr/model_storage" \
  --hidden-import easyocr \
  --hidden-import deep_translator \
  main.py
```

`build.py` automates this with the correct EasyOCR hook paths resolved at build time.

**Model path strategy:** On first launch the app checks `%APPDATA%\ocr_translator\models`. If empty, it downloads models there. Subsequent launches load from that path. The bundled `.exe` does NOT include model files (would add ~200MB); models download once per machine.

## Requirements

```
PyQt6>=6.5
easyocr>=1.7
Pillow>=10.0
deep-translator>=1.11
```
