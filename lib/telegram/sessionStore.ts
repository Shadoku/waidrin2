// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { initialState } from "@/lib/state";
import type { TelegramSession } from "./types";

const sessions = new Map<string, TelegramSession>();

function makeSessionKey(chatId: number, userId: number): string {
  return `${chatId}:${userId}`;
}

export function getSession(chatId: number, userId: number): TelegramSession {
  const key = makeSessionKey(chatId, userId);
  const existing = sessions.get(key);
  if (existing) {
    return existing;
  }

  const state = structuredClone(initialState);
  const session: TelegramSession = {
    state,
    connectionStep: 0,
    genreStep: 0,
    lastEventIndex: 0,
  };
  sessions.set(key, session);
  return session;
}

export function resetSession(chatId: number, userId: number): TelegramSession {
  const key = makeSessionKey(chatId, userId);
  sessions.delete(key);
  return getSession(chatId, userId);
}
