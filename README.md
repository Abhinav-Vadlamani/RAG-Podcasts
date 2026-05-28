# RAG Podcasts

A chat app that lets you have conversations with your favorite podcasts. Pick a podcast, browse its episodes, and ask questions — the app transcribes episodes using Whisper and answers your questions using RAG (retrieval-augmented generation) over the transcript.

## How it works

1. You search for a podcast by topic or name
2. The app loads the podcast's episode list from its RSS feed
3. When you ask a question, it finds the most relevant episode and transcribes it on the fly
4. Your question is answered using the transcript, with full conversation history

## Tech stack

- **Frontend** — React + TypeScript
- **Backend** — Flask (Python)
- **Transcription** — OpenAI Whisper
- **Embeddings & vector search** — Pinecone + sentence-transformers
- **LLM** — OpenAI (via LangChain)
- **Database** — PostgreSQL (user accounts + chat history)

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL
- A [Pinecone](https://www.pinecone.io/) account and index
- An [OpenAI](https://platform.openai.com/) API key

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/nav1211/RAG-Podcasts.git
cd RAG-Podcasts
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Any random string for Flask sessions |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/podcasts` |
| `JWT_SECRET_KEY` | Any random string for signing JWTs |
| `OPENAI_API` | Your OpenAI API key |
| `PINECONE_API` | Your Pinecone API key |

Move the .env file to the backend folder.

### 3. Set up the backend

```bash
pip install -r requirements.txt
```

Create the database tables (runs automatically on first start, but you can also do it manually):

```bash
cd backend
python -c "from app import app; from models import db; app.app_context().push(); db.create_all()"
```

Start the Flask server:

```bash
cd backend
python app.py
```

The API will be running at `http://localhost:5002`.

### 4. Set up the frontend

```bash
cd podcast-chat-frontend
npm install
npm start
```

The app will open at `http://localhost:3000`.

---

## Usage

1. Open `http://localhost:3000` and create an account
2. Start a new chat and search for a podcast by topic (e.g. "machine learning", "true crime")
3. Select a podcast — the app loads its episode list in the background
4. Ask a question. The app will find the most relevant episode, transcribe it, and answer you
5. Keep asking follow-up questions; the conversation context is preserved

> **Note:** The first question in a new chat takes longer because Whisper needs to transcribe the episode audio. Subsequent questions that reference the same episode are instant.
