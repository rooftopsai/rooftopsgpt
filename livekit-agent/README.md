# Rooftops AI - LiveKit Voice Agent

Real-time voice assistant for Rooftops AI using LiveKit Agents SDK.

## Features

- Real-time voice conversations with STT (Speech-to-Text)
- Natural language understanding via GPT-4o-mini
- Text-to-Speech with OpenAI or ElevenLabs (for premium voices)
- Voice Activity Detection (VAD) with Silero

## Local Development

1. Install dependencies:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. Configure environment variables (see `.env` file):
```bash
LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
OPENAI_API_KEY=your_openai_key
ELEVEN_API_KEY=your_elevenlabs_key  # Optional, for premium voices
```

3. Run the agent:
```bash
python agent.py start
```

## Production Deployment

### Option 1: Railway (Recommended - Free Tier Available)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and create project:
```bash
cd livekit-agent
railway login
railway init
```

3. Set environment variables:
```bash
railway variables set LIVEKIT_URL=wss://rooftopsai-t0eylram.livekit.cloud
railway variables set LIVEKIT_API_KEY=your_api_key
railway variables set LIVEKIT_API_SECRET=your_api_secret
railway variables set OPENAI_API_KEY=your_openai_key
```

4. Deploy:
```bash
railway up
```

### Option 2: Render

1. Create a `render.yaml`:
```yaml
services:
  - type: worker
    name: rooftops-voice-agent
    runtime: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: LIVEKIT_URL
        value: wss://rooftopsai-t0eylram.livekit.cloud
      - key: LIVEKIT_API_KEY
        sync: false  # Add in dashboard
      - key: LIVEKIT_API_SECRET
        sync: false  # Add in dashboard
      - key: OPENAI_API_KEY
        sync: false  # Add in dashboard
```

2. Connect your GitHub repo to Render
3. Add environment variables in Render dashboard
4. Deploy

### Option 3: Fly.io

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Launch app:
```bash
cd livekit-agent
fly launch --dockerfile Dockerfile
```

3. Set secrets:
```bash
fly secrets set LIVEKIT_URL=wss://rooftopsai-t0eylram.livekit.cloud
fly secrets set LIVEKIT_API_KEY=your_key
fly secrets set LIVEKIT_API_SECRET=your_secret
fly secrets set OPENAI_API_KEY=your_key
```

4. Deploy:
```bash
fly deploy
```

### Option 4: Docker on VPS (DigitalOcean, AWS EC2, etc.)

1. Build the Docker image:
```bash
cd livekit-agent
docker build -t rooftops-voice-agent .
```

2. Run the container:
```bash
docker run -d \
  --name rooftops-voice-agent \
  --restart unless-stopped \
  -e LIVEKIT_URL="wss://rooftopsai-t0eylram.livekit.cloud" \
  -e LIVEKIT_API_KEY="your_api_key" \
  -e LIVEKIT_API_SECRET="your_api_secret" \
  -e OPENAI_API_KEY="your_openai_key" \
  rooftops-voice-agent
```

3. Check logs:
```bash
docker logs -f rooftops-voice-agent
```

### Option 5: systemd Service on Ubuntu/Debian

1. Create service file `/etc/systemd/system/rooftops-voice-agent.service`:
```ini
[Unit]
Description=Rooftops AI Voice Agent
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/rooftops-voice-agent
Environment="LIVEKIT_URL=wss://rooftopsai-t0eylram.livekit.cloud"
Environment="LIVEKIT_API_KEY=your_key"
Environment="LIVEKIT_API_SECRET=your_secret"
Environment="OPENAI_API_KEY=your_key"
ExecStart=/opt/rooftops-voice-agent/venv/bin/python agent.py start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable rooftops-voice-agent
sudo systemctl start rooftops-voice-agent
sudo systemctl status rooftops-voice-agent
```

## Monitoring

Check agent health:
- Railway: `railway logs`
- Render: View logs in dashboard
- Fly.io: `fly logs`
- Docker: `docker logs -f rooftops-voice-agent`
- systemd: `journalctl -u rooftops-voice-agent -f`

## Troubleshooting

**Agent not connecting:**
- Verify LIVEKIT_URL is correct WebSocket endpoint
- Check API key/secret are valid
- Ensure agent has internet access

**No speech recognition:**
- Verify OPENAI_API_KEY is valid and has credits
- Check microphone permissions in browser
- Review browser console for WebRTC errors

**Poor voice quality:**
- Add ELEVEN_API_KEY for ElevenLabs (premium voices)
- Check network latency to LiveKit Cloud
- Adjust VAD parameters in agent.py

## Architecture

```
User Browser (WebRTC)
    ↓
LiveKit Cloud (wss://rooftopsai-t0eylram.livekit.cloud)
    ↓
Python Agent (this service)
    ├── STT: OpenAI Whisper
    ├── LLM: GPT-4o-mini
    ├── TTS: OpenAI / ElevenLabs
    └── VAD: Silero
```

## Cost Estimates

- **LiveKit Cloud**: Free tier or ~$0.50-2/hour for production
- **OpenAI API**: ~$0.002/minute for voice (STT + LLM + TTS)
- **ElevenLabs** (optional): ~$0.24/1K characters for premium voices
- **Hosting**: $0-5/month (Railway free tier) or $5-20/month (Render/Fly.io/VPS)

Total: ~$5-50/month depending on usage

## Security Notes

- Never commit `.env` file to git
- Use secret management (Railway secrets, Render env vars, etc.)
- Rotate API keys periodically
- Restrict LiveKit API key permissions if possible

## Support

For issues with:
- LiveKit SDK: https://docs.livekit.io/agents
- OpenAI API: https://platform.openai.com/docs
- ElevenLabs: https://elevenlabs.io/docs
