"""
Takes a classified intent (agent + action) and actually executes it,
using the appropriate agent. Currently only 'mail' is wired up.

Each handler takes (speak_fn, listen_fn) so it can have its own
mini conversation (e.g. "reply or skip?") without the main loop
needing to know the details of each agent's flow.
"""
from agents.mail_agent.agent import MailAgent

mail_agent = MailAgent()


def handle_mail_check_inbox(speak, listen) -> None:
    speak("Checking your inbox.")
    try:
        inbox = mail_agent.check_inbox()
    except Exception as e:
        speak(f"I couldn't reach your inbox. {e}")
        return

    if not inbox:
        speak("No unread emails.")
        return

    speak(f"You have {len(inbox)} unread emails.")

    for item in inbox:
        i = item["index"]
        speak(f"Email {i + 1}, from {item['from']}, subject: {item['subject']}.")

        try:
            summary = mail_agent.summarize_email(i)
        except RuntimeError as e:
            speak(f"I had trouble summarizing that one. {e}")
            continue

        speak(summary)
        speak("Do you want to reply, skip, or stop checking mail?")

        decision = (listen() or "").lower()

        if "stop" in decision:
            speak("Stopping mail check.")
            return
        elif "reply" in decision:
            _handle_reply(i, speak, listen)
        else:
            speak("Skipped.")

    speak("That's all your unread mail.")


def _handle_reply(index: int, speak, listen) -> None:
    speak("What would you like to say?")
    instructions = listen()

    if not instructions:
        speak("I didn't catch that. Skipping this email.")
        return

    speak("Drafting your reply.")
    try:
        draft = mail_agent.draft_reply(index, instructions)
    except RuntimeError as e:
        speak(f"I couldn't draft that. {e}")
        return

    speak("Here's the draft:")
    speak(draft)
    speak("Should I send it? Say yes or no.")

    confirmation = (listen() or "").lower()

    if "yes" in confirmation:
        try:
            mail_agent.send_reply(index, draft)
            speak("Sent.")
        except Exception as e:
            speak(f"Sending failed. {e}")
    else:
        speak("Okay, not sending.")


# Registry: (agent, action) -> handler function
HANDLERS = {
    ("mail", "check_inbox"): handle_mail_check_inbox,
}


def dispatch(agent: str | None, action: str | None, speak, listen) -> bool:
    """
    Returns True if a handler was found and run, False if this
    wasn't a recognized agent/action (caller should fall back to
    plain conversation in that case).
    """
    handler = HANDLERS.get((agent, action))
    if handler is None:
        return False
    handler(speak, listen)
    return True
