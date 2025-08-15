import PineconeStore
from pydantic import BaseModel, Field
import EpisodeSearch
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from apple_catalog import search_shows, lookup_episodes
from rss_processor import return_episode_items, return_podcast_summary
import os

# Prompt Pipeline
# Initialized environment by picking podcast -> pick ideal podcast -> in chat, search through episodes -> query through target episode
class Search_For_Episode(BaseModel):
    id: str = Field(description = "Episode ID")
    title: str = Field(description = "Episode title")
    summary: str = Field(description = "Episode summary")

class Prompts:
    def __init__(self, openai_key: str, pinecone_key: str):
        os.environ['TOKENIZERS_PARALLELISM'] = "false"
        self.episode_store = EpisodeSearch.PineconeEpisodeStore(pinecone_api_key=pinecone_key, openai_api_key=openai_key)
        self.transcript_store = PineconeStore.PineconeStore(pinecone_api_key=pinecone_key)
        self.model = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=openai_key,
            max_tokens = 500
        )
    # TBD
    def return_search_or_query(self, query: str):
        prompt = f"""
        Analyze the following query: {query}
        Is this a request to search for a Podcast episode or a question about a podcast video content
        """


    def return_relevant_podcasts(self, query: str):
        """Return the most relevant podcast given the users input"""

        try:
            prompt = f"""
            Convert this query given by the user into a simple Apple iTunes search query for podcasts. Provide no other text besides the 
            final query as your output will be parsed by a search algorithm. Make sure the search query you provide is very, very broad as
            Apple iTunes search is likely to be unable to find very specific search queries. 
            Here is the user query: {query}
            """

            messages = [HumanMessage(content=prompt)]
            response = self.model.invoke(messages)
            podcast_search_query = response.content.strip()

            podcasts = search_shows(term=podcast_search_query, limit=5)
            if len(podcasts) == 0:
                prompt = f"""
                Convert this query that you provided to something very, very broad as Apple iTunes search was unbale to find any relevant podcasts.
                Give only the search query as your output will be parsed by a search algorithm. Here is the old query: {podcast_search_query}
                """
                podcast_search_query = self.model.invoke([HumanMessage(content=prompt)]).content.strip()
                # return podcast_search_query
                podcasts = search_shows(term=podcast_search_query, limit=5)
            return podcasts
        except Exception as e:
            raise Exception(f"Failure to find podcast: {str(e)}")
        
    def return_relevant_episode(self, query: str, feedUrl: str, chat_id: str):
        """Returns the most relevant episode"""
        try:
            print()
            print()
            print("storing episodes")
            episodes = return_episode_items(feedUrl)
            self.episode_store.embed_and_store_episodes(episodes)
            print()
            print()
            print("query")
            top_episodes = self.episode_store.query_episodes(query=query, chat_id=chat_id)

            episodes_text_for_prompt = []
            for i, episode in enumerate(top_episodes, 1):
                episodes_text_for_prompt.append(
                    f"{i}. ID: {episode.get('id', "")}\n"
                    f"     Title: {episode.get('title', "")}\n"
                    f"     Summary: {episode.get('summary', "")}\n"
                )

            print()
            print()
            print("GPT")
            prompt = f"""Given the user query: {query}
                You are trying to match this user query to one of the following podcast episodes that closely match it.
                Please select the SINGLE best matching podcast episode from the following candidates:

                {chr(10).join(episodes_text_for_prompt)}

                Consider:
                1. Relevance to the user's query
                2. How well the episode content matches what the user is looking for
                3. The quality and specificity of the match

                Return ONLY the ID, title, and summary of the BEST matching episode."""
            
            structured_llm = self.model.with_structured_output(Search_For_Episode)
            return structured_llm.invoke(prompt)

        except Exception as e:
            raise Exception(f"Failure to find episode: {str(e)}")
        
    def return_relevant_transcript():
        return "TO_BE_DONE"
