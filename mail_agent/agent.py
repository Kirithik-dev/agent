"""
DIANA — Mail Agent (standalone, Phase 1)

Flow:
  1. Connect to Gmail, fetch unread emails
  2. Summarize each one
  3. Ask the user: reply / skip / quit
  4. If reply: ask what to say, draft it, show for approval
  5. On approval: send. On rejection: let user edit instructions and retry.

Run with: python agent.py
"""
import sys

import config
import imap_client
import summarizer
import drafter
import sender


def print_header(text: str) -> None:
    print("\n" + "=" * 60)
    print(text)
    print("=" * 60)


def handle_reply_flow(msg: imap_client.EmailMessage) -> None:
    while True:
        instructions = input(
            "\nWhat do you want to say? (or 'cancel' to skip this email)\n> "
        ).strip()

        if instructions.lower() == "cancel":
            print("Skipped.")
            return

        print("\nDrafting reply...")
        try:
            draft = drafter.draft_reply(msg, instructions)
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
                sender.send_reply(msg, draft)
                print("Sent.")
            except Exception as e:
                print(f"Failed to send: {e}")
            return
        elif action == "e":
            continue  # loop back and ask for new instructions
        else:
            print("Cancelled.")
            return


def main() -> None:
    print_header("DIANA — MAIL AGENT (Phase 1, standalone)")
    print(f"Connecting to {config.GMAIL_ADDRESS} ...")

    try:
        messages = imap_client.fetch_unread(config.MAX_EMAILS)
    except Exception as e:
        print(f"\nFailed to connect/fetch mail: {e}")
        print("Check your .env — GMAIL_ADDRESS and GMAIL_APP_PASSWORD.")
        sys.exit(1)

    if not messages:
        print("\nNo unread emails. Nothing to do.")
        return

    print(f"\nFound {len(messages)} unread email(s).")

    for i, msg in enumerate(messages, start=1):
        print_header(f"EMAIL {i}/{len(messages)}")
        print(f"From:    {msg.sender}")
        print(f"Subject: {msg.subject}")

        print("\nSummarizing...")
        try:
            summary = summarizer.summarize(msg)
        except RuntimeError as e:
            print(f"Error: {e}")
            continue

        print(f"\nSummary: {summary}")

        action = input(
            "\n[r]eply / [s]kip / [q]uit: "
        ).strip().lower()

        if action == "q":
            print("\nStopping.")
            break
        elif action == "r":
            handle_reply_flow(msg)
        else:
            print("Skipped.")

    print_header("DONE")


if __name__ == "__main__":
    main()