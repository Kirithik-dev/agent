"""
Microphone input -> text, via speech_recognition (uses Google's free
web API by default — no key needed, but requires internet; swap
recognizer method later for a fully offline engine like Vosk if needed).
"""
import speech_recognition as sr

_recognizer = sr.Recognizer()


def listen(timeout: int = 8, phrase_time_limit: int = 15) -> str | None:
    """
    Listens on the default microphone and returns recognized text,
    or None if nothing was understood / no speech detected.
    """
    with sr.Microphone() as source:
        print("[listening] (adjusting for ambient noise...)")
        _recognizer.adjust_for_ambient_noise(source, duration=0.5)
        print("[listening] speak now...")
        try:
            audio = _recognizer.listen(
                source, timeout=timeout, phrase_time_limit=phrase_time_limit
            )
        except sr.WaitTimeoutError:
            print("[listening] no speech detected.")
            return None

    try:
        text = _recognizer.recognize_google(audio)
        print(f"[heard] {text}")
        return text
    except sr.UnknownValueError:
        print("[listening] could not understand audio.")
        return None
    except sr.RequestError as e:
        print(f"[listening] speech recognition service error: {e}")
        return None
