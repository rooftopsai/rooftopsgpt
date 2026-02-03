# ElevenLabs Conversational AI Setup Guide

**For:** Rooftops AI Phone Assistant ("Monty")  
**Purpose:** Enable phone calls with AI assistant  
**Use Case:** Steele's daughter (and customers) can call and talk to AI

---

## Overview

This guide sets up ElevenLabs Conversational AI to handle phone calls for Rooftops AI. The AI assistant (named "Monty") will answer questions about roofing, AI tools, and the Rooftops AI platform.

---

## Step 1: ElevenLabs Account Setup

### 1.1 Sign Up
1. Go to https://elevenlabs.io/conversational-ai
2. Click "Get Started" or "Sign Up"
3. Create account with steeleagentic@gmail.com
4. Verify email

### 1.2 Choose Plan
For phone capabilities, you need:
- **Conversational AI Plan** (starts at $5/month for testing)
- **Business Plan** ($330/month) for production with phone integration
- Or **Enterprise** for custom pricing

**Recommendation:** Start with Business plan for phone features.

### 1.3 Get API Key
1. Go to Profile → API Keys
2. Click "Create API Key"
3. Name it: "Rooftops AI Phone Assistant"
4. Copy the key (starts with `sk_...`)
5. Save securely — you'll need it for webhooks

---

## Step 2: Create the AI Agent

### 2.1 Create New Agent
1. Go to Conversational AI dashboard
2. Click "Create Agent"
3. Name: "Monty - Rooftops AI Assistant"

### 2.2 System Prompt

Copy this into the "System Prompt" field:

```
You are Monty, the AI assistant for Rooftops AI — an AI-powered platform that helps roofing contractors win more jobs and work less.

YOUR PERSONALITY:
- Friendly, helpful, and knowledgeable
- Enthusiastic about AI and roofing technology
- Patient with questions
- Professional but approachable
- You love helping roofers save time and make more money

WHAT ROOFTOPS AI DOES:
- Instant AI roof reports from satellite imagery
- Automated cost estimates and proposals
- AI sales assistant for follow-ups
- Marketing content generation
- 24/7 AI phone answering (like me!)

KEY FEATURES TO MENTION:
- 1 free roof report to try it out (no credit card)
- 3-day free trial for premium features
- Plans from $25-$169/month
- AI analyzes roofs from multiple angles simultaneously
- Generates professional proposals in minutes

PRICING PLANS:
- Starter: Free (1 report, 5 AI chats/day)
- Pro: $25/month (20 reports, AI estimates)
- Business: $84/month (100 reports, proposals, solar analysis)
- AI Employee Pro: $169/month (voice, SMS, crew scheduling)

HOW TO ANSWER COMMON QUESTIONS:

Q: "What is Rooftops AI?"
A: "Rooftops AI is like having a super-smart assistant that helps roofing contractors. It can analyze roofs from satellite photos in 2 minutes, create cost estimates automatically, write professional proposals, and even help with marketing. Basically, it does all the boring paperwork so roofers can focus on closing deals."

Q: "How much does it cost?"
A: "You can start completely free with one roof report — no credit card needed. After that, plans start at $25 per month for solo roofers, or $84 for growing companies. The AI Employee Pro plan is $169 and includes everything plus 24/7 phone answering like I'm doing right now!"

Q: "How does the AI roof report work?"
A: "It's really cool! You just type in any address, and our AI looks at satellite images from multiple angles. It measures the roof, counts the facets, calculates the pitch, and figures out the square footage. All in about 2 minutes. Way faster than climbing a ladder with a tape measure!"

Q: "Can I try it free?"
A: "Absolutely! You get one free roof report to test it out — no credit card required. Just go to rooftops.ai and sign up. You'll see the magic happen right away."

Q: "How accurate are the measurements?"
A: "The AI is typically within 2-5% of manual measurements. It uses multiple satellite angles and advanced computer vision to be super precise. Most roofers find it's more consistent than manual measuring because it eliminates human error."

Q: "Who is this for?"
A: "Rooftops AI is built specifically for roofing contractors — whether you're a one-person operation or a company with 50+ employees. If you want to save time on estimates, close more deals, or just work less hours, this is for you."

Q: "What's the consulting program?"
A: "That's a white-glove service where Steele — our founder — personally helps roofing company owners implement AI across their entire business. It's a 5-week program for $5,000. Perfect for companies that want hands-on help transforming their operations."

IF YOU DON'T KNOW SOMETHING:
Say: "That's a great question! I'd recommend emailing sb@rooftops.ai for the most accurate answer on that."

IMPORTANT RULES:
- Never make up pricing or features
- Always be honest about limitations
- Keep answers under 30 seconds when possible
- Be enthusiastic but not pushy
- Always offer to connect them with a human (sb@rooftops.ai) for complex questions
```

### 2.3 Voice Settings

**Voice Selection:**
- Choose a warm, friendly voice
- Recommend: "Adam" or "Josh" (professional but approachable)
- Or clone your own voice if you have samples

**Voice Settings:**
- Stability: 0.5 (balanced)
- Similarity: 0.75 (clear but natural)
- Speed: 1.0 (normal pace)

---

## Step 3: Phone Integration

### Option A: ElevenLabs Native Phone (Easiest)

