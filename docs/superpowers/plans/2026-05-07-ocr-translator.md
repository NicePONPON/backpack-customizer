# OCR Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Windows desktop app that captures any screen region, runs OCR, and displays the translation in a floating overlay.

**Architecture:** Single Python process; two persistent Qt windows (toolbar + overlay) plus one ephemeral full-screen capture window. OCR and translation run in QThread workers so the UI never blocks. All state flows through signals.

**Tech Stack:** PyQt6, EasyOCR, Pillow (ImageGrab), deep-translator (Google backend), PyInstaller

---

### Task 1: Project scaffold

**Files:**
- Create: `ocr_translator/requirements.txt`

- [ ] **Step 1: Create the project directory and requirements file**

```
ocr_translator/
├── requirements.txt   ← create now
├── main.py            ← Tasks 2-9
├── settings.py
├── translator.py
├── ocr_engine.py
├── capture.py
├── overlay.py
├── toolbar.py
└── build.py
```

Create `ocr_translator/requirements.txt`:

```
PyQt6>=6.5.0
easyocr>=1.7.0
Pillow>=10.0.0
deep-translator>=1.11.0
numpy>=1.24.0
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/requirements.txt
git commit -m "feat: scaffold ocr_translator project"
```

---

### Task 2: settings.py

**Files:**
- Create: `ocr_translator/settings.py`

- [ ] **Step 1: Create settings.py**

```python
from PyQt6.QtCore import QSettings

DEFAULTS: dict = {
    "source_lang": "zh-TW",
    "target_lang": "en",
    "overlay_position": "bottom",
    "overlay_opacity": 0.85,
}


class Settings:
    def __init__(self) -> None:
        self._qs = QSettings("OCRTranslator", "OCRTranslator")

    def get(self, key: str):
        default = DEFAULTS.get(key)
        value = self._qs.value(key, default)
        # QSettings may return string even for float values
        if isinstance(default, float):
            try:
                return float(value)
            except (TypeError, ValueError):
                return default
        return value

    def set(self, key: str, value) -> None:
        self._qs.setValue(key, value)
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/settings.py
git commit -m "feat: add Settings (QSettings wrapper)"
```

---

### Task 3: translator.py

**Files:**
- Create: `ocr_translator/translator.py`

- [ ] **Step 1: Create translator.py**

```python
from PyQt6.QtCore import QThread, pyqtSignal
from deep_translator import GoogleTranslator

FAVORITES: list[tuple[str, str]] = [
    ("English", "en"),
    ("Traditional Chinese", "zh-TW"),
    ("Simplified Chinese", "zh-CN"),
    ("Japanese", "ja"),
    ("Korean", "ko"),
    ("Spanish", "es"),
]

_ALL_LANGUAGES_CACHE: dict | None = None


def get_all_languages() -> dict:
    """Return {DisplayName: lang_code} for every Google-supported language.

    Result is cached so the network call happens at most once per process.
    Falls back to FAVORITES on network failure.
    """
    global _ALL_LANGUAGES_CACHE
    if _ALL_LANGUAGES_CACHE is None:
        try:
            raw: dict = GoogleTranslator().get_supported_languages(as_dict=True)
            # raw keys are lowercase display names; values are lang codes
            _ALL_LANGUAGES_CACHE = {name.title(): code for name, code in raw.items()}
        except Exception:
            _ALL_LANGUAGES_CACHE = {name: code for name, code in FAVORITES}
    return _ALL_LANGUAGES_CACHE


class TranslatorWorker(QThread):
    translation_ready = pyqtSignal(str, bool)  # (translated_text, success)

    def __init__(self, text: str, source: str, target: str, parent=None) -> None:
        super().__init__(parent)
        self.text = text
        self.source = source
        self.target = target

    def run(self) -> None:
        try:
            result: str | None = GoogleTranslator(
                source=self.source, target=self.target
            ).translate(self.text)
            self.translation_ready.emit(result or self.text, True)
        except Exception:
            self.translation_ready.emit(self.text, False)
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/translator.py
git commit -m "feat: add TranslatorWorker and language registry"
```

---

### Task 4: ocr_engine.py

**Files:**
- Create: `ocr_translator/ocr_engine.py`

- [ ] **Step 1: Create ocr_engine.py**

