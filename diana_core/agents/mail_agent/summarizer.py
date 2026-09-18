"""
Summarizes emails using the local LLM.
"""
from . import brain
from .imap_client import EmailMessage

SYSTEM_PROMPT = (
    "You are Diana's mail-summarizing subsystem. Given an email, produce a "
    "2-3 sentence summary covering: who it's from, what they want or are "
    "telling the user, and whether it needs a reply. Be concise and factual. "
    "Do not add greetings or commentary — output only the summary."
)


def summarize(msg: EmailMessage) -> str:
    prompt = (
        f"From: {msg.sender}\n"
        f"Subject: {msg.subject}\n\n"
        f"Body:\n{msg.body[:3000]}"  # cap length so we don't blow past context
    )
    return brain.ask(prompt, system=SYSTEM_PROMPT)
