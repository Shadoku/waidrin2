// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import type * as schemas from "@/lib/schemas";
import type { State } from "@/lib/state";

export type PromptConfig = schemas.PromptConfig;

export type PendingInput =
  | { type: "apiUrl" }
  | { type: "apiKey" }
  | { type: "model" }
  | { type: "contextLength" }
  | { type: "startingLocationGuidance" }
  | { type: "startingCharactersGuidance" }
  | { type: "customPromptDescription" }
  | { type: "customPromptField"; field: keyof PromptConfig }
  | { type: "protagonistGuidance" }
  | { type: "worldName" }
  | { type: "worldDescription" }
  | { type: "protagonistName" }
  | { type: "protagonistBiography" }
  | { type: "actionCustom" };

export type TelegramSession = {
  state: State;
  pending?: PendingInput;
  connectionStep: number;
  genreStep: number;
  lastAction?: string;
  lastEventIndex: number;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string;
  from: { id: number };
  message?: TelegramMessage;
  data?: string;
};