```python
import os
from PyQt6.QtCore import QThread, pyqtSignal

# Maps Google Translate lang codes → EasyOCR language list.
# English is included alongside non-Latin scripts to handle mixed content.
EASYOCR_LANG_MAP: dict[str, list[str]] = {
    "en":    ["en"],
    "zh-TW": ["ch_tra", "en"],
    "zh-CN": ["ch_sim", "en"],
    "ja":    ["ja", "en"],
    "ko":    ["ko", "en"],
    "es":    ["es", "en"],
    "fr":    ["fr", "en"],
    "de":    ["de", "en"],
    "it":    ["it", "en"],
    "pt":    ["pt", "en"],
    "ru":    ["ru", "en"],
    "ar":    ["ar"],
    "th":    ["th"],
    "vi":    ["vi", "en"],
    "hi":    ["hi", "en"],
}

# Module-level cache: key = sorted tuple of EasyOCR lang codes
_reader_cache: dict = {}


def get_model_dir() -> str:
    """Return (and create) the directory where EasyOCR stores model files."""
    appdata = os.environ.get("APPDATA", os.path.expanduser("~"))
    path = os.path.join(appdata, "ocr_translator", "models")
    os.makedirs(path, exist_ok=True)
    return path


def get_easyocr_langs(lang_code: str) -> list[str]:
    return EASYOCR_LANG_MAP.get(lang_code, ["en"])


class OcrWorker(QThread):
    ocr_done   = pyqtSignal(str)   # extracted text (may be empty)
    ocr_failed = pyqtSignal(str)   # error message

    def __init__(self, image, lang_code: str, parent=None) -> None:
        super().__init__(parent)
        self.image = image      # PIL.Image.Image from ImageGrab
        self.lang_code = lang_code

    def run(self) -> None:
        global _reader_cache
        try:
            import easyocr          # deferred import keeps startup fast
            import numpy as np

            langs = get_easyocr_langs(self.lang_code)
            key = tuple(sorted(langs))

            if key not in _reader_cache:
                _reader_cache[key] = easyocr.Reader(
                    langs,
                    model_storage_directory=get_model_dir(),
                    download_enabled=True,
                    verbose=False,
                )

            img_array = np.array(self.image)
            results: list[str] = _reader_cache[key].readtext(
                img_array, detail=0, paragraph=True
            )
            self.ocr_done.emit("\n".join(results).strip())
        except Exception as exc:
            self.ocr_failed.emit(str(exc))
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/ocr_engine.py
git commit -m "feat: add OcrWorker (EasyOCR, lazy init, model cache)"
```

---

### Task 5: capture.py

**Files:**
- Create: `ocr_translator/capture.py`

- [ ] **Step 1: Create capture.py**

```python
from PyQt6.QtWidgets import QWidget, QApplication
from PyQt6.QtCore import Qt, QRect, QPoint, pyqtSignal
from PyQt6.QtGui import QPainter, QColor, QPen, QCursor


class ScreenCaptureWindow(QWidget):
    """Full-screen transparent mask for rubber-band region selection.

    Emits region_selected(x, y, w, h) in logical screen coordinates on
    mouse release, or cancelled() on Escape.  Closes itself in both cases.
    """

    region_selected = pyqtSignal(int, int, int, int)
    cancelled       = pyqtSignal()

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        # Cover the entire virtual desktop (all monitors)
        vg = QApplication.primaryScreen().virtualGeometry()
        self.setGeometry(vg)
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setCursor(QCursor(Qt.CursorShape.CrossCursor))
        self.setMouseTracking(True)

        self._origin  = QPoint()
        self._current = QPoint()
        self._active  = False   # True while mouse is held down

    # ------------------------------------------------------------------ events

    def keyPressEvent(self, event) -> None:
        if event.key() == Qt.Key.Key_Escape:
            self.cancelled.emit()
            self.close()

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._origin  = event.position().toPoint()
            self._current = event.position().toPoint()
            self._active  = True
            self.update()

    def mouseMoveEvent(self, event) -> None:
        if self._active:
            self._current = event.position().toPoint()
            self.update()

    def mouseReleaseEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton and self._active:
            self._active = False
            rect = QRect(self._origin, event.position().toPoint()).normalized()
            if rect.width() >= 10 and rect.height() >= 10:
                global_tl = self.mapToGlobal(rect.topLeft())
                self.region_selected.emit(
                    global_tl.x(), global_tl.y(), rect.width(), rect.height()
                )
            self.close()

    # ------------------------------------------------------------------ paint

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        full = self.rect()

        if not self._active:
            painter.fillRect(full, QColor(0, 0, 0, 80))
        else:
            sel = QRect(self._origin, self._current).normalized()

            # Dim the four regions surrounding the selection
            painter.setBrush(QColor(0, 0, 0, 80))
            painter.setPen(Qt.PenStyle.NoPen)

            # top strip
            painter.drawRect(
                full.left(), full.top(),
                full.width(), sel.top() - full.top()
            )
            # bottom strip
            painter.drawRect(
                full.left(), sel.bottom() + 1,
                full.width(), full.bottom() - sel.bottom()
            )
            # left strip (between top and bottom strips)
            painter.drawRect(
                full.left(), sel.top(),
                sel.left() - full.left(), sel.height()
            )
            # right strip
            painter.drawRect(
                sel.right() + 1, sel.top(),
                full.right() - sel.right(), sel.height()
            )

            # Selection border
            pen = QPen(QColor(255, 255, 255, 220), 2)
            painter.setPen(pen)
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.drawRect(sel)

        painter.end()
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/capture.py
git commit -m "feat: add ScreenCaptureWindow with rubber-band selection"
```

