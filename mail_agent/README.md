# Diana — Mail Agent (Phase 1, standalone)

A command-line mail agent: fetches unread Gmail, summarizes each one
with a local Ollama model, and lets you approve/draft/send replies —
all before any UI is involved.

## Setup

1. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and fill in:
   - `GMAIL_ADDRESS` — your Gmail address
   - `GMAIL_APP_PASSWORD` — the 16-character App Password (not your normal password)

4. Make sure Ollama is running and the model in `.env` (`OLLAMA_MODEL`,
   default `llama3.1:8b`) is pulled:
   ```
   ollama pull llama3.1:8b
   ```

5. Run it:
   ```
   python agent.py
   ```

## What it does

- Connects to Gmail via IMAP, pulls your most recent unread emails
  (count controlled by `MAX_EMAILS` in `.env`)
- Summarizes each one using your local model
- For each email: reply, skip, or quit
- If you choose reply: tell it what to say, it drafts, you approve/edit/cancel
- Only sends on your explicit "y" — nothing goes out without approval

## File map

| File | Responsibility |
|---|---|
| `config.py` | Loads and validates all settings from `.env` |
| `imap_client.py` | Connects to Gmail, fetches + parses unread emails |
| `brain.py` | Single interface to the local Ollama model |
| `summarizer.py` | Turns an email into a short summary |
| `drafter.py` | Turns instructions + original email into a reply draft |
| `sender.py` | Sends the approved reply via SMTP |
| `agent.py` | Main loop tying it all together — this is what you run |

## Next steps (not built yet)

- Wrap this as an `Agent` class so the orchestrator can call it
  programmatically instead of via terminal input
- Swap terminal I/O for calls to the Neural Map frontend (via a
  FastAPI bridge)
- Persist summaries/decisions to ChromaDB for long-term memory