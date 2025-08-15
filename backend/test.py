import asyncio
import transcribe
from dotenv import load_dotenv
import os
import PineconeStore
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
# async def main():
#     transcriber = transcribe.transcribe()
#     result = await transcriber.transcribe_large_files("https://www.buzzsprout.com/2170846/episodes/12628690-002-donald-trump.mp3", return_timestamps=True)
#     print()
#     print("output")
#     return result

# # Run the async function
# transcript_chunks = asyncio.run(main())
# print()
# print()
# store = PineconeStore.PineconeStore(
#     pinecone_api_key=pinecone_api_key,
# )

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
# question = "What do they talk about regarding twitter and elon musk?"
# result = store.query_podcast(question=question, chat_id=chat_id, top_k=5)

# print()
# print()
# print()
# print(result)


# print("loading episodes")
# print()
# print()
# print("running query")
# print(prompting_object.return_relevant_episode(query="Which one talks about Donald Trump", 
#                                                feedUrl='https://feeds.buzzsprout.com/2170846.rss', chat_id='testing_joe_rogan_trump'))
print(prompting_object.return_relevant_podcasts(query="I am interested in learning more about negotiations and sales. I am fairly advanced in this matter, so find stuff that are advanced in this."))