---

### Task 6: overlay.py

**Files:**
- Create: `ocr_translator/overlay.py`

- [ ] **Step 1: Create overlay.py**

```python
from PyQt6.QtWidgets import (
    QWidget, QLabel, QVBoxLayout, QHBoxLayout, QPushButton, QApplication,
)
from PyQt6.QtCore import Qt, QPoint
from PyQt6.QtGui import QFont, QColor, QPainter, QPainterPath

from settings import Settings


class OverlayWindow(QWidget):
    """Semi-transparent floating window that shows OCR translation results.

    Call show_at_region() to position and reveal it.
    Call show_result() to update text in-place.
    The window is draggable and stays on top.
    """

    def __init__(self, settings: Settings, parent=None) -> None:
        super().__init__(parent)
        self._settings  = settings
        self._drag_pos  = QPoint()
        self._dragging  = False
        self._setup_ui()
        self.hide()

    # ------------------------------------------------------------------ setup

    def _setup_ui(self) -> None:
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setMinimumWidth(220)
        self.setMaximumWidth(480)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 10, 14, 14)
        layout.setSpacing(6)

        # ── header row ──────────────────────────────────────────────────────
        header = QHBoxLayout()
        self._status_label = QLabel("Translating…")
        self._status_label.setStyleSheet(
            "color: rgba(255,255,255,140); font-size: 11px;"
        )
        header.addWidget(self._status_label)
        header.addStretch()

        close_btn = QPushButton("×")
        close_btn.setFixedSize(20, 20)
        close_btn.setStyleSheet(
            "QPushButton {"
            "  background: rgba(255,255,255,40); color: white;"
            "  border: none; border-radius: 10px; font-size: 14px;"
            "}"
            "QPushButton:hover { background: rgba(220,60,60,200); }"
        )
        close_btn.clicked.connect(self.hide)
        header.addWidget(close_btn)
        layout.addLayout(header)

        # ── body text ────────────────────────────────────────────────────────
        self._text_label = QLabel()
        self._text_label.setWordWrap(True)
        self._text_label.setTextInteractionFlags(
            Qt.TextInteractionFlag.TextSelectableByMouse
        )
        font = QFont()
        font.setPointSize(13)
        self._text_label.setFont(font)
        self._text_label.setStyleSheet("color: white;")
        layout.addWidget(self._text_label)

    # ------------------------------------------------------------------ paint

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(0, 0, self.width(), self.height(), 12, 12)
        painter.fillPath(path, QColor(28, 28, 28, 215))
        painter.end()

    # ------------------------------------------------------------------ public API

    def show_at_region(self, rx: int, ry: int, rw: int, rh: int, side: str) -> None:
        """Position the overlay adjacent to the captured region, then show it."""
        self._status_label.setText("Translating…")
        self._text_label.setText("")
        self.setWindowOpacity(float(self._settings.get("overlay_opacity")))
        self.adjustSize()
        self._move_near(rx, ry, rw, rh, side)
        self.show()
        self.raise_()

    def show_result(self, text: str, success: bool) -> None:
        """Update displayed text after translation finishes."""
        self._status_label.setText(
            "Translation" if success else "Translation unavailable — raw OCR:"
        )
        self._text_label.setText(text if text else "No text found")
        self.adjustSize()

    # ------------------------------------------------------------------ positioning

    def _move_near(self, rx: int, ry: int, rw: int, rh: int, side: str) -> None:
        ow, oh = self.sizeHint().width(), self.sizeHint().height()
        gap = 10

        if side == "top":
            x = rx + rw // 2 - ow // 2
            y = ry - oh - gap
        elif side == "left":
            x = rx - ow - gap
            y = ry + rh // 2 - oh // 2
        elif side == "right":
            x = rx + rw + gap
            y = ry + rh // 2 - oh // 2
        else:  # bottom (default)
            x = rx + rw // 2 - ow // 2
            y = ry + rh + gap

        # Clamp to screen bounds
        screen = QApplication.primaryScreen().geometry()
        x = max(screen.left() + 4, min(x, screen.right() - ow - 4))
        y = max(screen.top() + 4, min(y, screen.bottom() - oh - 4))
        self.move(x, y)

    # ------------------------------------------------------------------ drag

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_pos = (
                event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            )
            self._dragging = True

    def mouseMoveEvent(self, event) -> None:
        if self._dragging:
            self.move(event.globalPosition().toPoint() - self._drag_pos)

    def mouseReleaseEvent(self, event) -> None:
        self._dragging = False
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/overlay.py
git commit -m "feat: add OverlayWindow (translucent, draggable, position-aware)"
```

