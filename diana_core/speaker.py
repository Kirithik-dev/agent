"""
Text -> spoken audio, via pyttsx3 (fully offline, uses your OS's
built-in voices — no API keys, no internet needed for this part).
"""
import pyttsx3

import core_config as config

_engine = pyttsx3.init()
_engine.setProperty("rate", config.TTS_RATE)


def speak(text: str) -> None:
    print(f"[diana] {text}")
    _engine.say(text)
    _engine.runAndWait()
