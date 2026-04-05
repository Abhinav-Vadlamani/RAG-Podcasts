from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from dotenv import load_dotenv
from Prompts import Prompts
from EpisodeSearch import PineconeEpisodeStore
from TranscriptSearch import PineconeStore
from transcribe import transcribe
from rss_processor import return_episode_items
from models import db, bcrypt, ChatModel
from auth import auth
import os
from uuid import uuid4
from datetime import datetime
import asyncio

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

# Database
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_ACCESS_COOKIE_NAME'] = 'access_token'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # enable in production

db.init_app(app)
bcrypt.init_app(app)
JWTManager(app)
app.register_blueprint(auth)

CORS(app, resources={
    r"/api/*": {
        "origins": "http://localhost:3000",
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

podcast_prompts = Prompts(openai_key=os.getenv("OPENAI_API"), pinecone_key=os.getenv("PINECONE_API"))
episode_store = PineconeEpisodeStore(pinecone_api_key=os.getenv("PINECONE_API"))
transcript_store = PineconeStore(pinecone_api_key=os.getenv("PINECONE_API"))
transcriber = transcribe()

async def transcribe_url(file_path):
    result = await transcriber.transcribe_large_files(file_path, return_timestamps=True)
    return result

@app.route('/api/chats', methods=['GET'])
@jwt_required(locations=['cookies'])
def list_chats():
    user_id = int(get_jwt_identity())
    chats = ChatModel.query.filter_by(user_id=user_id).order_by(ChatModel.updated_at.desc()).all()
    return jsonify([{
        'id': c.id,
        'title': c.title,
        'created_at': c.created_at.isoformat(),
        'updated_at': c.updated_at.isoformat(),
        'last_message': c.messages[-1] if c.messages else None,
        'all_messages': c.messages,
        'podcast_name': c.podcast_title,
        'feed_url': c.feed_url
    } for c in chats])

@app.route('/api/chats', methods=['POST'])
@jwt_required(locations=['cookies'])
def create_chat():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    chat = ChatModel(
        id=str(uuid4()),
        title=data.get('title', 'New Chat'),
        user_id=user_id,
        messages=[]
    )
    db.session.add(chat)
    db.session.commit()
    return jsonify({
        'id': chat.id,
        'title': chat.title,
        'created_at': chat.created_at.isoformat(),
        'updated_at': chat.updated_at.isoformat(),
        'all_messages': []
    })

@app.route('/api/chats/<chat_id>', methods=['GET'])
@jwt_required(locations=['cookies'])
def get_chat(chat_id):
    user_id = int(get_jwt_identity())
    chat = ChatModel.query.filter_by(id=chat_id, user_id=user_id).first()
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    return jsonify({
        'id': chat.id,
        'title': chat.title,
        'podcast_title': chat.podcast_title,
        'feed_url': chat.feed_url,
        'created_at': chat.created_at.isoformat(),
        'updated_at': chat.updated_at.isoformat(),
        'all_messages': chat.messages
    })

@app.route('/api/chats/query-podcast', methods=['POST'])
@jwt_required(locations=['cookies'])
def query_podcast():
    try:
        data = request.get_json()
        if not data or 'query' not in data or 'chat_id' not in data:
            return jsonify({"error": "Missing query or Chat ID"}), 400

        user_id = int(get_jwt_identity())
        chat = ChatModel.query.filter_by(id=data['chat_id'], user_id=user_id).first()
        if not chat:
            return jsonify({"error": "Chat not found"}), 404

        episodes = podcast_prompts.return_relevant_podcasts(query=data['query'])
        return jsonify({
            'status': 'success',
            'podcast 1': episodes[0] if len(episodes) >= 1 else None,
            'podcast 2': episodes[1] if len(episodes) >= 2 else None,
            'podcast 3': episodes[2] if len(episodes) >= 3 else None,
            'podcast 4': episodes[3] if len(episodes) >= 4 else None,
            'podcast 5': episodes[4] if len(episodes) >= 5 else None,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chats/process-podcast', methods=['POST'])
@jwt_required(locations=['cookies'])
def process_podcast():
    try:
        data = request.get_json()
        if not data or 'feed_url' not in data or 'chat_id' not in data or 'podcast_title' not in data:
            return jsonify({"error": "Missing Feed URL, Chat ID, or Podcast Title"}), 400

        user_id = int(get_jwt_identity())
        chat = ChatModel.query.filter_by(id=data['chat_id'], user_id=user_id).first()
        if not chat:
            return jsonify({"error": "Chat not found"}), 404

        episodes = return_episode_items(feed_url=data['feed_url'])
        episode_store.embed_and_store_episodes(episodes=episodes, chat_id=data['chat_id'])

        chat.podcast_title = data['podcast_title']
        chat.feed_url = data['feed_url']
        db.session.commit()

        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chats/process-episode', methods=['POST'])
@jwt_required(locations=['cookies'])
def process_episode():
    try:
        data = request.get_json()
        if not data or 'audio_url' not in data or 'chat_id' not in data or 'episode_title' not in data:
            return jsonify({"error": 'Missing audio url, chat id, or episode title'}), 400

        user_id = int(get_jwt_identity())
        chat = ChatModel.query.filter_by(id=data['chat_id'], user_id=user_id).first()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        metadata = {
            'episode_name': data['episode_title'],
            'title': chat.podcast_title
        }

        transcript = asyncio.run(transcribe_url(file_path=data['audio_url']))
        store_result = transcript_store.store_podcast_information(
            transcript_chunks=transcript,
            podcast_metadata=metadata,
            chat_id=data['chat_id']
        )
        return jsonify(store_result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chats/load-and-answer', methods=['POST'])
@jwt_required(locations=['cookies'])
def load_and_answer():
    """
    Transcribe an episode then immediately answer the original question using the transcript.
    """
    try:
        data = request.get_json()
        if not data or 'audio_url' not in data or 'chat_id' not in data or 'episode_title' not in data or 'original_question' not in data:
            return jsonify({'error': 'Missing audio_url, chat_id, episode_title, or original_question'}), 400

        user_id = int(get_jwt_identity())
        chat = ChatModel.query.filter_by(id=data['chat_id'], user_id=user_id).first()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        # Transcribe and store
        metadata = {'episode_name': data['episode_title'], 'title': chat.podcast_title}
        transcript = asyncio.run(transcribe_url(file_path=data['audio_url']))
        transcript_store.store_podcast_information(
            transcript_chunks=transcript,
            podcast_metadata=metadata,
            chat_id=data['chat_id']
        )

        # Track which episodes have been loaded for this chat
        loaded_episodes = list(chat.loaded_episodes or [])
        if data['episode_title'] not in loaded_episodes:
            loaded_episodes.append(data['episode_title'])
            chat.loaded_episodes = loaded_episodes

        # Answer the original question using the fresh transcript
        messages = list(chat.messages or [])
        chats_proxy = {data['chat_id']: type('obj', (object,), {'messages': messages, 'podcast_title': chat.podcast_title})()}
        response = podcast_prompts.query_prompt(
            query=data['original_question'],
            chat_id=data['chat_id'],
            chats=chats_proxy
        )

        # Replace the needsLoad answer message with a resolved one
        for i in range(len(messages) - 1, -1, -1):
            if messages[i].get('needsLoad') and messages[i].get('originalQuestion') == data['original_question']:
                messages[i] = {
                    'type': 'answer',
                    'content': response['answer'],
                    'timestamp': datetime.utcnow().isoformat(),
                    'loadedEpisode': data['episode_title']
                }
                break

        chat.messages = messages
        chat.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'status': 'success', 'answer': response['answer']})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/query', methods=['POST'])
@jwt_required(locations=['cookies'])
def query():
    try:
        data = request.get_json()
        if not data or 'question' not in data or 'chat_id' not in data:
            return jsonify({"error": 'Missing question or chat id'}), 400

        user_id = int(get_jwt_identity())
        chat = ChatModel.query.filter_by(id=data['chat_id'], user_id=user_id).first()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        query_text = data['question']
        messages = list(chat.messages or [])

        # Check Pinecone directly — if transcripts exist for this chat, answer from them.
        # Only fall back to SEARCH (episode metadata) if no transcripts have been loaded yet.
        has_transcript = transcript_store.has_transcripts(chat_id=data['chat_id'])

        # Use the LLM classifier only when transcripts exist, to distinguish between
        # questions about loaded vs unloaded episodes.
        if has_transcript:
            loaded_episodes = list(chat.loaded_episodes or [])
            search_or_query = podcast_prompts.return_search_or_query(
                query=query_text,
                loaded_episodes=loaded_episodes
            )
        else:
            search_or_query = "SEARCH"

        if search_or_query == "SEARCH":
            episode = podcast_prompts.return_relevant_episode(query=query_text, chat_id=data['chat_id'])
            episode_dict = episode.dict() if episode else None

            messages.append({
                'type': 'question',
                'content': query_text,
                'timestamp': datetime.utcnow().isoformat()
            })

            if episode_dict:
                answer = podcast_prompts.answer_from_episode_metadata(
                    query=query_text,
                    episode={
                        'title': episode_dict.get('title', ''),
                        'summary': episode_dict.get('summary', '')
                    }
                )
                messages.append({
                    'type': 'answer',
                    'content': answer,
                    'timestamp': datetime.utcnow().isoformat(),
                    'needsLoad': True,
                    'episodeData': {
                        'title': episode_dict.get('title', ''),
                        'audio_url': episode_dict.get('audio_url', ''),
                        'summary': episode_dict.get('summary', '')
                    },
                    'originalQuestion': query_text
                })
            else:
                messages.append({
                    'type': 'answer',
                    'content': "I couldn't find a matching episode. Try rephrasing or ask about a different episode.",
                    'timestamp': datetime.utcnow().isoformat()
                })

            chat.messages = messages
            chat.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({'type': 'query', 'results': {'answer': messages[-1]['content']}})
        else:
            # Pass chats dict-like object — build a minimal proxy for Prompts compatibility
            chats_proxy = {data['chat_id']: type('obj', (object,), {'messages': messages, 'podcast_title': chat.podcast_title})()}
            response = podcast_prompts.query_prompt(query=query_text, chat_id=data['chat_id'], chats=chats_proxy)

            messages.append({
                'type': 'question',
                'content': query_text,
                'timestamp': datetime.utcnow().isoformat()
            })
            messages.append({
                'type': 'answer',
                'content': response['answer'],
                'timestamp': datetime.utcnow().isoformat()
            })

            chat.messages = messages
            chat.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'type': 'query',
                'results': response
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/<chat_id>', methods=['DELETE'])
@jwt_required(locations=['cookies'])
def delete_chat(chat_id):
    try:
        user_id = int(get_jwt_identity())
        chat = ChatModel.query.filter_by(id=chat_id, user_id=user_id).first()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        db.session.delete(chat)
        db.session.commit()
        episode_store.delete_chat(chat_id=chat_id)
        transcript_store.delete_chat(chat_id=chat_id)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/<chat_id>', methods=['PATCH'])
@jwt_required(locations=['cookies'])
def update_chat(chat_id):
    try:
        data = request.get_json()
        if not data or 'update_title' not in data:
            return jsonify({'error': 'Update title not in data'}), 400

        user_id = int(get_jwt_identity())
        chat = ChatModel.query.filter_by(id=chat_id, user_id=user_id).first()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        chat.title = data['title']
        chat.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='127.0.0.1', port=5002)