---

### Task 7: toolbar.py

**Files:**
- Create: `ocr_translator/toolbar.py`

- [ ] **Step 1: Create toolbar.py**

```python
from PyQt6.QtWidgets import (
    QWidget, QHBoxLayout, QComboBox, QLabel, QPushButton,
    QApplication, QDialog, QVBoxLayout, QLineEdit, QListWidget,
    QListWidgetItem,
)
from PyQt6.QtCore import Qt, QPoint
from PyQt6.QtGui import QColor, QPainter, QPainterPath

from settings import Settings
from overlay import OverlayWindow
from capture import ScreenCaptureWindow
from translator import FAVORITES, get_all_languages, TranslatorWorker
from ocr_engine import OcrWorker

_POSITIONS = ["top", "bottom", "left", "right"]
_POS_ICONS  = {"top": "↑", "bottom": "↓", "left": "←", "right": "→"}


# ──────────────────────────────────────────────────────── Language search dialog

class LanguageSearchDialog(QDialog):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Select Language")
        self.setMinimumWidth(320)
        self.selected_code: str | None = None

        layout = QVBoxLayout(self)

        self._search = QLineEdit()
        self._search.setPlaceholderText("Type to search…")
        self._search.textChanged.connect(self._filter)
        layout.addWidget(self._search)

        self._list = QListWidget()
        self._list.itemDoubleClicked.connect(self._accept_item)
        layout.addWidget(self._list)

        self._langs: dict = {}  # display name → lang code
        self._populate()

    def _populate(self) -> None:
        self._langs = get_all_languages()
        self._list.clear()
        for name in sorted(self._langs.keys()):
            self._list.addItem(QListWidgetItem(name))

    def _filter(self, text: str) -> None:
        needle = text.lower()
        for i in range(self._list.count()):
            item = self._list.item(i)
            item.setHidden(needle not in item.text().lower())

    def _accept_item(self, item: QListWidgetItem) -> None:
        self.selected_code = self._langs.get(item.text())
        self.accept()


# ──────────────────────────────────────────────────────────── Hybrid combo box

class LangCombo(QComboBox):
    """QComboBox pre-loaded with FAVORITES + 'Other…' that opens a search dialog."""

    _OTHER = "Other…"

    def __init__(self, settings_key: str, settings: Settings, parent=None) -> None:
        super().__init__(parent)
        self._key      = settings_key
        self._settings = settings

        for name, code in FAVORITES:
            self.addItem(name, userData=code)
        self.addItem(self._OTHER, userData=None)

        # Restore persisted choice before connecting the signal
        self._restore(settings.get(settings_key))
        self.currentIndexChanged.connect(self._on_change)

    def _restore(self, code: str) -> None:
        for i, (_, c) in enumerate(FAVORITES):
            if c == code:
                self.setCurrentIndex(i)
                return
        # Saved code not in favorites — leave at index 0

    def current_code(self) -> str:
        return self.currentData() or "en"

    def _on_change(self, _index: int) -> None:
        if self.currentText() != self._OTHER:
            self._settings.set(self._key, self.current_code())
            return

        dlg = LanguageSearchDialog(self)
        if dlg.exec() == QDialog.DialogCode.Accepted and dlg.selected_code:
            code = dlg.selected_code
            # Find or derive a display name
            all_langs = get_all_languages()
            name = next(
                (n for n, c in all_langs.items() if c == code), code
            )
            insert_at = self.count() - 1     # just before "Other…"
            self.insertItem(insert_at, name, userData=code)
            self.blockSignals(True)
            self.setCurrentIndex(insert_at)
            self.blockSignals(False)
            self._settings.set(self._key, code)
        else:
            self.blockSignals(True)
            self.setCurrentIndex(0)
            self.blockSignals(False)


# ──────────────────────────────────────────────────────────────── Toolbar

class ToolbarWindow(QWidget):
    def __init__(self, settings: Settings, overlay: OverlayWindow) -> None:
        super().__init__()
        self._settings     = settings
        self._overlay      = overlay
        self._drag_pos     = QPoint()
        self._dragging     = False
        self._ocr_worker:   OcrWorker | None         = None
        self._trans_worker: TranslatorWorker | None  = None

        self._setup_ui()
        self._sync_pos_buttons()

    # ------------------------------------------------------------------ setup

    def _setup_ui(self) -> None:
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedHeight(56)
        self.setStyleSheet("""
            QComboBox {
                background: rgba(55,55,55,210);
                color: white;
                border: 1px solid rgba(255,255,255,55);
                border-radius: 5px;
                padding: 3px 8px;
                font-size: 12px;
            }
            QComboBox::drop-down { border: none; width: 18px; }
            QComboBox QAbstractItemView {
                background: #2a2a2a;
                color: white;
                selection-background-color: #3a7bd5;
                border: 1px solid rgba(255,255,255,40);
            }
            QLabel { color: white; font-size: 15px; }
        """)

        row = QHBoxLayout(self)
        row.setContentsMargins(12, 8, 12, 8)
        row.setSpacing(8)

        self._src_combo = LangCombo("source_lang", self._settings, self)
        self._src_combo.setFixedWidth(148)
        row.addWidget(self._src_combo)

        row.addWidget(QLabel("→"))

        self._tgt_combo = LangCombo("target_lang", self._settings, self)
        self._tgt_combo.setFixedWidth(148)
        row.addWidget(self._tgt_combo)

        row.addSpacing(6)

        # Position toggle buttons (↑ ↓ ← →)
        self._pos_btns: dict[str, QPushButton] = {}
        for pos in _POSITIONS:
            btn = QPushButton(_POS_ICONS[pos])
            btn.setFixedSize(26, 26)
            btn.setCheckable(True)
            btn.setStyleSheet(
                "QPushButton {"
                "  background: rgba(255,255,255,25); color: white;"
                "  border: none; border-radius: 4px; font-size: 14px;"
                "}"
                "QPushButton:checked { background: rgba(58,123,213,200); }"
                "QPushButton:hover   { background: rgba(255,255,255,55); }"
            )
            btn.clicked.connect(lambda _checked, p=pos: self._set_position(p))
            row.addWidget(btn)
            self._pos_btns[pos] = btn

        row.addSpacing(6)

        capture_btn = QPushButton("Capture")
        capture_btn.setFixedSize(70, 36)
        capture_btn.setStyleSheet(
            "QPushButton {"
            "  background: rgba(58,123,213,210); color: white;"
            "  border: none; border-radius: 6px; font-weight: bold; font-size: 13px;"
            "}"
            "QPushButton:hover   { background: rgba(58,123,213,255); }"
            "QPushButton:pressed { background: rgba(38,99,180,255); }"
        )
        capture_btn.clicked.connect(self._start_capture)
        row.addWidget(capture_btn)

    def _sync_pos_buttons(self) -> None:
        current = self._settings.get("overlay_position")
        for pos, btn in self._pos_btns.items():
            btn.setChecked(pos == current)

    def _set_position(self, pos: str) -> None:
        self._settings.set("overlay_position", pos)
        self._sync_pos_buttons()

    # ------------------------------------------------------------------ paint / drag

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(0, 0, self.width(), self.height(), 10, 10)
        painter.fillPath(path, QColor(28, 28, 28, 222))
        painter.end()

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_pos = (
                event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            )
            self._dragging = True

    def mouseMoveEvent(self, event) -> None:
        if self._dragging:
            self.move(event.globalPosition().toPoint() - self._drag_pos)

    def mouseReleaseEvent(self, event) -> None:
        self._dragging = False

    # ------------------------------------------------------------------ capture flow

    def _start_capture(self) -> None:
        self._capture_win = ScreenCaptureWindow()
        self._capture_win.region_selected.connect(self._on_region)
        self._capture_win.show()

    def _on_region(self, x: int, y: int, w: int, h: int) -> None:
        # Cancel any in-flight workers from a previous capture
        for worker in (self._ocr_worker, self._trans_worker):
            if worker is not None:
                worker.blockSignals(True)

        side = self._settings.get("overlay_position")
        self._overlay.show_at_region(x, y, w, h, side)

        # Grab screenshot (physical pixels = logical × devicePixelRatio)
        from PIL import ImageGrab
        dpr  = QApplication.primaryScreen().devicePixelRatio()
        bbox = (
            int(x * dpr), int(y * dpr),
            int((x + w) * dpr), int((y + h) * dpr),
        )
        image = ImageGrab.grab(bbox=bbox)

        src = self._src_combo.current_code()
        tgt = self._tgt_combo.current_code()

        self._ocr_worker = OcrWorker(image, src)
        self._ocr_worker.ocr_done.connect(
            lambda text: self._on_ocr_done(text, tgt)
        )
        self._ocr_worker.ocr_failed.connect(
            lambda err: self._overlay.show_result(f"OCR error: {err}", False)
        )
        self._ocr_worker.start()

    def _on_ocr_done(self, text: str, tgt: str) -> None:
        if not text:
            self._overlay.show_result("No text found", True)
            return

        src = self._src_combo.current_code()
        self._trans_worker = TranslatorWorker(text, src, tgt)
        self._trans_worker.translation_ready.connect(self._overlay.show_result)
        self._trans_worker.start()
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/toolbar.py
git commit -m "feat: add ToolbarWindow with lang selectors, position toggle, capture flow"
```

