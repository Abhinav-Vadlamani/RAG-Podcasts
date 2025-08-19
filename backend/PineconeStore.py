import uuid
import torch
from datetime import datetime
from typing import List, Dict, Any
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer

class PineconeStore:
    def __init__(self, pinecone_api_key: str, index_name: str = "podcast-transcripts"):
        """
        Initialize pinecone storage for podcast transcripts

        Args:
            pinecone_api_key (str): your api key for pinecone
            index_name (str): index name in pinecone for storage of data
        """
        self.embedding_model_type = "sentence-transformers"
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embedding_dimension = 384

        self.pc = Pinecone(api_key=pinecone_api_key)

        # Create index if it doesn't exist
        if index_name not in self.pc.list_indexes().names():
            self.pc.create_index(
                name=index_name,
                dimension=self.embedding_dimension,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )

        self.index = self.pc.Index(index_name)

    def _generate_text_embedding(self, text: str):
        """
        Returns sentence transformer embedding of the text

        Args:
            text (str): text to be embedded
        
        Returns:
            list: the embedding of the text
        """
        return self.embedding_model.encode(text).tolist()
    
    def _chunk_transcript(self, transcript_chunks: List[Dict[str, Any]], chunk_size: int = 2000, overlap: int = 200):
        """
        Converts a transcript into chunks for better parsing by the algorithm

        Args:
            transcript_chunks (List[Dict[str, Any]]): full transcript splitted into chunks 
            chunk_size (int): size of each transcript chunk in pinecone
            overlap (int): character overlap between chunks
        
        Returns:
            List[Dict[str, Any]]: transcript chunked into prefered chunk size
        """
        sorted_chunks = sorted(transcript_chunks, key=lambda x:x['chunk_id'])
        transcript = " ".join([chunk['text'] for chunk in sorted_chunks if chunk.get('success')])

        # chunk up total text
        chunks = []
        start = 0
        text_len = len(transcript)
        chunk_number = 0
        sentence_ends = ['.', '!', '?', '...']

        while start < text_len:
            end = min(start + chunk_size, text_len)
            breakPoint = -1

            if end < text_len:
                for i in range(end - 1, start, -1):
                    if(transcript[i] in sentence_ends and i + 1 < text_len and transcript[i + 1].isspace()):
                        breakPoint = i+1
                        break
            if breakPoint == -1:
                for i in range(end - 1, start, -1):
                    if transcript[i].isspace():
                        breakPoint = i+1
                        break

            if breakPoint > start:
                end = breakPoint

            chunk_text = transcript[start:end].strip()

            if chunk_text:
                chunks.append({
                    'text': chunk_text,
                    'chunk_number': chunk_number,
                    'start_char': start,
                    'end_char': end,
                    'char_count': len(chunk_text)
                })

            start = max(end - overlap, start + 1) if end < text_len else end
        return chunks
    
    def _extract_timestamps_from_transcript(self, transcript_chunks: List[Dict[str, Any]], chunk: Dict):
        """
        Given a particular chunk, return what the corresponding timestamp of it is

        Args:
            transcript_chunks (List[Dict[str, Any]]): full transcript splitted into chunks 
            chunk (Dict): which of the transcript chunks to return time stamps for

        Returns:
            Dict[str, Any]: all relevant timestamp information for the given chunk
        """
        timeline = []
        cumulative_chars = 0
        sorted_chunks = sorted(transcript_chunks, key=lambda x:x['chunk_id'])

        for c in sorted_chunks:
            text = c['text']
            timeline.append({
                'chunk_id': c['chunk_id'],
                'start_time': c['chunk_id'] * 60,
                'end_time': c['chunk_id'] * 60 + 60,
                'text': text,
                'start_char': cumulative_chars,
                'end_char': cumulative_chars + len(text),
                'char_count': len(text)
            })
            cumulative_chars += len(text) + 1

        chunk_start = chunk['start_char']
        chunk_end = chunk['end_char']

        start_timestamp = None
        end_timestamp = None

        # Find segment for start of chunk
        for segment in timeline:
            if segment['start_char'] <= chunk_start < segment['end_char']:
                chars_into_segment = chunk_start - segment['start_char']

                if segment['char_count'] > 0:
                    time_into_segment = (chars_into_segment / segment['char_count']) * 60
                    start_timestamp = segment['start_time'] + time_into_segment
                else:
                    start_timestamp = segment['start_time']
                break
        
        # Find segment for end of chunk
        for segment in timeline:
            if segment['start_char'] < chunk_end <= segment['end_char']:
                chars_into_segment = chunk_end - segment['start_char']

                if segment['char_count'] > 0:
                    time_into_segment = (chars_into_segment / segment['char_count']) * 60
                    end_timestamp = segment['start_time'] + time_into_segment
                else:
                    end_timestamp = segment['start_time']
                break
        
        # Fallback incase we get None values
        if start_timestamp is None:
            start_timestamp = chunk_start / 12.5
        if end_timestamp is None:
            end_timestamp = chunk_end / 12.5

        return {
            'start_time': start_timestamp,
            'end_time': end_timestamp,
            'duration': end_timestamp - start_timestamp
        }
        
    def store_podcast_information(self, transcript_chunks: List[Dict[str, Any]], podcast_metadata: Dict, chat_id: str, 
                                  chunk_size: int = 2000, overlap: int = 200):
        """
        Convert transcript chunks iot embeddings and upsert them into Pinecone storage

        Args:
            transcript_chunks (List[Dict[str, Any]]): full transcript splitted into chunks
            podcast_metadata (Dict[str, Any]): metadata with relevant information about the podcast episode
            chat_id: id for chat for pinecone storage
            chunk_size (int): size of each transcript chunk in pinecone
            overlap (int): character overlap between chunks
        
        Returns:
            Dict[str, Any]: returns information about the storage process
        """
        try:
            # Chunking transcript
            text_chunks = self._chunk_transcript(transcript_chunks=transcript_chunks, chunk_size=chunk_size, overlap=overlap)
            total_chars = sum(len(chunk['text']) for chunk in transcript_chunks if chunk.get('success'))

            # Generating embeddings
            stored_chunks = []
            vectors_to_upsert = []

            for text_chunk in text_chunks:
                embedding = self._generate_text_embedding(text=text_chunk['text'])
                timestamps = self._extract_timestamps_from_transcript(transcript_chunks, text_chunk)

                vector_id = f"{chat_id}_transcript_{str(uuid.uuid4())}"
                stored_chunks.append(vector_id)

                vector_metadata = {
                    "content": text_chunk['text'],
                    "type": "podcast_transcript",
                    "chat_id": chat_id,
                    "chunk_number": text_chunk['chunk_number'],
                    "char_count": text_chunk['char_count'],
                    "start_char": text_chunk['start_char'],
                    "end_char": text_chunk['end_char'],
                    "start_time": timestamps['start_time'],
                    "end_time": timestamps['end_time'],
                    "duration": timestamps['duration'],
                    "created_at": datetime.now().isoformat(),
                    **podcast_metadata  # Include all podcast metadata
                }

                vectors_to_upsert.append({
                    "id": vector_id,
                    "values": embedding,
                    "metadata": vector_metadata
                })

                if len(vectors_to_upsert) >= 100:
                    self.index.upsert(vectors=vectors_to_upsert)
                    vectors_to_upsert = []

            if vectors_to_upsert:
                self.index.upsert(vectors=vectors_to_upsert)

            successful_chunks = [chunk for chunk in transcript_chunks if chunk.get('success')]
            total_duration = max(chunk['end_time'] for chunk in successful_chunks) if successful_chunks else 0

            return {
                "status": "success",
                "chunks_stored": len(stored_chunks),
                "chunk_ids": stored_chunks,
                "podcast_metadata": podcast_metadata,
                "total_characters": total_chars,
                "total_duration_seconds": total_duration,
                "average_chunk_size": sum(chunk['char_count'] for chunk in text_chunks) / len(text_chunks),
                "audio_chunks_processed": len(transcript_chunks),
                "successful_audio_chunks": len(successful_chunks)
            }

        except Exception as e:
            raise Exception(f"Error storing podcast information: {str(e)}")

    def query_podcast(self, question: str, chat_id: str, top_k: int = 5):
        """
        Pinecone query to find transcript chunks that is most similar to user query

        Args:
            query (str): user query
            chat_id (str): Pinecone chat ID
            top_k (int): Maximum results for Pinecone to return

        Returns:
            Dict[str, Any]: all relevant information regarding Pinecone query results
        """
        try:
            question_embedding = self._generate_text_embedding(text=question)
            query_filter = {"chat_id" : {"$eq": chat_id}}

            results = self.index.query(
                vector=question_embedding,
                top_k = top_k,
                include_metadata=True,
                filter=query_filter
            )
            processed_results = []
            for match in results['matches']:
                processed_results.append({
                    "id": match['id'],
                    "score": match['score'],
                    "content": match['metadata']['content'],
                    "type": match['metadata']['type'],
                    "metadata": match['metadata']
                })
            
            return {
                "status": "success",
                "question": question,
                "results_count": len(processed_results),
                "results": processed_results
            }
            
        except Exception as e:
            raise Exception(f"Error querying podcast content: {str(e)}")
        
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