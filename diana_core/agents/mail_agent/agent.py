"""
DIANA — Mail Agent (Phase 1, class-based)

MailAgent wraps the whole pipeline (fetch → summarize → draft → send)
as callable methods, so it can be driven either by a terminal loop
(see __main__ below) or later by the orchestrator/router — no code
duplication between the two.
"""
from dataclasses import dataclass, field

from . import config
from . import imap_client
from . import summarizer
from . import drafter
from . import sender
from .imap_client import EmailMessage


@dataclass
class MailAgent:
    """
    Stateless between calls except for a small cache of the last
    fetched emails, so callers can reference "email 3" without
    re-fetching or passing the full object back in.
    """
    name: str = "mail"
    _last_fetch: list[EmailMessage] = field(default_factory=list)

    # ---- core pipeline methods ------------------------------------

    def check_inbox(self, max_emails: int | None = None) -> list[dict]:
        """
        Fetch unread emails and return lightweight summaries the
        caller (CLI, orchestrator, voice layer) can present to the user.
        Does NOT summarize with the LLM yet — that's summarize_all(),
        kept separate so a caller can choose to fetch without paying
        the LLM cost immediately.
        """
        n = max_emails or config.MAX_EMAILS
        self._last_fetch = imap_client.fetch_unread(n)
        return [
            {"index": i, "from": m.sender, "subject": m.subject}
            for i, m in enumerate(self._last_fetch)
        ]

    def summarize_email(self, index: int) -> str:
        """Summarize a single email from the last fetch, by index."""
        msg = self._get(index)
        return summarizer.summarize(msg)

    def summarize_all(self) -> list[dict]:
        """Convenience: fetch + summarize every email in one call."""
        results = []
        for i, msg in enumerate(self._last_fetch):
            results.append(
                {
                    "index": i,
                    "from": msg.sender,
                    "subject": msg.subject,
                    "summary": summarizer.summarize(msg),
                }
            )
        return results

    def draft_reply(self, index: int, instructions: str) -> str:
        """Draft a reply to email `index` based on user instructions."""
        msg = self._get(index)
        return drafter.draft_reply(msg, instructions)

    def send_reply(self, index: int, body: str) -> None:
        """Send an already-approved reply body to email `index`."""
        msg = self._get(index)
        sender.send_reply(msg, body)

    # ---- internal helpers -------------------------------------------

    def _get(self, index: int) -> EmailMessage:
        if not self._last_fetch:
            raise RuntimeError("No emails fetched yet. Call check_inbox() first.")
        if index < 0 or index >= len(self._last_fetch):
            raise IndexError(
                f"Email index {index} out of range (fetched {len(self._last_fetch)})."
            )
        return self._last_fetch[index]


# ----------------------------------------------------------------------
# CLI runner — same behavior as before, now just driving the class.
# This is what you get when you run `python agent.py` directly.
# The orchestrator will call MailAgent's methods directly instead of
# going through this terminal loop.
# ----------------------------------------------------------------------

def _print_header(text: str) -> None:
    print("\n" + "=" * 60)
    print(text)
    print("=" * 60)


def _cli_reply_flow(agent: MailAgent, index: int) -> None:
    while True:
        instructions = input(
            "\nWhat do you want to say? (or 'cancel' to skip this email)\n> "
        ).strip()

        if instructions.lower() == "cancel":
            print("Skipped.")
            return

        print("\nDrafting reply...")
        try:
            draft = agent.draft_reply(index, instructions)
        except RuntimeError as e:
            print(f"Error: {e}")
            return

        print("\n--- DRAFT REPLY ---")
        print(draft)
        print("--- END DRAFT ---")

        action = input(
            "\nSend this? [y]es / [e]dit instructions / [n]o, cancel: "
        ).strip().lower()

        if action == "y":
            try:
                agent.send_reply(index, draft)
                print("Sent.")
            except Exception as e:
                print(f"Failed to send: {e}")
            return
        elif action == "e":
            continue
        else:
            print("Cancelled.")
            return


def main() -> None:
    _print_header("DIANA — MAIL AGENT (Phase 1, standalone CLI)")
    print(f"Connecting to {config.GMAIL_ADDRESS} ...")

    agent = MailAgent()

    try:
        inbox = agent.check_inbox()
    except Exception as e:
        print(f"\nFailed to connect/fetch mail: {e}")
        print("Check your .env — GMAIL_ADDRESS and GMAIL_APP_PASSWORD.")
        return

    if not inbox:
        print("\nNo unread emails. Nothing to do.")
        return

    print(f"\nFound {len(inbox)} unread email(s).")

    for item in inbox:
        i = item["index"]
        _print_header(f"EMAIL {i + 1}/{len(inbox)}")
        print(f"From:    {item['from']}")
        print(f"Subject: {item['subject']}")

        print("\nSummarizing...")
        try:
            summary = agent.summarize_email(i)
        except RuntimeError as e:
            print(f"Error: {e}")
            continue

        print(f"\nSummary: {summary}")

        action = input("\n[r]eply / [s]kip / [q]uit: ").strip().lower()

        if action == "q":
            print("\nStopping.")
            break
        elif action == "r":
            _cli_reply_flow(agent, i)
        else:
            print("Skipped.")

    _print_header("DONE")


if __name__ == "__main__":
    main()
