// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { convertLocationChangeEventToText, getApproximateTokenCount, getContext } from "./context";
import { genrePromptConfigs, type GenrePromptConfig } from "./genres";
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

function getPromptConfig(state: State): GenrePromptConfig {
  if (state.genre === "custom") {
    return state.customPrompts;
  }

  return genrePromptConfigs[state.genre];
}

function formatTemplate(template: string, variables: Record<string, string>): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_match, key) => variables[key] ?? "");
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
  return makePrompt(formatTemplate(config.worldPrompt, getTemplateVariables(state)), config.systemPrompt);
}

export function generateProtagonistPrompt(state: State): Prompt {
  const config = getPromptConfig(state);
  return makePrompt(formatTemplate(config.protagonistPrompt, getTemplateVariables(state)), config.systemPrompt);
}

export function generateStartingLocationPrompt(state: State): Prompt {
  const config = getPromptConfig(state);
  return makePrompt(formatTemplate(config.startingLocationPrompt, getTemplateVariables(state)), config.systemPrompt);
}

export function generateStartingCharactersPrompt(state: State): Prompt {
  const config = getPromptConfig(state);
  const location = state.locations[state.protagonist.locationIndex];

  return makePrompt(
    formatTemplate(
      config.startingCharactersPrompt,
      getTemplateVariables(state, {
        locationName: location.name,
        locationDescription: location.description,
      }),
    ),
    config.systemPrompt,
  );
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
    config.systemPrompt,
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

  return makePrompt(userPrompt, config.systemPrompt);
}
