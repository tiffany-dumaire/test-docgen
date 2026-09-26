"""
Parseur HTML minimal pour la zone de texte enrichi.

Convertit un fragment HTML (produit par l'éditeur du frontend) en une liste de
« nœuds » simples exploitables par les rendus Word et PDF :

  {"kind": "heading", "level": 1-5, "html": "..."}
  {"kind": "paragraph", "html": "..."}
  {"kind": "list", "ordered": bool, "items": ["html", ...]}
  {"kind": "code", "text": "..."}

Le HTML en ligne conservé se limite à <b>/<strong>, <i>/<em>, <u>, <a href>.
"""
import re
from html.parser import HTMLParser

BLOCK_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li",
              "pre", "div", "br"}
INLINE_KEEP = {"b", "strong", "i", "em", "u", "a", "span", "font"}


def _to_hex(val):
    """Normalise une couleur CSS en #rrggbb (sinon '')."""
    val = (val or "").strip()
    if not val:
        return ""
    if val.startswith("#"):
        h = val[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return "#" + h[:6] if re.fullmatch(r"[0-9a-fA-F]{6}", h[:6]) else ""
    m = re.match(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", val)
    if m:
        return "#%02x%02x%02x" % tuple(min(255, int(x)) for x in m.groups())
    if re.fullmatch(r"[0-9a-fA-F]{6}", val):
        return "#" + val
    return ""


def _color_from_attrs(attrs):
    a = dict(attrs)
    style = a.get("style", "") or ""
    m = re.search(r"color\s*:\s*([^;]+)", style)
    if m:
        return _to_hex(m.group(1))
    return _to_hex(a.get("color", ""))


class _Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.buf = []            # inline HTML en cours
        self.mode = None         # heading level / 'p' / 'li' / 'code'
        self.list_stack = []     # (ordered, items)
        self.cur_list = None

    # -- utilitaires --
    def _flush_inline(self):
        return "".join(self.buf).strip()

    def _start_block(self, mode):
        self._end_block()
        self.mode = mode
        self.buf = []

    def _end_block(self):
        if self.mode is None:
            return
        html = self._flush_inline()
        if self.mode == "code":
            if html:
                self.nodes.append({"kind": "code", "text": _unescape_code(html)})
        elif self.mode == "li":
            if self.cur_list is not None:
                self.cur_list["items"].append(html)
        elif isinstance(self.mode, int):
            if html:
                self.nodes.append({"kind": "heading", "level": self.mode,
                                   "html": html})
        elif self.mode == "p":
            if html:
                self.nodes.append({"kind": "paragraph", "html": html})
        self.mode = None
        self.buf = []

    def handle_starttag(self, tag, attrs):
        if tag in ("ul", "ol"):
            self._end_block()
            self.cur_list = {"kind": "list", "ordered": tag == "ol", "items": []}
        elif tag == "li":
            self._start_block("li")
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._start_block(min(int(tag[1]), 5))
        elif tag == "p" or tag == "div":
            self._start_block("p")
        elif tag == "pre":
            self._start_block("code")
        elif tag == "br":
            self.buf.append("<br/>")
        elif tag in INLINE_KEEP:
            if tag == "a":
                href = dict(attrs).get("href", "")
                self.buf.append(f'<a href="{_esc_attr(href)}">')
            elif tag in ("span", "font"):
                # Conservé uniquement pour la couleur (gras/italique via <b>/<i>).
                self.buf.append(f'<font color="{_color_from_attrs(attrs)}">')
            else:
                self.buf.append(f"<{tag}>")

    def handle_endtag(self, tag):
        if tag in ("ul", "ol"):
            self._end_block()
            if self.cur_list is not None:
                self.nodes.append(self.cur_list)
                self.cur_list = None
        elif tag == "li":
            self._end_block()
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "pre"):
            self._end_block()
        elif tag in INLINE_KEEP:
            if tag == "a":
                self.buf.append("</a>")
            elif tag in ("span", "font"):
                self.buf.append("</font>")
            else:
                self.buf.append(f"</{tag}>")

    def handle_data(self, data):
        if self.mode is None and data.strip():
            # texte hors bloc -> paragraphe implicite
            self._start_block("p")
        self.buf.append(_esc_text(data))


def _esc_text(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _esc_attr(t):
    return t.replace('"', "%22").replace("<", "").replace(">", "")


def _unescape_code(t):
    return (t.replace("<br/>", "\n").replace("&lt;", "<").replace("&gt;", ">")
            .replace("&amp;", "&"))


def parse_html(html: str):
    if not html:
        return []
    p = _Parser()
    p.feed(html)
    p._end_block()
    if p.cur_list is not None:
        p.nodes.append(p.cur_list)
    return p.nodes


# --- Conversion HTML en ligne -> (texte brut + segments enrichis) pour Word ---
_INLINE_RE = re.compile(
    r"(<b>|</b>|<strong>|</strong>|<i>|</i>|<em>|</em>|<u>|</u>|"
    r'<a href="[^"]*">|</a>|<font color="[^"]*">|</font>|<br/>)'
)


def inline_runs(html: str):
    """Segments {text, bold, italic, underline, href, color} depuis l'HTML en ligne."""
    segs = []
    bold = italic = underline = False
    href = None
    color_stack = []
    for part in _INLINE_RE.split(html or ""):
        if not part:
            continue
        low = part.lower()
        if low in ("<b>", "<strong>"):
            bold = True
        elif low in ("</b>", "</strong>"):
            bold = False
        elif low in ("<i>", "<em>"):
            italic = True
        elif low in ("</i>", "</em>"):
            italic = False
        elif low == "<u>":
            underline = True
        elif low == "</u>":
            underline = False
        elif low.startswith("<font "):
            m = re.search(r'color="([^"]*)"', part)
            color_stack.append(m.group(1) if m else "")
        elif low == "</font>":
            if color_stack:
                color_stack.pop()
        elif low == "<br/>":
            segs.append({"text": "\n", "bold": bold, "italic": italic,
                         "underline": underline, "href": href,
                         "color": _cur_color(color_stack)})
        elif low.startswith("<a "):
            m = re.search(r'href="([^"]*)"', part)
            href = m.group(1).replace("%22", '"') if m else None
        elif low == "</a>":
            href = None
        else:
            text = (part.replace("&amp;", "&").replace("&lt;", "<")
                    .replace("&gt;", ">"))
            segs.append({"text": text, "bold": bold, "italic": italic,
                         "underline": underline, "href": href,
                         "color": _cur_color(color_stack)})
    return segs


def _cur_color(stack):
    for c in reversed(stack):
        if c:
            return c
    return None
