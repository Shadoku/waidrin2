# Waidrin Telegram Bot

This folder contains the Telegram bot runtime for Waidrin. The bot is intentionally
lightweight and serves as the chat-first entry point for players who prefer
Telegram over the full web UI.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and grab the token.
2. Provide the required environment variables:

```
TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
WAIDRIN_WEB_URL=https://your-deployment.example.com/telegram
```

`WAIDRIN_WEB_URL` is optional and defaults to `https://waidrin.example.com/telegram`.

## Run locally

From the repo root:

```
node telegram-bot/bot.js
```

## What it does

- `/start` shows the main inline menu.
- Buttons guide users into genres, character setup, and quick start prompts.
- Free-form text is accepted and treated as a scenario prompt.

Wire the replies into the engine once the Telegram integration is ready.
