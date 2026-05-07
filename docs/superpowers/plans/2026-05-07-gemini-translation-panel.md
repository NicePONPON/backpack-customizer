# Gemini Translation Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace EasyOCR + deep-translator with Gemini Flash (one API call does OCR + translation), and replace the single overlay with a persistent scrollable Translation Panel where clicking any card copies its translation.

**Architecture:** Single Python process; two persistent Qt windows (ToolbarWindow + TranslationPanel). Each Capture runs one GeminiWorker QThread that posts a PIL screenshot to Gemini Flash and parses the ORIGINAL / TRANSLATION response into a TranslationCard appended to the panel.

**Tech Stack:** PyQt6, google-generativeai, Pillow

---

### Task 1: Update requirements.txt and settings.py

**Files:**
- Modify: `auto-screen-translator/requirements.txt`
- Modify: `auto-screen-translator/settings.py`

- [ ] **Step 1: Replace requirements.txt**

```
PyQt6>=6.5.0
google-generativeai>=0.7.0
Pillow>=10.0.0
certifi>=2024.0.0
```

- [ ] **Step 2: Replace settings.py**

```python
from PyQt6.QtCore import QSettings

DEFAULTS: dict = {
    "source_lang":    "zh-TW",
    "target_lang":    "en",
    "gemini_api_key": "",
    "toolbar_x":      None,
    "toolbar_y":      None,
    "panel_x":        None,
    "panel_y":        None,
    "panel_w":        320,
    "panel_h":        500,
}


class Settings:
    def __init__(self) -> None:
        self._qs = QSettings("AutoScreenTranslator", "AutoScreenTranslator")

    def get(self, key: str):
        default = DEFAULTS.get(key)
        value = self._qs.value(key, default)
        if isinstance(default, int) and default is not None:
            try:
                return int(value)
            except (TypeError, ValueError):
                return default
        return value

    def set(self, key: str, value) -> None:
        self._qs.setValue(key, value)
```

- [ ] **Step 3: Commit**

```bash
git add requirements.txt settings.py
git commit -m "feat: update deps and settings for Gemini panel"
```

---

### Task 2: Create languages.py

**Files:**
- Create: `auto-screen-translator/languages.py`
- Delete: `auto-screen-translator/translator.py`

- [ ] **Step 1: Create languages.py**

```python
FAVORITES: list[tuple[str, str]] = [
    ("English",              "en"),
    ("Traditional Chinese",  "zh-TW"),
    ("Simplified Chinese",   "zh-CN"),
    ("Japanese",             "ja"),
    ("Korean",               "ko"),
    ("Spanish",              "es"),
]

# Used in Gemini prompt — maps lang code to display name
LANG_DISPLAY: dict[str, str] = {code: name for name, code in FAVORITES}
LANG_DISPLAY.update({
    "fr": "French",   "de": "German",   "it": "Italian",
    "pt": "Portuguese", "ru": "Russian", "ar": "Arabic",
    "th": "Thai",     "vi": "Vietnamese", "hi": "Hindi",
    "nl": "Dutch",    "pl": "Polish",   "sv": "Swedish",
    "tr": "Turkish",  "uk": "Ukrainian", "id": "Indonesian",
})

ALL_LANGUAGES: dict[str, str] = {
    "Afrikaans": "af", "Albanian": "sq", "Arabic": "ar",
    "Armenian": "hy", "Bengali": "bn", "Bosnian": "bs",
    "Bulgarian": "bg", "Catalan": "ca",
    "Chinese (Simplified)": "zh-CN", "Chinese (Traditional)": "zh-TW",
    "Croatian": "hr", "Czech": "cs", "Danish": "da",
    "Dutch": "nl", "English": "en", "Estonian": "et",
    "Finnish": "fi", "French": "fr", "German": "de",
    "Greek": "el", "Gujarati": "gu", "Hebrew": "he",
    "Hindi": "hi", "Hungarian": "hu", "Indonesian": "id",
    "Italian": "it", "Japanese": "ja", "Kannada": "kn",
    "Korean": "ko", "Latvian": "lv", "Lithuanian": "lt",
    "Malay": "ms", "Malayalam": "ml", "Marathi": "mr",
    "Nepali": "ne", "Norwegian": "no", "Persian": "fa",
    "Polish": "pl", "Portuguese": "pt", "Punjabi": "pa",
    "Romanian": "ro", "Russian": "ru", "Serbian": "sr",
    "Slovak": "sk", "Slovenian": "sl", "Spanish": "es",
    "Swahili": "sw", "Swedish": "sv", "Tamil": "ta",
    "Telugu": "te", "Thai": "th", "Turkish": "tr",
    "Ukrainian": "uk", "Urdu": "ur", "Vietnamese": "vi",
    "Welsh": "cy", "Zulu": "zu",
}


def get_all_languages() -> dict:
    """Return {DisplayName: lang_code} — static list, no network call."""
    return ALL_LANGUAGES
```

