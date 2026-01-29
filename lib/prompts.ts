// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { convertLocationChangeEventToText, getApproximateTokenCount, getContext } from "./context";
import { genrePromptConfigs, type GenrePromptConfig } from "./llmConfig";
import * as schemas from "./schemas";
import type { LocationChangeEvent, State } from "./state";

export interface Prompt {
  system: string;
  user: string;
}

function normalize(text: string): string {
  // Normalize prompt text by collapsing single newlines.
  // This allows for cleaner-looking strings in code,
  // while still producing regular single-line prompts.
  const singleNewline = /(?<!\n)\n(?!\n)/g;
  return text.replaceAll(singleNewline, " ").trim();
}

function makePrompt(userPrompt: string, systemPrompt: string): Prompt {
  return {
    system: systemPrompt,
    user: normalize(userPrompt),
  };
}

export function generateCustomPromptConfigPrompt(description: string): Prompt {
  const trimmed = description.trim();
  return makePrompt(
    `
You are a prompt engineer for a text-based role-playing game. Create a complete set of prompt templates
for a custom genre described below. Return a JSON object that matches this shape exactly:
{
  "systemPrompt": string,
  "worldPrompt": string,
  "protagonistPrompt": string,
  "startingLocationPrompt": string,
  "startingCharactersPrompt": string,
  "mainPromptPreamble": string,
  "narrationPrompt": string,
  "actionsPrompt": string,
  "checkLocationPrompt": string,
  "newLocationPrompt": string,
  "newCharactersPrompt": string,
  "summarizePrompt": string
}

Guidelines:
- Use plain text with clear instructions suitable for LLM prompting.
- Preserve these template variables where they make sense: {{worldName}}, {{worldDescription}}, {{protagonistName}},
  {{protagonistGender}}, {{protagonistRace}}, {{protagonistBiography}}, {{locationName}}, {{locationDescription}},
  {{locationTypes}}, {{actionLine}}, {{accompanyingCharactersLine}}, {{sceneContext}}, {{sceneText}}.
- Keep prompts concise and focused on the described genre.

Genre description:
${trimmed}
`,
    "You are a meticulous prompt engineer who returns only valid JSON for structured prompt templates.",
  );
}

function getPromptConfig(state: State): GenrePromptConfig {
  if (state.genre === "custom") {
    return state.customPrompts;
  }

  return genrePromptConfigs[state.genre];
}

function formatTemplate(template: string, variables: Record<string, string>): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_match, key) => variables[key] ?? "");
}

export function getSystemPrompt(state: State): string {
  const override = state.systemPromptOverride?.trim();
  if (override) {
    return override;
  }

  return getPromptConfig(state).systemPrompt;
}

function appendGuidance(promptText: string, guidance?: string): string {
  if (!guidance) {
    return promptText;
  }

  const trimmed = guidance.trim();
  if (!trimmed) {
    return promptText;
  }

  return `${promptText}\n\nAdditional guidance: ${trimmed}`;
}

function getTemplateVariables(state: State, extra: Record<string, string> = {}): Record<string, string> {
  const location = state.locations[state.protagonist.locationIndex];

  return {
    worldName: state.world.name,
    worldDescription: state.world.description,
    protagonistName: state.protagonist.name,
    protagonistGender: state.protagonist.gender,
    protagonistRace: state.protagonist.race,
    protagonistBiography: state.protagonist.biography,
    locationName: location?.name ?? "",
    locationDescription: location?.description ?? "",
    locationTypes: Object.values(schemas.LocationType.enum).join(", "),
    ...extra,
  };
}

export function generateWorldPrompt(state: State): Prompt {
  const config = getPromptConfig(state);
  return makePrompt(formatTemplate(config.worldPrompt, getTemplateVariables(state)), getSystemPrompt(state));
}

export function getProtagonistPromptText(state: State): string {
  const override = state.protagonistPromptOverride?.trim();
  if (override) {
    return override;
  }

  const config = getPromptConfig(state);
  return appendGuidance(
    formatTemplate(config.protagonistPrompt, getTemplateVariables(state)),
    state.protagonistGuidance,
  );
}

export function generateProtagonistPrompt(state: State): Prompt {
  return makePrompt(getProtagonistPromptText(state), getSystemPrompt(state));
}

export function getStartingLocationPromptText(state: State): string {
  const override = state.startingLocationPromptOverride?.trim();
  if (override) {
    return override;
  }

  const config = getPromptConfig(state);
  const promptText = formatTemplate(config.startingLocationPrompt, getTemplateVariables(state));
  return state.genre === "custom" ? promptText : appendGuidance(promptText, state.startingLocationGuidance);
}

export function generateStartingLocationPrompt(state: State): Prompt {
  return makePrompt(getStartingLocationPromptText(state), getSystemPrompt(state));
}

