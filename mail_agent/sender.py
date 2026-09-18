"""
Sends an approved reply via SMTP.
"""
import smtplib
from email.mime.text import MIMEText
from email.utils import parseaddr

import config
from imap_client import EmailMessage


def send_reply(original: EmailMessage, reply_body: str) -> None:
    to_address = parseaddr(original.sender)[1]
    subject = original.subject
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    msg = MIMEText(reply_body)
    msg["From"] = config.GMAIL_ADDRESS
    msg["To"] = to_address
    msg["Subject"] = subject

    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(config.GMAIL_ADDRESS, config.GMAIL_APP_PASSWORD)
        smtp.send_message(msg)