- [ ] **Step 2: Delete translator.py**

```bash
rm auto-screen-translator/translator.py
```

- [ ] **Step 3: Commit**

```bash
git add languages.py
git rm translator.py
git commit -m "feat: replace translator.py with static languages.py"
```

---

### Task 3: Create api_key_dialog.py

**Files:**
- Create: `auto-screen-translator/api_key_dialog.py`

- [ ] **Step 1: Create api_key_dialog.py**

```python
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton, QHBoxLayout,
)
from PyQt6.QtCore import Qt


class ApiKeyDialog(QDialog):
    """First-launch dialog and ⚙ settings dialog for the Gemini API key."""

    def __init__(self, current_key: str = "", parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Gemini API Key")
        self.setMinimumWidth(420)
        self.setWindowFlags(
            self.windowFlags() | Qt.WindowType.WindowStaysOnTopHint
        )

        layout = QVBoxLayout(self)
        layout.setSpacing(10)

        layout.addWidget(QLabel("Enter your Gemini API key:"))

        link = QLabel(
            'Get a free key at '
            '<a href="https://aistudio.google.com/apikey">'
            'aistudio.google.com/apikey</a> '
            '(free tier: 1,500 requests/day, no billing needed)'
        )
        link.setOpenExternalLinks(True)
        link.setWordWrap(True)
        layout.addWidget(link)

        self._input = QLineEdit()
        self._input.setEchoMode(QLineEdit.EchoMode.Password)
        self._input.setPlaceholderText("AIza...")
        self._input.setText(current_key)
        layout.addWidget(self._input)

        btn_row = QHBoxLayout()
        btn_row.addStretch()
        save_btn = QPushButton("Save")
        save_btn.setDefault(True)
        save_btn.clicked.connect(self._on_save)
        btn_row.addWidget(save_btn)
        layout.addLayout(btn_row)

    def _on_save(self) -> None:
        if self._input.text().strip():
            self.accept()

    def key(self) -> str:
        return self._input.text().strip()
```

- [ ] **Step 2: Commit**

```bash
git add api_key_dialog.py
git commit -m "feat: add ApiKeyDialog for Gemini API key setup"
```

---

### Task 4: Create gemini_client.py

**Files:**
- Create: `auto-screen-translator/gemini_client.py`
- Delete: `auto-screen-translator/ocr_engine.py`

- [ ] **Step 1: Create gemini_client.py**

