from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from Prompts import Prompts
from EpisodeSearch import PineconeEpisodeStore
from TranscriptSearch import PineconeStore
from transcribe import transcribe
from rss_processor import return_episode_items
import os
from uuid import uuid4
from datetime import datetime
import asyncio

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

podcast_prompts = Prompts(openai_key=os.getenv("OPENAI_API"), pinecone_key=os.getenv("PINECONE_API"))
episode_store = PineconeEpisodeStore(pinecone_api_key=os.getenv("PINECONE_API"))
transcript_store = PineconeStore(pinecone_api_key=os.getenv("PINECONE_API"))
transcriber = transcribe()
async def transcribe_url(file_path):
    result = await transcriber.transcribe_large_files(file_path, return_timestamps=True)
    return result
chats = {}

class Chat:
    def __init__(self, title=None, username=None):
        self.id = str(uuid4())
        self.title = title or "New Chat"
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.messages = []
        self.podcast_title = ""
        self.feed_url = ""
        self.episodes = []
        self.username = username

@app.route('/api/chats', methods=['GET'])
def list_chats():
    """
    Return all chats
    """
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Username not in data'}), 400

    return jsonify([{
        'id': chat.id,
        'title': chat.title,
        'created_at': chat.created_at.isoformat(),
        'updated_at': chat.updated_at.isoformat(),
        'last_message': chat.messages[-1] if chat.messages else None,
        'all_messages': chat.messages,
        'episodes': chat.episodes if chat.episodes else [],
        'podcast_name': chat.podcast_title,
        'feed_url': chat.feed_url
    } for chat in chats.values() if chat.username == username])

@app.route('/api/chats', methods=['POST'])
def create_chat():
    """
    Create a new chat
    """
    data = request.get_json()

    chat = Chat(title = data['title'], username = data['username'])
    chats[chat.id] = chat
    return jsonify({
        'id': chat.id,
        'title': chat.title,
        'created_at': chat.created_at.isoformat(),
        'updated_at': chat.updated_at.isoformat(),
        'all_messages': [],
        'username': chat.username
    })

@app.route('/api/chats/<chat_id>', methods=['GET'])
def get_chat(chat_id):
    """
    Return a specific chat
    """
    try:
        chat = chats.get(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        return jsonify({
            'id': chat.id,
            'username': chat.username,
            'title': chat.title,
            'podcast_title': chat.podcast_title,
            'feed_url': chat.feed_url,
            'created_at': chat.created_at.isoformat(),
            'updated_at': chat.updated_at.isoformat(),
            'all_messages': chat.messages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/chats/query-podcast', methods=['POST'])
def query_podcast():
    """
    Query a podcast given a user query
    """
    try:
        data = request.get_json()
        if not data or 'query' not in data or 'chat_id' not in data:
            return jsonify({"error": "Missing query or Chat ID"}), 400
        
        chat = chats.get(data['chat_id'])
        if not chat:
            return jsonify({"error": "Chat not found"}), 404
        
        query = data['query']
        episodes = podcast_prompts.return_relevant_podcasts(query=query)
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
def process_podcast():
    """
    Process a podcast given a podcast and feed_url
    """

    try:
        data = request.get_json()
        if not data or 'feed_url' not in data or 'chat_id' not in data or 'podcast_title' not in data:
            return jsonify({"error": "Missing Feed URL, Chat ID, or Podcast Title"}), 400

        chat = chats.get(data['chat_id'])
        if not chat:
            return jsonify({"error": "Chat not found"}), 404
        
        feed_url = data['feed_url']

        episodes = return_episode_items(feed_url=feed_url)
        episode_store.embed_and_store_episodes(episodes=episodes, chat_id = data['chat_id'])
        chat.podcast_title = data['podcast_title']
        chat.feed_url = feed_url

        return jsonify({
            "status": "success"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/chats/process-episode', methods=['POST'])
def process_episode():
    """
    Process a particular episode
    """
    try:
        data = request.get_json()
        if not data or 'audio_url' not in data or 'chat_id' not in data or 'episode_title' not in data:
            return jsonify({"error": 'Missing audio url, chat id, or episode title'}), 400
        
        chat = chats.get(data['chat_id'])
        if not chat:
            return jsonify({'error': 'chat not found'}), 404
        
        audio_url = data['audio_url']
        chat_id = data['chat_id']

        metadata = {
            'episode_name': data['episode_title'],
            'title': chat.podcast_title
        }

        transcript = asyncio.run(transcribe_url(file_path=audio_url))
        print('finished transcribing')

        store_result = transcript_store.store_podcast_information(transcript_chunks=transcript, podcast_metadata=metadata, chat_id=chat_id)
        return jsonify(store_result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/query', methods=['POST'])
def query():
    try:
        data = request.get_json()
        if not data or 'question' not in data or 'chat_id' not in data:
            return jsonify({"error": 'Missing question or chat id'}), 400
        
        chat = chats.get(data['chat_id'])
        if not chat:
            return jsonify({'error': 'chat not found'}), 404
        
        query = data['question']
        chat_id = data['chat_id']
        search_or_query = podcast_prompts.return_search_or_query(query=query)

        # search for episode
        if search_or_query == "SEARCH":
            episode = podcast_prompts.return_relevant_episode(query=query, chat_id=chat_id)
            output = episode.dict()

            chat.messages.append({
                'type': 'question',
                'isSearch': True,
                'content': query,
                'timestamp': datetime.utcnow().isoformat()
            })

            output_message = f"Successfully processed episode: {output['title']} with audio url: {output['audio url']}. Please enter your query."

            chat.messages.append({
                'type': 'answer',
                'content': output_message,
                'timestamp': datetime.utcnow().isoformat()
            })

            return jsonify({
                'type': 'search',
                'results': output,
                'message': output_message
            })
        
        # query through episode content
        else:
            response = podcast_prompts.query_prompt(query=query, chat_id=chat_id, chats=chats)

            chat.messages.append({
                'type': 'question',
                'content': query,
                'timestamp': datetime.utcnow().isoformat()
            })

            chat.messages.append({
                'type': 'answer',
                'content': response['answer'],
                'timestamp': datetime.utcnow().isoformat()
            })

            chat.updated_at = datetime.utcnow()

            return jsonify({
                'type': 'query',
                'results': response
            })
        
        # Query for content
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    """
    Delete chat given chat_id
    """
    try:
        chat = chats[chat_id]

        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        # episode_store.delete_chat(chat_id=chat_id)
        # transcript_store.delete_chat(chat_id=chat_id)

        del chats[chat_id]

        return jsonify({
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/<chat_id>', methods=['PATCH'])
def update_chat(chat_id):
    """
    Update chat title
    """

    try:
        data = request.get_json()
        if not data or 'update_title' not in data:
            return jsonify({'error': 'Update title not in data'}), 400
        
        chat = chats.get(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        chat.title = data['title']
        chat.updated_at = datetime.utcnow()

        return jsonify({
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5002)