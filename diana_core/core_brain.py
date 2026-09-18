"""
Diana's core brain: the single Ollama interface for the orchestrator
(separate from mail_agent's own brain.py, which is scoped to that agent).

Two jobs:
  1. classify_intent() — figure out which agent + action the user wants
  2. converse() — general chit-chat / fallback when no agent applies
"""
import json
import requests

import core_config as config


def _generate(prompt: str, system: str = "") -> str:
    payload = {
        "model": config.OLLAMA_MODEL,
        "prompt": prompt,
        "system": system,
        "stream": False,
    }
    try:
        response = requests.post(
            f"{config.OLLAMA_HOST}/api/generate", json=payload, timeout=120
        )
        response.raise_for_status()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Could not reach Ollama. Is it running? Try `ollama run "
            f"{config.OLLAMA_MODEL}` in a terminal first."
        )
    return response.json()["response"].strip()


INTENT_SYSTEM_PROMPT = """You are Diana's intent router. Given the user's \
spoken request, output ONLY a JSON object (no other text, no markdown \
fences) with this shape:

{"agent": "<agent_name or null>", "action": "<action or null>", "reply": "<short spoken acknowledgment>"}

Available agents and their actions:
- mail: actions = ["check_inbox"]  (use when user wants to check, read, or \
hear their email/inbox)

If the request doesn't match any agent (general conversation, questions, \
chit-chat), set agent and action to null and just answer conversationally \
in "reply".

The "reply" field is what Diana will SPEAK back immediately — keep it \
short and natural, like a real assistant acknowledging what it heard.

Output ONLY the JSON object, nothing else."""


def classify_intent(user_text: str) -> dict:
    """
    Returns {"agent": str|None, "action": str|None, "reply": str}
    Falls back to a safe conversational response if the model's
    output isn't valid JSON.
    """
    raw = _generate(user_text, system=INTENT_SYSTEM_PROMPT)

    # Model sometimes wraps JSON in markdown fences despite instructions — strip them.
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        parsed = json.loads(cleaned)
        return {
            "agent": parsed.get("agent"),
            "action": parsed.get("action"),
            "reply": parsed.get("reply", "Okay."),
        }
    except (json.JSONDecodeError, AttributeError):
        # Model didn't return valid JSON — treat the raw text as a
        # conversational reply rather than crashing the loop.
        return {"agent": None, "action": None, "reply": raw}


CONVERSATION_SYSTEM_PROMPT = """You are Diana, a personal AI assistant \
inspired by Diana Burnwood — calm, precise, briskly helpful, never \
overly chatty. Keep responses SHORT (1-3 sentences) since they will be \
spoken aloud, not read."""


def converse(user_text: str) -> str:
    """General conversational fallback, used directly for non-agent chat."""
    return _generate(user_text, system=CONVERSATION_SYSTEM_PROMPT)