```python
import io
from PyQt6.QtCore import QThread, pyqtSignal

from languages import LANG_DISPLAY


def _lang_name(code: str) -> str:
    return LANG_DISPLAY.get(code, code)


class GeminiWorker(QThread):
    result_ready = pyqtSignal(str, str)   # original, translation
    failed       = pyqtSignal(str)         # error message

    def __init__(self, image, source_lang: str, target_lang: str,
                 api_key: str, parent=None) -> None:
        super().__init__(parent)
        self.image       = image        # PIL.Image.Image
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.api_key     = api_key

    def run(self) -> None:
        try:
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            target_name = _lang_name(self.target_lang)
            prompt = (
                f"Extract all text visible in this image exactly as it appears, "
                f"then translate it to {target_name}.\n"
                f"Reply using exactly this format with no extra commentary:\n"
                f"ORIGINAL: [original text here]\n"
                f"TRANSLATION: [translated text here]"
            )

            # PIL.Image is accepted directly by the SDK
            response = model.generate_content([self.image, prompt])
            self._parse(response.text.strip())

        except Exception as exc:
            self.failed.emit(str(exc))

    def _parse(self, text: str) -> None:
        original_lines: list[str] = []
        translation_lines: list[str] = []
        section = None

        for line in text.splitlines():
            if line.startswith("ORIGINAL:"):
                section = "o"
                val = line[len("ORIGINAL:"):].strip()
                if val:
                    original_lines.append(val)
            elif line.startswith("TRANSLATION:"):
                section = "t"
                val = line[len("TRANSLATION:"):].strip()
                if val:
                    translation_lines.append(val)
            elif section == "o":
                original_lines.append(line)
            elif section == "t":
                translation_lines.append(line)

        original    = "\n".join(original_lines).strip()
        translation = "\n".join(translation_lines).strip()

        if not translation:
            self.failed.emit("Could not parse Gemini response")
            return

        self.result_ready.emit(original or "(no original text)", translation)
```

- [ ] **Step 2: Delete ocr_engine.py**

```bash
rm auto-screen-translator/ocr_engine.py
```

- [ ] **Step 3: Commit**

```bash
git add gemini_client.py
git rm ocr_engine.py
git commit -m "feat: add GeminiWorker replacing EasyOCR + translator pipeline"
```

---

### Task 5: Create translation_card.py

**Files:**
- Create: `auto-screen-translator/translation_card.py`
- Delete: `auto-screen-translator/overlay.py`

- [ ] **Step 1: Create translation_card.py**

```python
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QApplication,
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QColor, QPainter, QPainterPath


class TranslationCard(QWidget):
    """One captured region's result: grey original + white translation.

    Clicking anywhere on the card body copies the translation to clipboard.
    The × button dismisses only this card.
    """

    dismissed = pyqtSignal(object)  # emits self so panel can remove it

    def __init__(self, original: str, translation: str, parent=None) -> None:
        super().__init__(parent)
        self.translation = translation
        self._setup_ui(original, translation)

    def _setup_ui(self, original: str, translation: str) -> None:
        self.setCursor(Qt.CursorShape.PointingHandCursor)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 10)
        layout.setSpacing(5)

        # ── header: original text + dismiss button ─────────────────────────
        header = QHBoxLayout()
        header.setSpacing(6)

        orig = QLabel(original)
        orig.setWordWrap(True)
        orig.setStyleSheet("color: rgba(255,255,255,130); font-size: 11px;")
        orig.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        header.addWidget(orig, 1)

        close_btn = QPushButton("×")
        close_btn.setFixedSize(18, 18)
        close_btn.setStyleSheet(
            "QPushButton {"
            "  background: rgba(255,255,255,25); color: rgba(255,255,255,160);"
            "  border: none; border-radius: 9px; font-size: 12px;"
            "}"
            "QPushButton:hover { background: rgba(220,60,60,200); color: white; }"
        )
        close_btn.clicked.connect(lambda: self.dismissed.emit(self))
        header.addWidget(close_btn, 0, Qt.AlignmentFlag.AlignTop)
        layout.addLayout(header)

        # ── translation text ───────────────────────────────────────────────
        self._trans = QLabel(translation)
        self._trans.setWordWrap(True)
        self._trans.setStyleSheet("color: white; font-size: 14px;")
        self._trans.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        layout.addWidget(self._trans)

    # ── interaction ────────────────────────────────────────────────────────

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            QApplication.clipboard().setText(self.translation)
            saved = self._trans.text()
            self._trans.setText("Copied!")
            self._trans.setStyleSheet("color: rgb(100,200,100); font-size: 14px;")
            QTimer.singleShot(900, lambda: (
                self._trans.setText(saved),
                self._trans.setStyleSheet("color: white; font-size: 14px;")
            ))

    # ── painting ───────────────────────────────────────────────────────────

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(0, 0, self.width(), self.height(), 8, 8)
        painter.fillPath(path, QColor(45, 45, 45))
        painter.end()

    def enterEvent(self, event) -> None:
        self.update()

    def leaveEvent(self, event) -> None:
        self.update()
```