export function getStartingCharactersPromptText(state: State): string {
  const override = state.startingCharactersPromptOverride?.trim();
  if (override) {
    return override;
  }

  const config = getPromptConfig(state);
  const location = state.locations[state.protagonist.locationIndex];
  const locationName = location?.name ?? "[location]";
  const locationDescription = location?.description ?? "";

  const promptText = formatTemplate(
    config.startingCharactersPrompt,
    getTemplateVariables(state, {
      locationName,
      locationDescription,
    }),
  );
  return state.genre === "custom" ? promptText : appendGuidance(promptText, state.startingCharactersGuidance);
}

export function generateStartingCharactersPrompt(state: State): Prompt {
  return makePrompt(getStartingCharactersPromptText(state), getSystemPrompt(state));
}

function makeMainPromptPreamble(state: State, config: GenrePromptConfig): string {
  return formatTemplate(config.mainPromptPreamble, getTemplateVariables(state));
}

function makeMainPrompt(prompt: string, state: State, config: GenrePromptConfig): Prompt {
  const promptPreamble = makeMainPromptPreamble(state, config);

  // get the tokens used by the prompt and the preamble
  const normalizedPrompt = normalize(prompt);
  const promptTokens = getApproximateTokenCount(normalizedPrompt);
  const preambleTokens = getApproximateTokenCount(promptPreamble);

  // get the context based on the token budget minus the prompt and preamble tokens
  const contextTokenBudget = state.inputLength - promptTokens - preambleTokens;
  const context = getContext(state, contextTokenBudget);

  return makePrompt(`
${promptPreamble}

Here is what has happened so far:
${context}



${normalizedPrompt}
`,
    getSystemPrompt(state),
  );
}

export function narratePrompt(state: State, action?: string): Prompt {
  const config = getPromptConfig(state);
  const actionLine = action ? `The protagonist (${state.protagonist.name}) has chosen to do the following: ${action}.` : "";
  const promptText = formatTemplate(
    config.narrationPrompt,
    getTemplateVariables(state, {
      actionLine,
    }),
  );
  return makeMainPrompt(promptText, state, config);
}

export function generateActionsPrompt(state: State): Prompt {
  const config = getPromptConfig(state);
  const promptText = formatTemplate(config.actionsPrompt, getTemplateVariables(state));
  return makeMainPrompt(promptText, state, config);
}

export function checkIfSameLocationPrompt(state: State): Prompt {
  const config = getPromptConfig(state);
  const location = state.locations[state.protagonist.locationIndex];
  const promptText = formatTemplate(
    config.checkLocationPrompt,
    getTemplateVariables(state, { locationName: location.name }),
  );
  return makeMainPrompt(promptText, state, config);
}

export function generateNewLocationPrompt(state: State): Prompt {
  const config = getPromptConfig(state);
  const location = state.locations[state.protagonist.locationIndex];
  const promptText = formatTemplate(
    config.newLocationPrompt,
    getTemplateVariables(state, { locationName: location.name }),
  );
  return makeMainPrompt(promptText, state, config);
}

// Must be called *before* adding the location change event to the state!
export function generateNewCharactersPrompt(state: State, accompanyingCharacters: string[]): Prompt {
  const config = getPromptConfig(state);
  const location = state.locations[state.protagonist.locationIndex];
  const accompanyingCharactersLine =
    accompanyingCharacters.length > 0
      ? `${state.protagonist.name} is accompanied by the following characters: ${accompanyingCharacters.join(", ")}.`
      : "";

  const promptText = formatTemplate(
    config.newCharactersPrompt,
    getTemplateVariables(state, {
      locationName: location.name,
      locationDescription: location.description,
      accompanyingCharactersLine,
    }),
  );
  return makeMainPrompt(promptText, state, config);
}

export function summarizeScenePrompt(state: State): Prompt {
  const config = getPromptConfig(state);
  const protagonistName = state.protagonist.name;

  // Find the start of the current scene (most recent location change in state).
  let sceneStartIndex = -1;
  for (let i = state.events.length - 1; i >= 0; i--) {
    if (state.events[i].type === "location_change") {
      sceneStartIndex = i;
      break;
    }
  }

  // Build location + cast context from that location change
  const mostRecentLocationChangeEvent = state.events[sceneStartIndex];
  const sceneContext = convertLocationChangeEventToText(mostRecentLocationChangeEvent as LocationChangeEvent, state);

  // Gather all narration texts from this scene (after the last location change).
  const narrationTexts = state.events
    .slice(sceneStartIndex + 1)
    .map((ev) => (ev.type === "narration" ? ev.text : null))
    .filter((t): t is string => !!t)
    .join("\n\n");

  const mainPromptPreamble = makeMainPromptPreamble(state, config);
  const userPrompt = formatTemplate(
    config.summarizePrompt,
    getTemplateVariables(state, {
      protagonistName,
      sceneContext,
      sceneText: narrationTexts,
      mainPromptPreamble,
    }),
  );

  return makePrompt(userPrompt, getSystemPrompt(state));
}
