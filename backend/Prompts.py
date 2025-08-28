import TranscriptSearch
from pydantic import BaseModel, Field
import EpisodeSearch
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from apple_catalog import search_shows, lookup_episodes
from rss_processor import return_episode_items, return_podcast_summary
import os

# Prompt Pipeline
# Initialized environment by picking podcast -> pick ideal podcast -> in chat, search through episodes -> query through target episode
class Search_For_Episode(BaseModel):
    id: str = Field(description = "Episode ID")
    title: str = Field(description = "Episode title")
    summary: str = Field(description = "Episode summary")
    audio_url: str = Field(description = "Episode adio url")

class Prompts:
    def __init__(self, openai_key: str, pinecone_key: str):
        """
        Initialize Prompts object

        Args:
            openai_key (str): your openai api key
            pinecone_key (str): your pinecone api key
        """
        os.environ['TOKENIZERS_PARALLELISM'] = "false"
        self.episode_store = EpisodeSearch.PineconeEpisodeStore(pinecone_api_key=pinecone_key)
        self.transcript_store = TranscriptSearch.PineconeStore(pinecone_api_key=pinecone_key)
        self.model = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=openai_key,
            max_tokens = 500
        )
    
    def return_search_or_query(self, query: str):
        """
        Given a query, returns whether it is a search or a query

        Args:
            query (str): user query
        
        Returns
            str: SEARCH or QUERY based on model output
        """
        prompt = f"""
        Analyze the following query: {query}
        Is this a request to search for a Podcast episode or a question about a podcast video content.

        Return only either "SEARCH" or "QUERY" and nothing else as your response will be parsed by an algorithm.

        Examples:
        - "find episodes about cooking" -> "SEARCH"
        - "search for magic tutorials" -> "SEARCH"
        - "look up episodes about basketball" -> "SEARCH"
        - "what did they say about the impact of social media?" -> "QUERY"
        - "can you explain the podcasts main points?" -> "QUERY"
        - "what happened in this episode?" -> QUERY
        """

        response = self.model.invoke([HumanMessage(content=prompt)])
        return response.content.strip()

    def return_relevant_podcasts(self, query: str):
        """
        Return the most relevant podcast given the users input
        
        Args:
            query (str): user query
        
        Returns:
            List[Dict[str, Any]]: a list of the most relevant podcasts and its corresponding information
        """

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
        
    def return_relevant_episode(self, query: str, chat_id: str):
        """
        Returns the most relevant episode
        
        Args:
            query (str): user query
            feedUrl (str): feedUrl of the podcast with all the episodes
            chat_id (str): id of the chat for pinecone

        Returns:
            Search_For_Episode: pydantic BaseModel object containing the most relevant episode id, title, and summary
        """
        try:
            top_episodes = self.episode_store.query_episodes(query=query, chat_id=chat_id)
            if top_episodes == []:
                return None

            episodes_text_for_prompt = []
            for i, episode in enumerate(top_episodes, 1):
                episodes_text_for_prompt.append(
                    f"{i}. ID: {episode.get('id', "")}\n"
                    f"     Title: {episode.get('title', "")}\n"
                    f"     Summary: {episode.get('summary', "")}\n"
                    f"     Audio URL: {episode.get('audioUrl', "")}\n"
                )

            prompt = f"""Given the user query: {query}
                You are trying to match this user query to one of the following podcast episodes that closely match it.
                Please select the SINGLE best matching podcast episode from the following candidates:

                {chr(10).join(episodes_text_for_prompt)}

                Consider:
                1. Relevance to the user's query
                2. How well the episode content matches what the user is looking for
                3. The quality and specificity of the match

                Return ONLY the ID, title, summary, and audio url of the BEST matching episode."""

            structured_llm = self.model.with_structured_output(Search_For_Episode)
            return structured_llm.invoke(prompt)

        except Exception as e:
            raise Exception(f"Failure to find episode: {str(e)}")
        
    def return_relevant_transcript(self, query: str, chat_id: str):
        """
        Returns the most relevant transcript

        Args:
            query (str): user query
            chat_id (str): id of chat for pinecone
        
        Returns:
            Dict[str, Any]: Dictionary of all useful information regarding the most relevant transcript
        """

        try:
            result = self.transcript_store.query_podcast(question=query, chat_id=chat_id, top_k=10)
            print("====Processed 2======")
            if result.get('results_count') == 0:
                return None
            print("====Processed 3======")
            results = sorted(result.get('results'), key=lambda x:x['score'])
            sorted_results = results[0]
            print("====Processed 4======")
            output = {
                'id': sorted_results.get('id'),
                'content': sorted_results.get('content'),
                'duration': sorted_results.get('metadata').get('duration'),
                'end_time': sorted_results.get('metadata').get('end_time'),
                'start_time': sorted_results.get('metadata').get('start_time'),
                'episode_name': sorted_results.get('metadata').get('episode_name')
            }
            return output
        except Exception as e:
            raise Exception(f"Failure to find relevant transcript: {str(e)}")
        
    def _format_prompt(self, data_dict):
        chat_history = ""
        if "past_messages" in data_dict and data_dict["past_messages"]:
            chat_history = "\nPrevious conversations:\n"
            for message in data_dict['past_messages']:
                if not isinstance(message['content'], list) and 'isSearch' not in message:
                    prefix = "Human: " if message['type'] == 'question' else 'Assistant: '
                    chat_history += f"{prefix}{message['content']}\n"

        messages = []
        messages.append( {
            "type": "text",
            "text": (
                f"You are analyzing a podcast episode. Here is the relevant context and question:\n\n"
                f"Transcript excerpt:\n{' '.join(data_dict['context']['texts'])}\n\n"
                f"{chat_history}\n"
                f"Current question: {data_dict['question']}\n\n"
                f"Please answer the current question based on the podcast episode content and previous conversation context."
            )
        })

        return [HumanMessage(content=messages)]

    def query_prompt(self, query, chat_id, chats):
        try:
            print("====Processed 5======")
            transcript_info = self.return_relevant_transcript(query=query, chat_id=chat_id)
            print("====Processed 6======")
            context = {"texts": transcript_info.get('content') if transcript_info else chats[chat_id].podcast_title}
            print()
            print()
            print(context)

            past_messages = []
            if chat_id in chats:
                chat = chats[chat_id]
                past_messages = chat.messages if chat else []
            
            chain = (
                {
                    'context': lambda _: context,
                    'question': RunnablePassthrough(),
                    'past_messages': lambda _: past_messages
                }
                | RunnableLambda(self._format_prompt)
                | self.model
                | StrOutputParser()
            )

            response = chain.invoke(query)

            return {
                'answer': response,
                'context': {
                    'text': context.get('texts')
                }
            }
        
        except Exception as e:
            raise Exception(f"Failure to query: {str(e)}")