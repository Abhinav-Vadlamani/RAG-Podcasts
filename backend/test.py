import asyncio
import transcribe
from dotenv import load_dotenv
import os
import PineconeStore
import EpisodeSearch
from rss_processor import return_episode_items
import Prompts

load_dotenv()
pinecone_api_key = os.getenv("PINECONE_API")
openai_api_key = os.getenv("OPENAI_API")

podcast_metadata = {
    "title": "The Joe Rogan AI Experience",
    "host": "AI",
    "episode_number": 2,
    "episode_name": "Joe Rogan x Trump"
}
prompting_object = Prompts.Prompts(openai_key=openai_api_key, pinecone_key=pinecone_api_key)
async def main():
    transcriber = transcribe.transcribe()
    result = await transcriber.transcribe_large_files("https://www.buzzsprout.com/2170846/episodes/12628690-002-donald-trump.mp3", return_timestamps=True)
    print()
    print("output")
    return result

# Run the async function
# transcript_chunks = asyncio.run(main())
# print()
# print()
store = PineconeStore.PineconeStore(
    pinecone_api_key=pinecone_api_key,
)
episode_store = EpisodeSearch.PineconeEpisodeStore(
    pinecone_api_key=pinecone_api_key
)

# print()
# print()
# print("attempting to store")
# chat_id = "testing_joe_rogan"
# store_result = store.store_podcast_information(
#     transcript_chunks=transcript_chunks,
#     podcast_metadata=podcast_metadata,
#     chat_id=chat_id
# )

# print()
# print()
# print("query question")
# question = "What do they talk about in the first minute?"
# result = store.query_podcast(question=question, chat_id=chat_id, top_k=2)

# print()
# print()
# print()
# print(result.get('results')[0])
# desired_result = result.get('results')[0]
# output = {
#     'id': desired_result.get('id'),
#     'content': desired_result.get('content'),
#     'duration': desired_result.get('metadata').get('duration'),
#     'end_time': desired_result.get('metadata').get('end_time'),
#     'start_time': desired_result.get('metadata').get('start_time'),
#     'episode_name': desired_result.get('metadata').get('episode_name')
# }

# print()
# print()
# print()
# print(output)

# print()
# print()
# print()
# print(prompting_object.return_relevant_transcript(query='What do they talk about in the first minute?', chat_id=chat_id))

# feedUrl = "https://feeds.buzzsprout.com/2170846.rss"
# episodes = return_episode_items(feedUrl)
# episode_store.embed_and_store_episodes(episodes)

# print("loading episodes")
# print()
# print()
# print("running query")
# print(prompting_object.return_relevant_episode(query="Which one talks about Donald Trump", chat_id='testing_joe_rogan_trump'))
# print(prompting_object.return_relevant_podcasts(query="I am interested in learning more about negotiations and sales. I am fairly advanced in this matter, so find stuff that are advanced in this."))
print(prompting_object.return_search_or_query(query="What does trump talk about regarding twitter?"))