- [ ] **Step 2: Delete overlay.py**

```bash
rm auto-screen-translator/overlay.py
```

- [ ] **Step 3: Commit**

```bash
git add translation_card.py
git rm overlay.py
git commit -m "feat: add TranslationCard replacing OverlayWindow"
```

---

### Task 6: Create translation_panel.py

**Files:**
- Create: `auto-screen-translator/translation_panel.py`

- [ ] **Step 1: Create translation_panel.py**

```python
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QScrollArea, QSizeGrip,
)
from PyQt6.QtCore import Qt, QPoint, QTimer
from PyQt6.QtGui import QColor, QPainter

from settings import Settings
from translation_card import TranslationCard


class _LoadingCard(QWidget):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        lbl = QLabel("Translating...")
        lbl.setStyleSheet("color: rgba(255,255,255,130); font-size: 12px;")
        layout.addWidget(lbl)
        self.setStyleSheet(
            "_LoadingCard { background-color: rgb(40,40,40); border-radius: 8px; }"
        )


class TranslationPanel(QWidget):
    """Persistent scrollable panel that accumulates TranslationCards."""

    def __init__(self, settings: Settings, parent=None) -> None:
        super().__init__(parent)
        self._settings      = settings
        self._loading_card: _LoadingCard | None = None
        self._drag_pos      = QPoint()
        self._dragging      = False
        self._setup_ui()

    # ── setup ──────────────────────────────────────────────────────────────

    def _setup_ui(self) -> None:
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
        )
        self.setMinimumSize(280, 200)
        self.setStyleSheet("TranslationPanel { background-color: rgb(28,28,28); }")

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        # ── header bar (drag handle) ───────────────────────────────────────
        header = QWidget()
        header.setFixedHeight(36)
        header.setObjectName("header")
        header.setStyleSheet("#header { background-color: rgb(22,22,22); }")
        hrow = QHBoxLayout(header)
        hrow.setContentsMargins(10, 0, 8, 0)

        title = QLabel("Translations")
        title.setStyleSheet("color: rgba(255,255,255,150); font-size: 12px;")
        hrow.addWidget(title)
        hrow.addStretch()

        clear_btn = QPushButton("Clear all")
        clear_btn.setStyleSheet(
            "QPushButton { background: transparent; color: rgba(255,255,255,110);"
            " border: none; font-size: 11px; }"
            "QPushButton:hover { color: white; }"
        )
        clear_btn.clicked.connect(self.clear_all)
        hrow.addWidget(clear_btn)
        outer.addWidget(header)

        # ── scroll area ────────────────────────────────────────────────────
        self._scroll = QScrollArea()
        self._scroll.setWidgetResizable(True)
        self._scroll.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self._scroll.setStyleSheet(
            "QScrollArea { border: none; background: transparent; }"
            "QScrollBar:vertical { width: 6px; background: rgb(35,35,35); }"
            "QScrollBar::handle:vertical {"
            "  background: rgb(75,75,75); border-radius: 3px; min-height: 20px;"
            "}"
        )

        self._cards_widget = QWidget()
        self._cards_layout = QVBoxLayout(self._cards_widget)
        self._cards_layout.setContentsMargins(8, 8, 8, 8)
        self._cards_layout.setSpacing(8)
        self._cards_layout.addStretch()   # pushes cards to top

        self._scroll.setWidget(self._cards_widget)
        outer.addWidget(self._scroll, 1)

        # ── size grip ──────────────────────────────────────────────────────
        grip_row = QHBoxLayout()
        grip_row.setContentsMargins(0, 0, 2, 2)
        grip_row.addStretch()
        grip_row.addWidget(QSizeGrip(self))
        outer.addLayout(grip_row)

    # ── public API ─────────────────────────────────────────────────────────

    def add_loading_card(self) -> None:
        self._remove_loading()
        self._loading_card = _LoadingCard()
        self._insert(self._loading_card)
        self._scroll_bottom()

    def add_card(self, original: str, translation: str) -> None:
        self._remove_loading()
        card = TranslationCard(original, translation)
        card.dismissed.connect(self._on_dismiss)
        self._insert(card)
        self._scroll_bottom()

    def add_error_card(self, error: str) -> None:
        self._remove_loading()
        card = TranslationCard("Error", f"Translation failed: {error}")
        card.dismissed.connect(self._on_dismiss)
        self._insert(card)

    def clear_all(self) -> None:
        while self._cards_layout.count() > 1:
            item = self._cards_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        self._loading_card = None

    # ── internal helpers ───────────────────────────────────────────────────

    def _insert(self, widget: QWidget) -> None:
        """Insert before the trailing stretch."""
        self._cards_layout.insertWidget(self._cards_layout.count() - 1, widget)

    def _remove_loading(self) -> None:
        if self._loading_card:
            self._cards_layout.removeWidget(self._loading_card)
            self._loading_card.deleteLater()
            self._loading_card = None

    def _on_dismiss(self, card: TranslationCard) -> None:
        self._cards_layout.removeWidget(card)
        card.deleteLater()

    def _scroll_bottom(self) -> None:
        QTimer.singleShot(
            50,
            lambda: self._scroll.verticalScrollBar().setValue(
                self._scroll.verticalScrollBar().maximum()
            ),
        )

    # ── paint / drag / resize ──────────────────────────────────────────────

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor(28, 28, 28))
        painter.end()

    def mousePressEvent(self, event) -> None:
        if (event.button() == Qt.MouseButton.LeftButton
                and event.position().y() <= 36):
            self._drag_pos = (
                event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            )
            self._dragging = True

    def mouseMoveEvent(self, event) -> None:
        if self._dragging:
            self.move(event.globalPosition().toPoint() - self._drag_pos)

    def mouseReleaseEvent(self, event) -> None:
        if self._dragging:
            self._dragging = False
            self._settings.set("panel_x", self.x())
            self._settings.set("panel_y", self.y())

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        self._settings.set("panel_w", self.width())
        self._settings.set("panel_h", self.height())
```