---

### Task 8: main.py

**Files:**
- Create: `ocr_translator/main.py`

- [ ] **Step 1: Create main.py**

```python
import sys

# SetProcessDpiAwareness must be called before QApplication is constructed.
# Value 1 = System DPI Aware: coordinates are in physical pixels,
# preventing coordinate offset on high-DPI displays.
if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass  # Non-fatal: older Windows or already set

from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt

from settings import Settings
from overlay import OverlayWindow
from toolbar import ToolbarWindow


def main() -> None:
    app = QApplication(sys.argv)
    app.setApplicationName("OCRTranslator")
    # Keep the app alive even when both windows are hidden
    app.setQuitOnLastWindowClosed(False)
    # Fusion style looks clean on Windows across all DPI settings
    app.setStyle("Fusion")

    settings = Settings()
    overlay  = OverlayWindow(settings)
    toolbar  = ToolbarWindow(settings, overlay)

    # Default position: top-center of primary screen
    screen = QApplication.primaryScreen().geometry()
    toolbar.adjustSize()
    toolbar.move(
        screen.center().x() - toolbar.width() // 2,
        screen.top() + 20,
    )
    toolbar.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/main.py
git commit -m "feat: add main entry point with DPI awareness and Fusion style"
```

---

### Task 9: build.py

