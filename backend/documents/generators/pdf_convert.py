"""
Conversion d'un document Word (.docx) en PDF en utilisant **Microsoft Word**.

On s'appuie sur la bibliothèque ``docx2pdf`` qui pilote l'application Word
installée sur la machine :
  - Windows : automation COM (via ``pywin32``) ;
  - macOS   : automation AppleScript.

Le PDF produit est donc **exactement** celui qu'aurait exporté Word
(« Enregistrer sous → PDF »), avec la charte du modèle, les polices, le logo,
les en-têtes/pieds, etc.

Prérequis : Microsoft Word installé sur le serveur (Windows ou macOS) et
``pip install docx2pdf``. Sur un serveur Linux sans Word, envisagez une
conversion pilotée par Word côté service (Microsoft Graph / Office 365).
"""
import os
import platform
import tempfile


def word_available() -> bool:
    """Vrai si Microsoft Word peut être piloté sur cette machine."""
    if platform.system() not in ("Windows", "Darwin"):
        return False
    try:
        import docx2pdf  # noqa: F401
    except Exception:
        return False
    if platform.system() == "Windows":
        try:
            import win32com.client  # noqa: F401
        except Exception:
            return False
    return True


def available() -> bool:
    """Compat : utilisé par le service de génération."""
    return word_available()


def docx_to_pdf(docx_bytes: bytes) -> bytes:
    """Convertit des octets .docx en octets .pdf **via Microsoft Word**.

    Lève une exception si Word est indisponible ou si la conversion échoue.
    """
    from docx2pdf import convert  # nécessite Microsoft Word

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "doc.docx")
        out = os.path.join(tmp, "doc.pdf")
        with open(src, "wb") as f:
            f.write(docx_bytes)

        # Sous Windows : initialiser COM pour le thread courant (serveur WSGI multi-thread)
        _co = False
        if platform.system() == "Windows":
            try:
                import pythoncom
                pythoncom.CoInitialize()
                _co = True
            except Exception:
                pass
        try:
            convert(src, out)  # pilote Microsoft Word
        finally:
            if _co:
                try:
                    import pythoncom
                    pythoncom.CoUninitialize()
                except Exception:
                    pass

        if not os.path.exists(out):
            raise RuntimeError("Word n'a pas produit le PDF attendu.")
        with open(out, "rb") as f:
            return f.read()