- [ ] **Step 2: Commit**

```bash
git add translation_panel.py
git commit -m "feat: add TranslationPanel with scrollable card list"
```

---

### Task 7: Rewrite toolbar.py

**Files:**
- Modify: `auto-screen-translator/toolbar.py`

- [ ] **Step 1: Replace toolbar.py entirely**

```python
from PyQt6.QtWidgets import (
    QWidget, QHBoxLayout, QComboBox, QLabel, QPushButton,
    QApplication, QDialog, QVBoxLayout, QLineEdit, QListWidget, QListWidgetItem,
)
from PyQt6.QtCore import Qt, QPoint
from PyQt6.QtGui import QColor, QPainter

from settings import Settings
from translation_panel import TranslationPanel
from capture import ScreenCaptureWindow
from languages import FAVORITES, get_all_languages
from gemini_client import GeminiWorker
from api_key_dialog import ApiKeyDialog


# ──────────────────────────────────────────── Language search dialog

class LanguageSearchDialog(QDialog):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Select Language")
        self.setMinimumWidth(320)
        self.selected_code: str | None = None

        layout = QVBoxLayout(self)
        self._search = QLineEdit()
        self._search.setPlaceholderText("Type to search...")
        self._search.textChanged.connect(self._filter)
        layout.addWidget(self._search)

        self._list = QListWidget()
        self._list.itemDoubleClicked.connect(self._accept_item)
        layout.addWidget(self._list)

        self._langs: dict = {}
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


# ──────────────────────────────────────────── Hybrid combo box

class LangCombo(QComboBox):
    _OTHER = "Other..."

    def __init__(self, settings_key: str, settings: Settings, parent=None) -> None:
        super().__init__(parent)
        self._key      = settings_key
        self._settings = settings

        for name, code in FAVORITES:
            self.addItem(name, userData=code)
        self.addItem(self._OTHER, userData=None)

        self._restore(settings.get(settings_key))
        self.currentIndexChanged.connect(self._on_change)

    def _restore(self, code: str) -> None:
        for i, (_, c) in enumerate(FAVORITES):
            if c == code:
                self.setCurrentIndex(i)
                return

    def current_code(self) -> str:
        return self.currentData() or "en"

    def _on_change(self, _index: int) -> None:
        if self.currentText() != self._OTHER:
            self._settings.set(self._key, self.current_code())
            return
        dlg = LanguageSearchDialog(self)
        if dlg.exec() == QDialog.DialogCode.Accepted and dlg.selected_code:
            code = dlg.selected_code
            all_langs = get_all_languages()
            name = next((n for n, c in all_langs.items() if c == code), code)
            insert_at = self.count() - 1
            self.insertItem(insert_at, name, userData=code)
            self.blockSignals(True)
            self.setCurrentIndex(insert_at)
            self.blockSignals(False)
            self._settings.set(self._key, code)
        else:
            self.blockSignals(True)
            self.setCurrentIndex(0)
            self.blockSignals(False)


# ──────────────────────────────────────────── Toolbar window

class ToolbarWindow(QWidget):
    def __init__(self, settings: Settings, panel: TranslationPanel) -> None:
        super().__init__()
        self._settings = settings
        self._panel    = panel
        self._drag_pos = QPoint()
        self._dragging = False
        self._capture_win: ScreenCaptureWindow | None = None
        self._worker:      GeminiWorker        | None = None
        self._setup_ui()

    def _setup_ui(self) -> None:
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
        )
        self.setFixedHeight(56)
        self.setStyleSheet("""
            ToolbarWindow { background-color: rgb(28,28,28); }
            QComboBox {
                background: rgb(50,50,50); color: white;
                border: 1px solid rgba(255,255,255,50);
                border-radius: 5px; padding: 3px 8px; font-size: 12px;
            }
            QComboBox::drop-down { border: none; width: 18px; }
            QComboBox QAbstractItemView {
                background: #2a2a2a; color: white;
                selection-background-color: #3a7bd5;
                border: 1px solid rgba(255,255,255,40);
            }
            QLabel { color: white; font-size: 14px; }
        """)

        row = QHBoxLayout(self)
        row.setContentsMargins(12, 8, 12, 8)
        row.setSpacing(8)

        self._src_combo = LangCombo("source_lang", self._settings, self)
        self._src_combo.setFixedWidth(148)
        row.addWidget(self._src_combo)

        row.addWidget(QLabel("->"))

        self._tgt_combo = LangCombo("target_lang", self._settings, self)
        self._tgt_combo.setFixedWidth(148)
        row.addWidget(self._tgt_combo)

        row.addSpacing(4)

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

        settings_btn = QPushButton("⚙")
        settings_btn.setFixedSize(28, 28)
        settings_btn.setStyleSheet(
            "QPushButton { background: rgba(255,255,255,20); color: white;"
            " border: none; border-radius: 5px; font-size: 14px; }"
            "QPushButton:hover { background: rgba(255,255,255,45); }"
        )
        settings_btn.clicked.connect(self._open_settings)
        row.addWidget(settings_btn)

    def _open_settings(self) -> None:
        dlg = ApiKeyDialog(self._settings.get("gemini_api_key") or "", self)
        if dlg.exec() == QDialog.DialogCode.Accepted:
            self._settings.set("gemini_api_key", dlg.key())

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor(28, 28, 28))
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
        if self._dragging:
            self._dragging = False
            self._settings.set("toolbar_x", self.x())
            self._settings.set("toolbar_y", self.y())

    def _start_capture(self) -> None:
        self._capture_win = ScreenCaptureWindow()
        self._capture_win.region_selected.connect(self._on_region)
        self._capture_win.show()

    def _on_region(self, x: int, y: int, w: int, h: int) -> None:
        if self._worker:
            self._worker.blockSignals(True)

        self._panel.add_loading_card()
        self._panel.show()
        self._panel.raise_()

        from PIL import ImageGrab
        dpr   = QApplication.primaryScreen().devicePixelRatio()
        image = ImageGrab.grab(bbox=(
            int(x * dpr), int(y * dpr),
            int((x + w) * dpr), int((y + h) * dpr),
        ))

        api_key = self._settings.get("gemini_api_key") or ""
        self._worker = GeminiWorker(
            image,
            self._src_combo.current_code(),
            self._tgt_combo.current_code(),
            api_key,
        )
        self._worker.result_ready.connect(self._panel.add_card)
        self._worker.failed.connect(self._panel.add_error_card)
        self._worker.start()
```