**Files:**
- Create: `ocr_translator/build.py`

- [ ] **Step 1: Create build.py**

```python
"""
Run this script inside the ocr_translator/ directory to produce
dist/OCRTranslator/ containing OCRTranslator.exe plus all dependencies.

Usage:
    cd ocr_translator
    pip install pyinstaller
    python build.py

Notes:
- --onedir is used instead of --onefile because PyTorch (an EasyOCR
  dependency) is very large; onedir avoids re-extracting on every launch.
- EasyOCR model weights (~180 MB per language) are NOT bundled.
  They download automatically to %APPDATA%\ocr_translator\models on
  first use and are cached there for subsequent runs.
- Requires CPU-only PyTorch to keep the package size reasonable:
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
"""

import subprocess
import sys
import os
import site


def find_package_dir(package: str) -> str | None:
    for sp in site.getsitepackages():
        path = os.path.join(sp, package)
        if os.path.isdir(path):
            return path
    # Also check user site-packages
    user_sp = site.getusersitepackages()
    if user_sp:
        path = os.path.join(user_sp, package)
        if os.path.isdir(path):
            return path
    return None


def main() -> None:
    sep = ";" if sys.platform == "win32" else ":"

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name",      "OCRTranslator",
        "--onedir",                       # faster startup than --onefile
        "--windowed",                     # no console window
        "--noconfirm",
        # Packages whose sub-modules PyInstaller misses via static analysis
        "--collect-all", "easyocr",
        "--collect-all", "deep_translator",
        "--collect-all", "PIL",
        # Explicit hidden imports for torch (EasyOCR dependency)
        "--hidden-import", "torch",
        "--hidden-import", "torchvision",
        "--hidden-import", "torch.nn",
        "--hidden-import", "torch.nn.functional",
    ]

    # Include the easyocr package data directory
    easyocr_dir = find_package_dir("easyocr")
    if easyocr_dir:
        cmd += ["--add-data", f"{easyocr_dir}{sep}easyocr"]

    cmd.append("main.py")

    print("Building OCRTranslator.exe …")
    print("Command:", " ".join(cmd))
    print()
    subprocess.run(cmd, check=True)
    print()
    print("Done!  Find OCRTranslator.exe in:  dist/OCRTranslator/")
    print()
    print("First-run note:")
    print("  On the first Capture, EasyOCR will download model weights (~180 MB).")
    print("  Models are cached in: %APPDATA%\\ocr_translator\\models")
    print("  Subsequent runs load from cache and are fast.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add ocr_translator/build.py
git commit -m "feat: add PyInstaller build script with first-run notes"
```

