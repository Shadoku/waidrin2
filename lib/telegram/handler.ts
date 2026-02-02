// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { convertInventoryChangeEventToText, convertLocationChangeEventToText } from "@/lib/context";
import {
  generateCustomPromptConfigPrompt,
  getProtagonistPromptText,
  getStartingCharactersPromptText,
  getStartingLocationPromptText,
  getSystemPrompt,
} from "@/lib/prompts";
import * as schemas from "@/lib/schemas";
import type { Event, State } from "@/lib/state";
import { defaultCustomPrompts } from "@/lib/llmConfig";
import { advance, newCharacter, newScenario, regenerate, undo } from "./engine";
import { TelegramBackend } from "./backend";
import { getSession, resetSession } from "./sessionStore";
import { answerCallbackQuery, sendMessage, type InlineKeyboardMarkup } from "./telegramClient";
import type { PendingInput, PromptConfig, TelegramSession, TelegramUpdate } from "./types";

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function formatNarration(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replaceAll(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

function formatPromptReview(title: string, promptText: string): string {
  return `<b>${escapeHtml(title)}</b>\n\n<pre>${escapeHtml(promptText)}</pre>`;
}

function getBackendFromState(state: State): TelegramBackend {
  return new TelegramBackend({
    apiUrl: state.apiUrl,
    apiKey: state.apiKey,
    model: state.model,
    generationParams: state.generationParams,
    narrationParams: state.narrationParams,
  });
}

function makeKeyboard(rows: string[][]): InlineKeyboardMarkup {
  return {
    inline_keyboard: rows.map((row) => row.map((value) => ({ text: value, callback_data: value }))),
  };
}

async function sendWelcome(session: TelegramSession, chatId: number): Promise<void> {
  const text = [
    "Welcome to Waidrin.",
    "",
    "Waidrin is a work in progress and stores state locally in this bot session.",
    "If you clear the session or restart the bot, progress resets.",
  ].join("\n");

  await sendMessage(chatId, text, {
    reply_markup: makeKeyboard([["Continue"]]),
  });
}

async function sendConnectionStep(session: TelegramSession, chatId: number): Promise<void> {
  const prompts = [
    "Send the API base URL (e.g. http://localhost:8080/v1/).",
    "Send the API key (or type 'skip' if not required).",
    "Send the model name (or type 'skip' to leave empty).",
    "Send the context length (e.g. 16384).",
  ];

  await sendMessage(chatId, prompts[session.connectionStep] || "Connection setup complete.", {
    reply_markup: makeKeyboard([["Skip"]]),
  });
}

async function advanceConnectionStep(session: TelegramSession, chatId: number): Promise<void> {
  const order = ["apiUrl", "apiKey", "model", "contextLength"] as const;
  if (session.connectionStep >= order.length) {
    await sendMessage(chatId, "Connection setup complete.", {
      reply_markup: makeKeyboard([["Continue"]]),
    });
    return;
  }

  session.pending = { type: order[session.connectionStep] };
  await sendConnectionStep(session, chatId);
}

async function sendGenreSelection(chatId: number): Promise<void> {
  await sendMessage(chatId, "Choose a genre:", {
    reply_markup: makeKeyboard([["Fantasy", "Sci-Fi"], ["Reality", "Custom"]]),
  });
}

async function sendCharacterSelection(chatId: number, session: TelegramSession): Promise<void> {
  await sendMessage(chatId, "Choose protagonist gender:", {
    reply_markup: makeKeyboard([["Male", "Female"]]),
  });

  await sendMessage(chatId, "Choose protagonist race:", {
    reply_markup: makeKeyboard([["Human", "Elf", "Dwarf"]]),
  });

  await sendMessage(chatId, "Add optional character guidance or type 'skip'.", {
    reply_markup: makeKeyboard([["Skip"]]),
  });

  session.pending = { type: "protagonistGuidance" };
}

async function sendScenarioSetup(chatId: number, session: TelegramSession): Promise<void> {
  await sendMessage(chatId, "Set the world name:", {
    reply_markup: makeKeyboard([["Skip"]]),
  });
  session.pending = { type: "worldName" };
}

async function sendScenarioOptions(chatId: number, session: TelegramSession): Promise<void> {
  const tropes = [
    `Hidden destiny: ${session.state.hiddenDestiny ? "On" : "Off"}`,
    `Betrayal: ${session.state.betrayal ? "On" : "Off"}`,
    `Opposite-sex magnet: ${session.state.oppositeSexMagnet ? "On" : "Off"}`,
    `Same-sex magnet: ${session.state.sameSexMagnet ? "On" : "Off"}`,
  ].join("\n");

  await sendMessage(chatId, `Toggle tropes or continue:\n${tropes}`, {
    reply_markup: makeKeyboard([
      ["Toggle hidden destiny", "Toggle betrayal"],
      ["Toggle opposite magnet", "Toggle same magnet"],
      ["Continue"],
    ]),
  });

  await sendMessage(chatId, "Select sexual content level:", {
    reply_markup: makeKeyboard([["Sexual regular", "Sexual explicit"], ["Sexual actively explicit"]]),
  });

  await sendMessage(chatId, "Select violent content level:", {
    reply_markup: makeKeyboard([["Violence regular", "Violence graphic"], ["Violence pervasive"]]),
  });
}

async function sendChatActions(chatId: number, session: TelegramSession): Promise<void> {
  const actions = session.state.actions;
  if (actions.length === 0) {
    return;
  }

  const actionRows = actions.map((action, index) => [{ label: action, data: `action:${index}` }]);
  const utilityRow = [
    { label: "Custom action", data: "Custom action" },
    { label: "Undo", data: "Undo" },
    { label: "Regenerate", data: "Regenerate" },
  ];
  const menuRow = [{ label: "Menu", data: "Menu" }];
  await sendMessage(chatId, "What do you do next?", {
    reply_markup: {
      inline_keyboard: [...actionRows, utilityRow, menuRow].map((row) =>
        row.map((item) => ({ text: item.label, callback_data: item.data })),
      ),
    },
  });
}

async function sendChatEvents(chatId: number, session: TelegramSession): Promise<void> {
  const newEvents = session.state.events.slice(session.lastEventIndex);
  session.lastEventIndex = session.state.events.length;

  for (const event of newEvents) {
    if (event.type === "narration") {
      await sendMessage(chatId, formatNarration(event.text), { parse_mode: "HTML" });
    } else if (event.type === "location_change") {
      await sendMessage(chatId, convertLocationChangeEventToText(event, session.state));
    } else if (event.type === "inventory_change") {
      await sendMessage(chatId, convertInventoryChangeEventToText(event));
    } else if (event.type === "character_introduction") {
      const character = session.state.characters[event.characterIndex];
      if (character) {
        await sendMessage(
          chatId,
          `<b>New character:</b> ${escapeHtml(character.name)}\n${escapeHtml(character.biography)}`,
          { parse_mode: "HTML" },
        );
      }
    }
  }
}

async function sendPromptReview(chatId: number, session: TelegramSession, kind: "genre" | "character"): Promise<void> {
  if (kind === "genre") {
    await sendMessage(chatId, formatPromptReview("System prompt", getSystemPrompt(session.state)), {
      parse_mode: "HTML",
    });
    await sendMessage(chatId, formatPromptReview("Starting location prompt", getStartingLocationPromptText(session.state)), {
      parse_mode: "HTML",
    });
    await sendMessage(
      chatId,
      formatPromptReview("Starting characters prompt", getStartingCharactersPromptText(session.state)),
      { parse_mode: "HTML" },
    );
  } else {
    await sendMessage(chatId, formatPromptReview("System prompt", getSystemPrompt(session.state)), {
      parse_mode: "HTML",
    });
    await sendMessage(chatId, formatPromptReview("Protagonist prompt", getProtagonistPromptText(session.state)), {
      parse_mode: "HTML",
    });
  }

  await sendMessage(chatId, "Edit a prompt or continue:", {
    reply_markup: makeKeyboard(
      kind === "genre"
        ? [["Edit system", "Edit starting location"], ["Edit starting characters", "Continue"]]
        : [["Edit system", "Edit protagonist"], ["Continue"]],
    ),
  });
}

function mapEditChoiceToField(choice: string, kind: "genre" | "character"): keyof PromptConfig | null {
  if (choice === "Edit system") {
    return "systemPrompt";
  }

  if (kind === "genre") {
    if (choice === "Edit starting location") {
      return "startingLocationPrompt";
    }
    if (choice === "Edit starting characters") {
      return "startingCharactersPrompt";
    }
  }

  if (kind === "character" && choice === "Edit protagonist") {
    return "protagonistPrompt";
  }

  return null;
}

async function handlePromptEdit(chatId: number, session: TelegramSession, field: keyof PromptConfig): Promise<void> {
  await sendMessage(chatId, `Send the new text for ${field}.`, {
    reply_markup: makeKeyboard([["Skip"]]),
  });
  session.pending = { type: "customPromptField", field };
}

async function handleMenu(chatId: number, session: TelegramSession): Promise<void> {
  await sendMessage(chatId, "Menu:", {
    reply_markup: makeKeyboard([
      ["Player", "Party"],
      ["Location", "Inventory"],
      ["Options", "Close"],
    ]),
  });
}

async function sendMenuDetail(chatId: number, session: TelegramSession, choice: string): Promise<void> {
  if (choice === "Player") {
    const protagonist = session.state.protagonist;
    await sendMessage(
      chatId,
      `<b>${escapeHtml(protagonist.name)}</b>\n${escapeHtml(protagonist.biography)}`,
      { parse_mode: "HTML" },
    );
  } else if (choice === "Party") {
    const latestLocationChange = [...session.state.events].reverse().find((event) => event.type === "location_change");
    const partyMemberIndices =
      latestLocationChange && latestLocationChange.type === "location_change"
        ? latestLocationChange.presentCharacterIndices
        : [];
    const partyMembers = partyMemberIndices.map((index) => session.state.characters[index]).filter(Boolean);
    const text = partyMembers.length
      ? partyMembers.map((member) => `${member.name}: ${member.biography}`).join("\n\n")
      : "No party members yet.";
    await sendMessage(chatId, escapeHtml(text), { parse_mode: "HTML" });
  } else if (choice === "Location") {
    const location = session.state.locations[session.state.protagonist.locationIndex];
    if (!location) {
      await sendMessage(chatId, "No location yet.");
      return;
    }
    await sendMessage(
      chatId,
      `<b>${escapeHtml(location.name)}</b>\n${escapeHtml(location.type)}\n${escapeHtml(location.description)}`,
      { parse_mode: "HTML" },
    );
  } else if (choice === "Inventory") {
    const items = session.state.inventory;
    const text = items.length
      ? items.map((item) => `${item.name}: ${item.description}`).join("\n\n")
      : "Inventory is empty.";
    await sendMessage(chatId, escapeHtml(text), { parse_mode: "HTML" });
  } else if (choice === "Options") {
    await sendMessage(chatId, "Session options:", {
      reply_markup: makeKeyboard([["New character", "New scenario"], ["Reset session", "Close"]]),
    });
  }
}

async function handleOptions(chatId: number, userId: number, session: TelegramSession, choice: string): Promise<void> {
  if (choice === "New character") {
    newCharacter(session.state);
    session.connectionStep = 0;
    session.genreStep = 0;
    session.pending = undefined;
    session.lastEventIndex = 0;
    await sendMessage(chatId, "Starting a new character.");
    await sendCharacterSelection(chatId, session);
  } else if (choice === "New scenario") {
    newScenario(session.state);
    session.connectionStep = 0;
    session.genreStep = 0;
    session.pending = undefined;
    session.lastEventIndex = 0;
    await sendMessage(chatId, "Starting a new scenario.");
    await sendScenarioSetup(chatId, session);
  } else if (choice === "Reset session") {
    const freshSession = resetSession(chatId, userId);
    await sendMessage(chatId, "Session reset.");
    await sendWelcome(freshSession, chatId);
  }
}

async function applyPendingInput(
  chatId: number,
  session: TelegramSession,
  text: string,
): Promise<PendingInput["type"] | null> {
  const trimmed = text.trim();
  const skip = trimmed.toLowerCase() === "skip";
  const pending = session.pending;
  if (!pending) {
    return null;
  }

  if (pending.type === "apiUrl" && !skip) {
    session.state.apiUrl = trimmed;
  }
  if (pending.type === "apiKey" && !skip) {
    session.state.apiKey = trimmed;
  }
  if (pending.type === "model" && !skip) {
    session.state.model = trimmed;
  }
  if (pending.type === "contextLength") {
    const length = Number(trimmed);
    if (!Number.isNaN(length)) {
      session.state.contextLength = length;
      session.state.inputLength = Math.min(length, 250000);
    }
  }
  if (pending.type === "startingLocationGuidance" && !skip) {
    session.state.startingLocationGuidance = trimmed;
  }
  if (pending.type === "startingCharactersGuidance" && !skip) {
    session.state.startingCharactersGuidance = trimmed;
  }
  if (pending.type === "customPromptDescription" && !skip) {
    if (!session.state.model.trim()) {
      await sendMessage(chatId, "Set a model in connection setup before generating prompts.");
    } else {
      const backend = getBackendFromState(session.state);
      const prompt = generateCustomPromptConfigPrompt(trimmed);
      const response = await backend.getNarration(prompt);
      let parsed: unknown = response;
      try {
        parsed = JSON.parse(response);
      } catch {
        const start = response.indexOf("{");
        const end = response.lastIndexOf("}");
        if (start >= 0 && end > start) {
          parsed = JSON.parse(response.slice(start, end + 1));
        }
      }
      const generated = schemas.PromptConfig.parse(parsed);
      session.state.customPrompts = generated;
    }
  }
  if (pending.type === "customPromptField") {
    if (!skip) {
      if (pending.field === "systemPrompt") {
        session.state.systemPromptOverride = trimmed;
      } else if (pending.field === "protagonistPrompt") {
        session.state.protagonistPromptOverride = trimmed;
      } else if (pending.field === "startingLocationPrompt") {
        session.state.startingLocationPromptOverride = trimmed;
      } else if (pending.field === "startingCharactersPrompt") {
        session.state.startingCharactersPromptOverride = trimmed;
      } else {
        session.state.customPrompts[pending.field] = trimmed;
      }
    }
  }
  if (pending.type === "protagonistGuidance" && !skip) {
    session.state.protagonistGuidance = trimmed;
  }
  if (pending.type === "worldName" && !skip) {
    session.state.world.name = trimmed;
  }
  if (pending.type === "worldDescription" && !skip) {
    session.state.world.description = trimmed;
  }
  if (pending.type === "protagonistName" && !skip) {
    session.state.protagonist.name = trimmed;
  }
  if (pending.type === "protagonistBiography" && !skip) {
    session.state.protagonist.biography = trimmed;
  }
  if (pending.type === "actionCustom" && !skip) {
    session.lastAction = trimmed;
    await advance(session.state, getBackendFromState(session.state), trimmed);
    await sendChatEvents(chatId, session);
    await sendChatActions(chatId, session);
  }

  session.pending = undefined;
  return pending.type;
}

async function handleMessage(chatId: number, userId: number, text: string): Promise<void> {
  if (text.trim().startsWith("/start")) {
    const session = resetSession(chatId, userId);
    await sendWelcome(session, chatId);
    return;
  }

  const session = getSession(chatId, userId);

  if (session.pending) {
    const pendingType = await applyPendingInput(chatId, session, text);
    await handlePostInput(chatId, session, pendingType);
    return;
  }

  if (session.state.view === "chat") {
    session.lastAction = text.trim();
    await advance(session.state, getBackendFromState(session.state), session.lastAction);
    await sendChatEvents(chatId, session);
    await sendChatActions(chatId, session);
    return;
  }

  await sendMessage(chatId, "Use the buttons to navigate setup.");
}

async function handleCallback(chatId: number, userId: number, callbackId: string, data: string): Promise<void> {
  const session = getSession(chatId, userId);

  if (data === "Continue") {
    if (session.state.view === "welcome") {
      session.state.view = "connection";
      session.connectionStep = 0;
      await advanceConnectionStep(session, chatId);
    } else if (session.state.view === "connection") {
      const backend = getBackendFromState(session.state);
      await advance(session.state, backend);
      await sendGenreSelection(chatId);
    } else if (session.state.view === "genre") {
      await advance(session.state, getBackendFromState(session.state));
      await sendCharacterSelection(chatId, session);
    } else if (session.state.view === "character") {
      await advance(session.state, getBackendFromState(session.state));
      await sendScenarioSetup(chatId, session);
    } else if (session.state.view === "scenario") {
      await advance(session.state, getBackendFromState(session.state));
      await sendChatEvents(chatId, session);
      await sendChatActions(chatId, session);
    }
  } else if (data === "Skip") {
    if (session.pending) {
      const pendingType = await applyPendingInput(chatId, session, "skip");
      await handlePostInput(chatId, session, pendingType);
    }
  } else if (["Fantasy", "Sci-Fi", "Reality", "Custom"].includes(data)) {
    session.state.genre = data.toLowerCase().replace("-", "") as State["genre"];
    session.genreStep = 0;
    if (session.state.genre === "custom") {
      session.state.customPrompts = structuredClone(defaultCustomPrompts);
      session.pending = { type: "customPromptDescription" };
      await sendMessage(chatId, "Describe the custom genre prompts or type 'skip'.", {
        reply_markup: makeKeyboard([["Skip"]]),
      });
    } else {
      session.pending = { type: "startingLocationGuidance" };
      await sendMessage(chatId, "Add optional starting location guidance or type 'skip'.", {
        reply_markup: makeKeyboard([["Skip"]]),
      });
    }
  } else if (["Male", "Female"].includes(data)) {
    session.state.protagonist.gender = data.toLowerCase() as State["protagonist"]["gender"];
  } else if (["Human", "Elf", "Dwarf"].includes(data)) {
    session.state.protagonist.race = data.toLowerCase() as State["protagonist"]["race"];
  } else if (data.startsWith("Edit")) {
    const kind = session.state.view === "character" ? "character" : "genre";
    const field = mapEditChoiceToField(data, kind);
    if (field) {
      await handlePromptEdit(chatId, session, field);
    }
  } else if (data.startsWith("action:")) {
    const index = Number(data.split(":")[1]);
    const action = session.state.actions[index];
    if (action) {
      session.lastAction = action;
      await advance(session.state, getBackendFromState(session.state), action);
      await sendChatEvents(chatId, session);
      await sendChatActions(chatId, session);
    }
  } else if (data === "Custom action") {
    session.pending = { type: "actionCustom" };
    await sendMessage(chatId, "Send your custom action.");
  } else if (data === "Undo") {
    undo(session.state);
    await sendMessage(chatId, "Undid the last step.");
    await sendChatActions(chatId, session);
  } else if (data === "Regenerate") {
    regenerate(session.state);
    if (session.lastAction) {
      await advance(session.state, getBackendFromState(session.state), session.lastAction);
      await sendChatEvents(chatId, session);
      await sendChatActions(chatId, session);
    }
  } else if (data === "Menu") {
    await handleMenu(chatId, session);
  } else if (["Player", "Party", "Location", "Inventory", "Options"].includes(data)) {
    await sendMenuDetail(chatId, session, data);
  } else if (["New character", "New scenario", "Reset session"].includes(data)) {
    await handleOptions(chatId, userId, session, data);
  } else if (data === "Toggle hidden destiny") {
    session.state.hiddenDestiny = !session.state.hiddenDestiny;
    await sendScenarioOptions(chatId, session);
  } else if (data === "Toggle betrayal") {
    session.state.betrayal = !session.state.betrayal;
    await sendScenarioOptions(chatId, session);
  } else if (data === "Toggle opposite magnet") {
    session.state.oppositeSexMagnet = !session.state.oppositeSexMagnet;
    await sendScenarioOptions(chatId, session);
  } else if (data === "Toggle same magnet") {
    session.state.sameSexMagnet = !session.state.sameSexMagnet;
    await sendScenarioOptions(chatId, session);
  } else if (data.startsWith("Sexual")) {
    if (data === "Sexual actively explicit") {
      session.state.sexualContentLevel = "actively_explicit";
    } else if (data === "Sexual explicit") {
      session.state.sexualContentLevel = "explicit";
    } else {
      session.state.sexualContentLevel = "regular";
    }
    await sendScenarioOptions(chatId, session);
  } else if (data.startsWith("Violence")) {
    const level = data.split(" ")[1] ?? "regular";
    session.state.violentContentLevel = level as State["violentContentLevel"];
    await sendScenarioOptions(chatId, session);
  } else if (data === "Close") {
    await sendMessage(chatId, "Closing menu.");
  }

  await answerCallbackQuery(callbackId);
}

async function handlePostInput(
  chatId: number,
  session: TelegramSession,
  previousPendingType: PendingInput["type"] | null,
): Promise<void> {
  if (session.state.view === "connection") {
    session.connectionStep += 1;
    await advanceConnectionStep(session, chatId);
    return;
  }

  if (session.state.view === "genre") {
    if (session.state.genre !== "custom") {
      if (session.genreStep === 0) {
        session.genreStep = 1;
        session.pending = { type: "startingCharactersGuidance" };
        await sendMessage(chatId, "Add optional starting characters guidance or type 'skip'.", {
          reply_markup: makeKeyboard([["Skip"]]),
        });
        return;
      }
    }

    await sendPromptReview(chatId, session, "genre");
    return;
  }

  if (session.state.view === "character") {
    await sendPromptReview(chatId, session, "character");
    return;
  }

  if (session.state.view === "scenario") {
    if (previousPendingType === "worldName") {
      session.pending = { type: "worldDescription" };
      await sendMessage(chatId, "Set the world description:", {
        reply_markup: makeKeyboard([["Skip"]]),
      });
      return;
    }
    if (previousPendingType === "worldDescription") {
      session.pending = { type: "protagonistName" };
      await sendMessage(chatId, "Set the protagonist name:", {
        reply_markup: makeKeyboard([["Skip"]]),
      });
      return;
    }
    if (previousPendingType === "protagonistName") {
      session.pending = { type: "protagonistBiography" };
      await sendMessage(chatId, "Set the protagonist biography:", {
        reply_markup: makeKeyboard([["Skip"]]),
      });
      return;
    }

    await sendScenarioOptions(chatId, session);
  }
}

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.message?.text && update.message.from) {
    await handleMessage(update.message.chat.id, update.message.from.id, update.message.text);
  }

  if (update.callback_query?.data && update.callback_query.message) {
    await handleCallback(
      update.callback_query.message.chat.id,
      update.callback_query.from.id,
      update.callback_query.id,
      update.callback_query.data,
    );
  }
}
