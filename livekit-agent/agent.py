import logging
from dotenv import load_dotenv

from livekit.agents import JobContext, WorkerOptions, cli, voice
from livekit.plugins import openai, silero

load_dotenv()

logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)


class RooftopsAssistant(voice.Agent):
    def __init__(self):
        super().__init__(
            instructions="You are a helpful and friendly AI assistant for Rooftops AI. You help users with roofing-related questions. Keep responses concise and natural for voice conversation."
        )


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the voice assistant"""

    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect()

    # Create the agent session with balanced VAD
    session = voice.AgentSession(
        stt=openai.STT(),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(voice="nova"),
        vad=silero.VAD.load(
            min_speech_duration=0.2,  # Require at least 0.2s of speech
            min_silence_duration=0.5,  # Require 0.5s of silence before ending speech
            activation_threshold=0.55,  # Slightly higher threshold to reduce false triggers
        ),
    )

    # Start the session with the assistant
    await session.start(room=ctx.room, agent=RooftopsAssistant())

    # Greet the user
    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