- [ ] **Step 2: Commit**

```bash
git add toolbar.py
git commit -m "feat: simplify toolbar - 3 controls + Gemini integration"
```

---

### Task 8: Update main.py

**Files:**
- Modify: `auto-screen-translator/main.py`

- [ ] **Step 1: Replace main.py**

```python
import sys
import os
import traceback
import datetime

_APP_DIR = os.path.dirname(os.path.abspath(__file__))
if _APP_DIR not in sys.path:
    sys.path.insert(0, _APP_DIR)

_LOG = os.path.join(_APP_DIR, "error.log")


def _log(msg: str) -> None:
    try:
        with open(_LOG, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.datetime.now():%H:%M:%S}] {msg}\n")
    except Exception:
        pass


try:
    import certifi
    os.environ["SSL_CERT_FILE"]      = certifi.where()
    os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
    _log("certifi OK")
except ImportError as e:
    _log(f"certifi missing: {e}")

_plugin_path = os.path.join(
    _APP_DIR, "python", "Lib", "site-packages", "PyQt6", "Qt6", "plugins"
)
if os.path.isdir(_plugin_path):
    os.environ["QT_QPA_PLATFORM_PLUGIN_PATH"] = _plugin_path
    _log(f"Qt plugin path: {_plugin_path}")
else:
    _log(f"WARNING: Qt plugin path not found: {_plugin_path}")

if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
        _log("DPI awareness OK")
    except Exception as e:
        _log(f"DPI awareness skipped: {e}")

try:
    from PyQt6.QtWidgets import QApplication, QMessageBox, QDialog
    from PyQt6.QtCore import QTimer
    _log("PyQt6 OK")

    from settings import Settings
    from api_key_dialog import ApiKeyDialog
    from translation_panel import TranslationPanel
    from toolbar import ToolbarWindow
    _log("Modules OK")

    app = QApplication(sys.argv)
    app.setApplicationName("AutoScreenTranslator")
    app.setQuitOnLastWindowClosed(False)
    app.setStyle("Fusion")
    _log("QApplication OK")

    settings = Settings()

    # Show API key setup on first launch (or if key was cleared)
    if not settings.get("gemini_api_key"):
        _log("No API key — showing setup dialog")
        dlg = ApiKeyDialog()
        if dlg.exec() != QDialog.DialogCode.Accepted:
            # User cancelled — try the check below; might still work if key in registry
            pass
        else:
            settings.set("gemini_api_key", dlg.key())

    panel   = TranslationPanel(settings)
    toolbar = ToolbarWindow(settings, panel)
    _log("Windows created OK")

    def _place_and_show() -> None:
        screen = QApplication.primaryScreen().availableGeometry()

        # ── toolbar ────────────────────────────────────────────────────────
        toolbar.adjustSize()
        tw, th = toolbar.width(), toolbar.height()
        try:
            tx = int(settings.get("toolbar_x"))
            ty = int(settings.get("toolbar_y"))
            if not (screen.left() <= tx <= screen.right() - tw and
                    screen.top() <= ty <= screen.bottom() - th):
                raise ValueError
        except (TypeError, ValueError):
            tx = screen.center().x() - tw // 2
            ty = screen.top() + 20

        toolbar.move(tx, ty)
        toolbar.show()
        toolbar.raise_()
        _log(f"Toolbar at ({tx},{ty})")

        # ── panel ──────────────────────────────────────────────────────────
        pw = max(280, int(settings.get("panel_w") or 320))
        ph = max(200, int(settings.get("panel_h") or 500))
        try:
            px = int(settings.get("panel_x"))
            py = int(settings.get("panel_y"))
            if not (screen.left() <= px <= screen.right() - pw and
                    screen.top() <= py <= screen.bottom() - ph):
                raise ValueError
        except (TypeError, ValueError):
            px = min(tx + tw + 10, screen.right() - pw)
            py = ty

        panel.resize(pw, ph)
        panel.move(px, py)
        panel.show()
        panel.raise_()
        _log(f"Panel at ({px},{py}) size {pw}x{ph}")

    QTimer.singleShot(150, _place_and_show)
    _log("Entering event loop")
    sys.exit(app.exec())

except Exception:
    err = traceback.format_exc()
    _log(f"FATAL:\n{err}")
    try:
        from PyQt6.QtWidgets import QApplication, QMessageBox
        _a = QApplication.instance() or QApplication(sys.argv)
        QMessageBox.critical(
            None, "Auto Screen Translator",
            f"Failed to start. See error.log in the app folder.\n\n{err[:500]}"
        )
    except Exception as e2:
        _log(f"Could not show error dialog: {e2}")
```

