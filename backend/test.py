import asyncio
import transcribe

async def main():
    transcriber = transcribe.transcribe()
    result = await transcriber.transcribe_large_files("https://www.buzzsprout.com/2170846/episodes/12628690-002-donald-trump.mp3") 
    with open("output.txt", "w", encoding="utf-8") as f:
        f.write(result["text"])

# Run the async function
asyncio.run(main())