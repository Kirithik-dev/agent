"""
Single entry point for talking to the local Ollama model.
Every other file calls ask() instead of hitting the Ollama API directly,
so swapping models or adding streaming later only touches this file.
"""
import requests

from . import config


def ask(prompt: str, system: str = "") -> str:
    """Send a prompt to the local Ollama model and return its text response."""
    payload = {
        "model": config.OLLAMA_MODEL,
        "prompt": prompt,
        "system": system,
        "stream": False,
    }
    try:
        response = requests.post(
            f"{config.OLLAMA_HOST}/api/generate",
            json=payload,
            timeout=120,
        )
        response.raise_for_status()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Could not reach Ollama. Is it running? Try `ollama run "
            f"{config.OLLAMA_MODEL}` in a terminal first."
        )
    return response.json()["response"].strip()