- [ ] **Step 2: Commit**

```bash
git add main.py
git commit -m "feat: update main.py for panel + Gemini flow"
```

---

### Task 9: Update CI workflow

**Files:**
- Modify: `auto-screen-translator/.github/workflows/build.yml`

- [ ] **Step 1: Replace the pip install steps**

In `.github/workflows/build.yml`, replace the two pip install steps with:

```yaml
      - name: Set up portable Python environment
        shell: pwsh
        run: |
          $pyVer  = "3.11.9"
          $outDir = "dist\AutoScreenTranslator"
          $pyDir  = "$outDir\python"
          New-Item -ItemType Directory -Path $pyDir -Force | Out-Null
          Write-Host "==> Downloading Python $pyVer embeddable..."
          Invoke-WebRequest "https://www.python.org/ftp/python/$pyVer/python-$pyVer-embed-amd64.zip" -OutFile "py-embed.zip"
          Expand-Archive "py-embed.zip" -DestinationPath $pyDir
          $pth = Get-ChildItem $pyDir -Filter "*._pth" | Select-Object -First 1 -ExpandProperty FullName
          (Get-Content $pth) -replace '#import site','import site' | Set-Content $pth
          Write-Host "==> Installing pip..."
          Invoke-WebRequest "https://bootstrap.pypa.io/get-pip.py" -OutFile "get-pip.py"
          & "$pyDir\python.exe" get-pip.py --quiet --no-warn-script-location
          Write-Host "==> Installing dependencies..."
          & "$pyDir\python.exe" -m pip install google-generativeai Pillow certifi PyQt6 --quiet --no-user --no-warn-script-location
          Write-Host "==> Python environment ready."
          "[Paths]`r`nPlugins = Lib/site-packages/PyQt6/Qt6/plugins" | Out-File -FilePath "$pyDir\qt.conf" -Encoding ascii
          Write-Host "==> qt.conf written."
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: remove easyocr/numpy/deep-translator, add google-generativeai"
```