---

### Task 10: Final integration review

**Files:** All files in `ocr_translator/`

- [ ] **Step 1: Verify all imports are consistent across files**

Cross-check that every symbol used across files is actually defined:

| Symbol | Defined in | Used in |
|--------|-----------|---------|
| `Settings` | `settings.py` | `toolbar.py`, `overlay.py`, `main.py` |
| `FAVORITES`, `get_all_languages`, `TranslatorWorker` | `translator.py` | `toolbar.py` |
| `OcrWorker` | `ocr_engine.py` | `toolbar.py` |
| `ScreenCaptureWindow` | `capture.py` | `toolbar.py` |
| `OverlayWindow` | `overlay.py` | `toolbar.py`, `main.py` |
| `ToolbarWindow` | `toolbar.py` | `main.py` |

- [ ] **Step 2: Verify signal types match their slots**

| Signal | Type | Connected to | Slot signature |
|--------|------|-------------|----------------|
| `region_selected` | `(int,int,int,int)` | `_on_region` | `(x,y,w,h:int)` ✓ |
| `ocr_done` | `(str)` | lambda → `_on_ocr_done` | `(text:str, tgt:str)` ✓ |
| `ocr_failed` | `(str)` | lambda → `show_result` | `(str,False)` ✓ |
| `translation_ready` | `(str,bool)` | `show_result` | `(text:str, success:bool)` ✓ |

- [ ] **Step 3: Final commit**

```bash
git add ocr_translator/
git commit -m "feat: complete OCR Translator — all files ready for Windows packaging"
```

---

## Developer Notes

**Installing dependencies on a Windows machine before first run:**

```bash
# 1. CPU-only PyTorch (much smaller than GPU build)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 2. All other dependencies
pip install -r requirements.txt

# 3. Run directly (no packaging needed for dev)
python main.py
```

**Building the .exe:**

```bash
pip install pyinstaller
python build.py
# Output: dist/OCRTranslator/OCRTranslator.exe
```

**First-run model download:**
EasyOCR downloads model weights (~180 MB per OCR language) the first time you click Capture with a new language combination. Models are cached at `%APPDATA%\ocr_translator\models`. The app does not crash during this — it downloads in the background worker thread and will show the translation result once ready (may take 30–60 seconds on the first capture).
