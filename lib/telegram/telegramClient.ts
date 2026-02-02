// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export type SendMessageOptions = {
  parse_mode?: "HTML" | "MarkdownV2";
  reply_markup?: InlineKeyboardMarkup;
};

function getBaseUrl(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN env var");
  }

  return `https://api.telegram.org/bot${token}`;
}

async function telegramRequest<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${getBaseUrl()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram API error: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

export async function sendMessage(chatId: number, text: string, options: SendMessageOptions = {}): Promise<void> {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    ...options,
  });
}

export async function answerCallbackQuery(callbackId: string, text?: string): Promise<void> {
  await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackId,
    text,
  });
}
