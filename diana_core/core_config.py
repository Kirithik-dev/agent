import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

WAKE_ON_ENTER = os.getenv("WAKE_ON_ENTER", "true").lower() == "true"
TTS_RATE = int(os.getenv("TTS_RATE", "175"))
