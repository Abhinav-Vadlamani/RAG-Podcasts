import asyncio
import os
from typing import Optional, List, Dict, Any
import tempfile
from pydub import AudioSegment
import whisper
import torch
from concurrent.futures import ThreadPoolExecutor
import logging
import multiprocessing
import requests
from io import StringIO
import sys

logging.basicConfig(level=logging.INFO)
logging.getLogger("whisper").setLevel(logging.ERROR)
logger = logging.getLogger(__name__)

class transcribe:
    def __init__(self, model_size: str = "tiny", chunk_duration_ms: int = 120000, device: str = None):
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"

        self.model = whisper.load_model(model_size, device=device)
        self.model_size = model_size
        self.chunk_duration_ms = chunk_duration_ms
        self.device = device

        max_workers = 0
        if device == "cpu":
            max_workers = min(multiprocessing.cpu_count(), 8)
        else:
            max_workers = min(multiprocessing.cpu_count(), 12)

        self.threadexecutor = ThreadPoolExecutor(max_workers=max_workers)

    async def transcribe_large_files(self, file_path: str, language: Optional[str] = None, 
                                     initial_prompt: Optional[str] = None, progress_bar: bool = False):
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
                audio, start_time, end_time, i, language, initial_prompt
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)
        os.remove("output.mp3")
        return self._combine(results=results, total_duration_ms=total_duration_ms)

    def _download_file(self, url: str):
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
        response = requests.get(url, stream=True, headers=headers)
        response.raise_for_status()
        with open("output.mp3", "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

    def _transcribe_chunk(self, audio: AudioSegment, start_ms: int, end_ms: int, chunk_id: int, language: Optional[str], 
                          initial_prompt: Optional[str]):
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
        
    def _combine(self, results: List[Dict], total_duration_ms: int): 
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