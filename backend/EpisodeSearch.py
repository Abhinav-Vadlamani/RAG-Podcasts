from pydantic import BaseModel, Field
from typing import List, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
import time

class PineconeEpisodeStore:
    def __init__(self, pinecone_api_key: str, index_name: str = "podcast-episodes"):
        """
        Initialize Pinecone Store for Episode search

        Args:
            pinecone_api_key (str): api key for your pinecone storage
            index_name (str): pinecone index name for storage
        """
        self.index_name = index_name
        self.embeddings = SentenceTransformer('all-MiniLM-L6-v2')
        self.dimension = 384

        self.pc = Pinecone(api_key = pinecone_api_key)
        if index_name not in self.pc.list_indexes().names():
            self.pc.create_index(
                name=index_name,
                dimension=self.dimension,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )

        self.index = self.pc.Index(index_name)

    def _trim_text(self, title: str, summary: str):
        """
        Trim text for preparation to store in Pinecone for optimized performance

        Args:
            title (str): the title of the episode
            summary (str): the summary of the episode

        Returns:
            tuple: first element is the trimmed title, second is the trimmed summary
        """
        return title[:200] if len(title) > 200 else title, summary[:1000] if len(summary) > 1000 else summary
    
    def _create_embedding_text(self, episode: Dict[str, Any]):
        """
        Given a episode, return the title and summary combined for the embedding process

        Args:
            title (str): the title of the episode
            summar (str): the summary of the episode
        
            Returns:
                str: combined text for embedding
        """
        title, summary = self._trim_text(episode.get('title', ''), episode.get('summary', ''))
        return f"Title: {title}\n\nSummary: {summary}"
    
    def embed_and_store_episodes(self, episodes: List[Dict[str, Any]], chat_id: str, batch_size: int = 100):
        """
        Convert a list of episodes into embeddings and upsert them into Pinecone storage

        Args:
            episodes (List[Dict[str, Any]]): List of all episodes
            batch_size: size of batch to be uploaded at each epoch
        """
        texts = []
        processed_episodes = []

        for episode in episodes:
            title, summary = self._trim_text(episode.get('title', ''), episode.get('summary', ''))

            processed_episode = {
                "id": episode.get('id', ""),
                "title": title,
                "summary": summary,
                "published": episode.get("published", ""),
                "audioUrl": episode.get("audioUrl", "")
            }

            processed_episodes.append(processed_episode)
            texts.append(self._create_embedding_text(processed_episode))

        all_embeddings = []
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            batch_embeddings = self.embeddings.encode(batch_texts, convert_to_tensor=False)
            all_embeddings.extend(batch_embeddings.tolist())
            time.sleep(0.5)

        vectors = []
        for episode, embedding in zip(processed_episodes, all_embeddings):
            vectors.append({
                "id": episode["id"],
                "values": embedding,
                "metadata": {
                    "title": episode["title"],
                    "summary": episode["summary"],
                    "published": episode["published"],
                    "audioUrl": episode["audioUrl"],
                    'chat_id': chat_id
                }
            })
        
        for i in range(0, len(vectors), batch_size):
            batch_vectors = vectors[i:i+batch_size]
            self.index.upsert(vectors=batch_vectors)

    def query_episodes(self, query: str, chat_id: str, k: int = 5):
        """
        Pinecone query to find episode that is most similar to user query

        Args:
            query (str): user query
            chat_id (str): Pinecone chat ID
            k (int): Maximum results for Pinecone to return
        Returns:
            List[Dict[str, Any]]: list of all potential episodes that might match user query. 
        """
        query_embedding = self.embeddings.encode([query], convert_to_tensor=False)[0].tolist()
        query_filter = {"chat_id": str(chat_id)}
        search_results = self.index.query(
            vector=query_embedding,
            top_k=100,
            include_metadata=True,
            filter=query_filter
        )
        
        episodes = []
        for match in search_results.matches:
            episode = {
                "id": match.id,
                "title": match.metadata["title"],
                "summary": match.metadata["summary"],
                "published": match.metadata.get("published", ""),
                "audioUrl": match.metadata.get("audioUrl", ""),
                "chat_id": match.metadata.get("chat_id", ""),
                "score": match.score
            }
            episodes.append(episode)
        filtered_episodes = [episode for episode in episodes if episode.get('chat_id') == chat_id]
        return filtered_episodes
    
    def delete_chat(self, chat_id: str):
        """"
        Delete chat given pinecone id

        Args:
            chat_id (str): Pinecone chat ID

        Returns:
            Dict[str, Any]: status
        """
        try:
            self.index.delete(
                filter={"chat_id": {"$eq": chat_id}}
            )

            return {
                "status": "success"
            }
        except Exception as e:
            raise Exception(f"Error deleting contents: {str(e)}")