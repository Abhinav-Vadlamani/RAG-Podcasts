from pydantic import BaseModel, Field
from typing import List, Dict, Any
import numpy as np
from langchain_openai import OpenAIEmbeddings
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
import time

class PineconeEpisodeStore:
    def __init__(self, pinecone_api_key: str, openai_api_key: str, index_name: str = "podcast-episodes"):
        self.index_name = index_name
        self.embeddings = SentenceTransformer('all-MiniLM-L6-v2')
        # self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=openai_api_key)
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
        return title[:200] if len(title) > 200 else title, summary[:1000] if len(summary) > 1000 else summary
    
    def _create_embedding_text(self, episode: Dict[str, Any]):
        title, summary = self._trim_text(episode.get('title', ''), episode.get('summary', ''))
        return f"Title: {title}\n\nSummary: {summary}"
    
    def embed_and_store_episodes(self, episodes: List[Dict[str, Any]], batch_size: int = 100):
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
                    "audioUrl": episode["audioUrl"]
                }
            })
        
        for i in range(0, len(vectors), batch_size):
            batch_vectors = vectors[i:i+batch_size]
            self.index.upsert(vectors=batch_vectors)

    def query_episodes(self, query: str, chat_id: str, k: int = 5):
        query_embedding = self.embeddings.encode([query], convert_to_tensor=False)[0].tolist()
        query_filter = {"chat_id": {"$eq": chat_id}}
        search_results = self.index.query(
            vector=query_embedding,
            top_k=k,
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
                "score": match.score
            }
            episodes.append(episode)
        return episodes

