
import re
import base64
import quopri

def clean_body_text(text: str, delete_quotes: bool = True) -> str:
    """Clean and normalize extracted email text."""
    if not text:
        return ""

    # 1️⃣ Decode base64 or quoted-printable fragments
    if re.fullmatch(r"[A-Za-z0-9+/=\s]+", text.strip()):
        try:
            decoded = base64.b64decode(text)
            text = decoded.decode("utf-8", errors="replace")
        except Exception:
            pass
    if "=" in text and re.search(r"=[A-F0-9]{2}", text):
        try:
            text = quopri.decodestring(text).decode("utf-8", errors="replace")
        except Exception:
            pass

    # 2️⃣ Remove Outlook / Exchange banners and warnings
    external_banner_patterns = [
        r"\*\*\*.*EXTERNAL.*\*\*\*",
        r"\[EXTERNAL\].*",
        r"\[EXT\].*",
        r"(?i)this message comes from an external.*",
        r"(?i)exercise caution.*unknown senders.*",
        r"(?i)vous n.obtenez pas souvent d.?e.?mail.*",
        r"(?i)pourquoi c.?est important.*",
        r"(?i)you don.?t often get email from.*",
        r"(?i)learn why this is important.*",
    ]
    for pat in external_banner_patterns:
        text = re.sub(pat, "", text, flags=re.IGNORECASE)

    # 3️⃣ Remove quarantine or spam review messages (Microsoft Security Center)
    quarantine_patterns = [
        r"(?is)examiner ces messages.*?déclaration de confidentialité.*règles de bon usage",
        r"(?is)review these messages.*?privacy statement.*acceptable use policy",
        r"(?is)quarantine notification.*?(microsoft corporation|privacy statement).*",
        r"(?is)courriers indésirables bloqués.*?déclaration de confidentialité.*",
    ]
    for pat in quarantine_patterns:
        text = re.sub(pat, "", text)

    # 4️⃣ Remove Microsoft Teams / Outlook / meeting invitation blocks (includes "réunion" + "subject")
    meeting_patterns = [
        r"(?is)_{5,}.*microsoft teams.*?_{5,}",          # Teams footer
        r"(?is)microsoft teams.*?(rejoignez|join|meeting id|id de réunion).*",
        r"(?is)besoin d.?aide\s*\?.*options de réunion.*",
        r"(?is)trouver un num.ro local.*",
        r"(?is)id de la conférence.*",
        r"(?is)options de réunion.*",
        r"(?is)(réunion|meeting).{0,200}(id|code secret|join|rejoindre|subject|objet).*",  # any text block mentioning meeting
        r"(?is)^subject\s*:.*$",                         # English "Subject:"
        r"(?is)^objet\s*:.*$",                           # French "Objet :"
    ]
    for pat in meeting_patterns:
        text = re.sub(pat, "", text)

    # 5️⃣ Normalize whitespace
    text = re.sub(r"\r", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    text = "\n".join(line.strip() for line in text.splitlines())
    text = text.strip()

    if delete_quotes:
        # 6️⃣ Remove quoted replies / history headers
        reply_patterns = [
            r"(?i)^de\s*:.*$",
            r"(?i)^from\s*:.*$",
            r"(?i)^on.*wrote:$",
            r"(?i)^le\s.*\sécrit\s*:$",
        ]
        for pat in reply_patterns:
            match = re.search(pat, text, flags=re.MULTILINE)
            if match:
                text = text[:match.start()]
                break

    # 7️⃣ Remove common signatures (heuristic)
    sig_split = re.split(r"(Cordialement|Bien\s+cordialement|Best regards|Merci,)", text)
    if len(sig_split) > 1:
        text = sig_split[0].strip()
    
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', text)

    return text.strip()

