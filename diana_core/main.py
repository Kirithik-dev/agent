"""
DIANA — Core orchestrator (voice loop)

Flow each cycle:
  1. Listen for what the user says
  2. Classify intent (which agent/action, or plain conversation)
  3. Route to the right agent, or just converse
  4. Speak the result

Run with: python main.py

By default (WAKE_ON_ENTER=true in .env) you press Enter before each
listen — this makes testing far more reliable than continuous
open-mic listening, which picks up background noise and false-triggers.
Flip WAKE_ON_ENTER=false once the core loop is solid if you want
always-listening behavior.
"""
import core_config as config
import core_brain as brain
import listener
import speaker
import router


def get_user_input() -> str | None:
    if config.WAKE_ON_ENTER:
        input("\n[press Enter, then speak]")
    return listener.listen()


def main() -> None:
    print("=" * 60)
    print("DIANA — CORE ONLINE")
    print("=" * 60)
    speaker.speak("Diana online. How can I help?")

    while True:
        user_text = get_user_input()

        if not user_text:
            continue  # nothing understood, just loop and listen again

        if user_text.strip().lower() in ("exit", "quit", "goodbye", "stop diana"):
            speaker.speak("Goodbye.")
            break

        try:
            intent = brain.classify_intent(user_text)
        except RuntimeError as e:
            speaker.speak(str(e))
            continue

        # Speak Diana's immediate acknowledgment first
        if intent["reply"]:
            speaker.speak(intent["reply"])

        handled = router.dispatch(
            intent["agent"], intent["action"], speaker.speak, listener.listen
        )

        if not handled and intent["agent"] is None:
            # Pure conversation case — intent["reply"] above already
            # was the conversational answer, nothing more to do.
            pass


if __name__ == "__main__":
    main()