---

### Task 10: Syntax check + final push

**Files:** All modified files in `auto-screen-translator/`

- [ ] **Step 1: Syntax-check all Python files**

```bash
cd auto-screen-translator
python3 -c "
import ast, sys, os
files = [f for f in os.listdir('.') if f.endswith('.py')]
ok = True
for f in files:
    try:
        ast.parse(open(f).read())
        print(f'OK  {f}')
    except SyntaxError as e:
        print(f'ERR {f}: {e}')
        ok = False
sys.exit(0 if ok else 1)
"
```

Expected: all files print `OK`.

- [ ] **Step 2: Push to trigger CI build**

```bash
git push origin main
```

Watch build at: `https://github.com/NicePONPON/auto-screen-translator/actions`

- [ ] **Step 3: After green build — update release notes**

Edit `auto-screen-translator/release-notes.md`:

```markdown
## Auto Screen Translator for Windows

Auto-built from the latest source on main.

### How to install
1. Download AutoScreenTranslator-Windows.zip below
2. Extract the zip to any folder, e.g. C:\AutoScreenTranslator\
3. Double-click AutoScreenTranslator.bat
4. On first launch, enter your free Gemini API key when prompted
   (get one at aistudio.google.com/apikey - no billing required)

### How to use
- Capture: drag to select any screen region - translation appears in the panel
- Click any card to copy its translation to clipboard
- Then click your form field and press Ctrl+V to paste

### First launch note
Enter your Gemini API key once. Free tier: 1500 requests/day.
```

```bash
git add release-notes.md
git commit -m "docs: update release notes for v2 Gemini panel"
git push origin main
```
