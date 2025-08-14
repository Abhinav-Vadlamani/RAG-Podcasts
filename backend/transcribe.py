import asyncio
import os
import tempfile
from pydub import AudioSegment
import whisper
import torch
from concurrent.futures import ThreadPoolExecutor
import logging
import multiprocessing
import requests

logging.basicConfig(level=logging.INFO)
logging.getLogger("whisper").setLevel(logging.ERROR)
logger = logging.getLogger(__name__)

class transcribe:
    def __init__(self, model_size: str = "tiny", chunk_duration_ms: int = 60000, device: str = None):
        """
        Initialize transcriber

        Args:
            model_size (str): desired whisper model size
            chunk_duration_ms (str): size of each chunk
            device (str): run whisper on gpu or cpu
        """
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"

        self.model_size = model_size
        self.chunk_duration_ms = chunk_duration_ms
        self.device = device

        max_workers = 0
        if device == "cpu":
            max_workers = min(multiprocessing.cpu_count(), 8)
        else:
            max_workers = min(multiprocessing.cpu_count(), 12)

        self.threadexecutor = ThreadPoolExecutor(max_workers=max_workers)

    async def transcribe_large_files(self, file_path: str, return_timestamps: bool = False):
        """
        Main function to transcribe file

        Args:
            file_path (str): audio url from rss_processor of episode

        Returns:
            list[dict]: full transcripts, duration, and chunks
        """

        self._download_file(file_path)
        audio = AudioSegment.from_file("output.mp3")
        logger.info("Loaded audio")
        total_duration_ms = len(audio)
        total_chunks = (total_duration_ms + self.chunk_duration_ms - 1) // self.chunk_duration_ms
        print()

        loop = asyncio.get_event_loop()
        tasks = []
        logger.info("STARTING TASKS")
        for i in range(total_chunks):
            start_time = i * self.chunk_duration_ms
            end_time = min(start_time + self.chunk_duration_ms, total_duration_ms)

            task = loop.run_in_executor(
                self.threadexecutor,
                self._transcribe_chunk,
                audio, start_time, end_time, i
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)
        os.remove("output.mp3")
        if return_timestamps:
            successful_results = [result for result in results if isinstance(result, dict) and result.get("success")]
            successful_results.sort(key=lambda x: x["chunk_id"])
            return successful_results
        else:
            return self._combine(results=results, total_duration_ms=total_duration_ms)

    def _download_file(self, url: str):
        """
        Download mp3 given url

        Args:
            url (str): audio url from rss_processor of episode
        """

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
        response = requests.get(url, stream=True, headers=headers)
        response.raise_for_status()
        with open("output.mp3", "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

    def _transcribe_chunk(self, audio: AudioSegment, start_ms: int, end_ms: int, chunk_id: int):
        """
        Given chunk of audio, extract full audio

        Args:
            audio (AudioSegment): the processed audio
            start_ms (int): start point of audio
            end_ms: end point of audio
            chunk_id: id of the chunk for future ordering

        Returns:
            list[dict]: returning language, chunk_id, and text
        """

        try:
            chunk = audio[start_ms:end_ms]

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as temp_file:
                chunk.export(temp_file.name, format="wav", parameters=["-ar", "16000", "-ac", "1"])
                
                thread_model = whisper.load_model(self.model_size, device = self.device)
                result = thread_model.transcribe(
                    temp_file.name,
                    word_timestamps=False,
                    verbose=False,
                    fp16=False,
                    temperature=0,
                    best_of=1,
                    beam_size=1,
                    patience=1.0
                )

                return {
                    "chunk_id": chunk_id,
                    "start_time": start_ms / 1000,
                    "end_time": end_ms / 1000,
                    "text": result["text"].strip(),
                    "language": result.get("language"),
                    "success": True
                }

                
        except Exception as e:
            logger.error(f"Chunk {chunk_id} failed: {str(e)}")
            return {
                "chunk_id": chunk_id,
                "start_time": start_ms / 1000,
                "end_time": end_ms / 1000,
                "error": str(e),
                "success": False
            }
        
    def _combine(self, results: list, total_duration_ms: int): 
        """
        Combining the texts from all the chunks into one transcript

        Args:
            results (list): all chunks combined into one file
            total_duration_ms (int): the total duration of the audio file
        
        Returns:
            list[dict]: returns full transcript, language, duration, and how many chunks were successful
        """
        successful_results = [result for result in results if isinstance(result, dict) and result.get("success")]
        failed_results = [result for result in results if isinstance(result, dict) and not result.get("success")]

        successful_results.sort(key=lambda x: x["chunk_id"])

        full_transcript = " ".join([result["text"] for result in successful_results if result["text"]])

        return {
            "text": full_transcript,
            "language": successful_results[0]["language"],
            "duration": total_duration_ms / 1000,
            "successful chunks": len(successful_results),
            "failed chunks": len(failed_results),
            "success": len(successful_results) > 0
        }