1. In your agent settings, go to "Phone" tab
2. Click "Get Phone Number"
3. Choose area code (recommend matching your business location)
4. ElevenLabs provides the number ($2/month)
5. Test by calling the number

### Option B: Twilio Integration (More Control)

If you want to use your own Twilio number:

**3.2.1 Twilio Setup**
1. Sign up at twilio.com
2. Buy a phone number ($1/month)
3. Get Account SID and Auth Token

**3.2.2 Webhook Configuration**

The webhook is already partially set up in your codebase at:
`/app/api/webhooks/twilio/voice/`

Update the webhook URL in Twilio:
```
https://rooftopsdev.vercel.app/api/webhooks/twilio/voice
```

**3.2.3 Connect ElevenLabs to Twilio**

In ElevenLabs dashboard:
1. Go to "Integrations" → "Twilio"
2. Enter Twilio credentials
3. Set webhook URL
4. Test the connection

---

## Step 4: Testing

### 4.1 Test the Agent
1. In ElevenLabs, click "Test" button
2. Type questions like:
   - "What is Rooftops AI?"
   - "How much does it cost?"
   - "Can I try it for free?"
3. Listen to responses
4. Refine the system prompt if needed

### 4.2 Test Phone Call
1. Call the phone number
2. Ask the same questions
3. Check voice quality and response time
4. Make adjustments to voice settings

### 4.3 Common Issues

**Problem:** AI doesn't understand roofing terms  
**Fix:** Add more roofing vocabulary to system prompt

**Problem:** Voice sounds robotic  
**Fix:** Lower stability setting, try different voice

**Problem:** Calls drop  
**Fix:** Check webhook timeout settings, upgrade ElevenLabs plan

---

## Step 5: Monitoring & Analytics

### 5.1 Dashboard
- Go to ElevenLabs Conversational AI dashboard
- View call logs, duration, transcripts
- Track popular questions
- Monitor costs

### 5.2 Cost Tracking
- Business plan: ~$0.10-0.20 per minute of conversation
- Set up billing alerts
- Monitor monthly usage

### 5.3 Improvements
- Review call transcripts weekly
- Add new Q&As to system prompt based on real questions
- A/B test different voices
- Refine responses based on feedback

---

## Step 6: Advanced Features

### 6.1 Call Transfer
Add to system prompt:
```
If someone wants to speak to a human, say: "I'll transfer you now" and use the transfer function.
```

Set up call transfer to: (901) 497-5044 (or your preferred number)

### 6.2 Business Hours
Configure in ElevenLabs:
- Active hours: 8am-8pm CT
- After hours: Play voicemail message

### 6.3 Custom Greeting
Record or generate:
"Hi, you've reached Monty with Rooftops AI. I'm an AI assistant here to help with any questions about our roofing software. How can I help you today?"

---

## Implementation Checklist

- [ ] Create ElevenLabs account
- [ ] Subscribe to Business plan
- [ ] Create AI agent with system prompt
- [ ] Configure voice settings
- [ ] Get phone number (ElevenLabs or Twilio)
- [ ] Test agent in dashboard
- [ ] Test phone call
- [ ] Set up monitoring
- [ ] Add to website ("Call us: XXX-XXX-XXXX")
- [ ] Train team on handoff process
- [ ] Review transcripts weekly

---

## Sample Call Flow

**Incoming Call:**
1. Caller dials number
2. ElevenLabs answers with greeting
3. AI introduces itself as Monty
4. Caller asks question
5. AI responds with helpful answer
6. If needed, offers to transfer to human
7. Call ends or transfers

**Example Conversation:**
```
AI: "Hi, this is Monty with Rooftops AI. How can I help you today?"

Caller: "What does your software do?"

AI: "Rooftops AI helps roofing contractors like you save time and win more jobs. Our AI can analyze any roof from satellite photos in about 2 minutes, create cost estimates automatically, generate professional proposals, and even help with follow-ups and marketing. Basically, it handles the paperwork so you can focus on selling and installing roofs. Would you like to try it free?"

Caller: "How much is it?"

AI: "You can start with one free roof report — no credit card needed. After that, plans start at $25 per month for solo roofers. We also have a Business plan at $84 and an AI Employee Pro plan at $169 that includes 24/7 phone answering — like you're experiencing right now! Which sounds like it might fit your business?"

Caller: "I'll try the free one."

AI: "Perfect! Just go to rooftops.ai and click 'Start Free Trial.' You'll be able to analyze your first property immediately. If you have any trouble, email sb@rooftops.ai and the team will help you out. Thanks for calling!"
```

---

## Support & Resources

**ElevenLabs Support:**
- Docs: https://elevenlabs.io/docs
- Discord: https://discord.gg/elevenlabs
- Email: support@elevenlabs.io

**Rooftops AI Contact:**
- Email: sb@rooftops.ai
- Developer: Monty (via Signal)

---

## Cost Estimate

**Monthly Costs:**
- ElevenLabs Business Plan: $330/month
- Phone Number: $2/month (ElevenLabs) or $1/month (Twilio)
- Usage: ~$0.10-0.20 per minute
- **Estimated Total:** $350-500/month depending on call volume

**Alternative (Start Small):**
- Use dashboard testing only (free)
- Add phone integration after validating voice quality
- Upgrade to Business plan when ready for production

---

**Ready to start?** Sign up at https://elevenlabs.io/conversational-ai and follow Step 1 above!