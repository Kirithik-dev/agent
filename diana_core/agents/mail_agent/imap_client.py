"""
Handles all IMAP communication: connecting to Gmail and pulling
unread emails into plain Python objects the rest of the agent can use.
"""
import email
import email.message
import imaplib
from dataclasses import dataclass
from email.header import decode_header

from . import config


@dataclass
class EmailMessage:
    uid: str
    sender: str
    subject: str
    body: str


def _decode(value: str) -> str:
    """Decode MIME-encoded header text (subjects/senders can be encoded)."""
    if not value:
        return ""
    parts = decode_header(value)
    decoded = ""
    for text, charset in parts:
        if isinstance(text, bytes):
            decoded += text.decode(charset or "utf-8", errors="replace")
        else:
            decoded += text
    return decoded


def _extract_body(msg: email.message.Message) -> str:
    """Pull the plain-text body out of a (possibly multipart) email."""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))
            if content_type == "text/plain" and "attachment" not in disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        return "(no plain-text body found)"
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace")
        return "(empty body)"


def fetch_unread(max_emails: int = 10) -> list[EmailMessage]:
    """Connect to Gmail via IMAP and return the most recent unread emails."""
    imap = imaplib.IMAP4_SSL(config.IMAP_HOST, config.IMAP_PORT)
    imap.login(config.GMAIL_ADDRESS, config.GMAIL_APP_PASSWORD)
    imap.select("INBOX")

    status, data = imap.search(None, "UNSEEN")
    if status != "OK":
        imap.logout()
        return []

    uids = data[0].split()
    uids = uids[-max_emails:]  # most recent N unread
    uids.reverse()  # newest first

    messages = []
    for uid in uids:
        status, msg_data = imap.fetch(uid, "(RFC822)")
        if status != "OK":
            continue
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)

        messages.append(
            EmailMessage(
                uid=uid.decode(),
                sender=_decode(msg.get("From", "")),
                subject=_decode(msg.get("Subject", "(no subject)")),
                body=_extract_body(msg).strip(),
            )
        )

    imap.logout()
    return messages
