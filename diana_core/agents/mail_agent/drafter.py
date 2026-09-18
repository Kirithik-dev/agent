"""
Drafts a reply to an email using the local LLM, based on what the
user says they want to say.
"""
from . import brain
from .imap_client import EmailMessage

SYSTEM_PROMPT = (
    "You are Diana's mail-drafting subsystem. Write a professional, concise "
    "email reply based on the original email and the user's instructions for "
    "what to say. Output ONLY the reply body text — no subject line, no "
    "'Dear X' placeholder guessing beyond what's reasonable, no explanation "
    "of what you did."
)


def draft_reply(original: EmailMessage, instructions: str) -> str:
    prompt = (
        f"Original email from: {original.sender}\n"
        f"Subject: {original.subject}\n"
        f"Body:\n{original.body[:2000]}\n\n"
        f"---\n"
        f"User's instructions for the reply: {instructions}\n\n"
        f"Write the reply now."
    )
    return brain.ask(prompt, system=SYSTEM_PROMPT)
