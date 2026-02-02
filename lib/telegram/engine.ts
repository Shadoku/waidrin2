// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import * as z from "zod/v4";
import {
  checkIfSameLocationPrompt,
  checkInventoryChangePrompt,
  generateActionsPrompt,
  generateNewCharactersPrompt,
  generateNewLocationPrompt,
  generateProtagonistPrompt,
  generateStartingCharactersPrompt,
  generateStartingLocationPrompt,
  generateWorldPrompt,
  narratePrompt,
  summarizeScenePrompt,
} from "@/lib/prompts";
import * as schemas from "@/lib/schemas";
import type {
  InventoryChangeEvent,
  Item,
  Location,
  LocationChangeEvent,
  NarrationEvent,
  State,
} from "@/lib/state";
import { initialState } from "@/lib/state";
import type { TelegramBackend } from "./backend";

const RawCharacter = schemas.Character.omit({ locationIndex: true });

async function getBoolean(backend: TelegramBackend, prompt: { system: string; user: string }): Promise<boolean> {
  return (await backend.getObject(prompt, z.enum(["yes", "no"]))) === "yes";
}

function snapshotState(state: State): void {
  const snapshot = schemas.StateBase.parse(state);
  state.history.push(snapshot);
}

export async function advance(state: State, backend: TelegramBackend, action?: string): Promise<void> {
  const updateState = () => {
    schemas.State.parse(state);
  };

  const narrate = async (actionInput?: string) => {
    const event: NarrationEvent = {
      type: "narration",
      text: "",
      locationIndex: state.protagonist.locationIndex,
      referencedCharacterIndices: [],
    };

    state.events.push(event);

    event.text = await backend.getNarration(narratePrompt(state, actionInput));

    const referencedCharacterIndices = new Set<number>();

    for (const match of event.text.matchAll(/\*\*(.+?)(?:'s?)?\*\*/g)) {
      const name = match[1];

      for (const [index, character] of state.characters.entries()) {
        if (character.name === name || character.name.split(" ")[0] === name) {
          referencedCharacterIndices.add(index);
          break;
        }
      }
    }

    event.referencedCharacterIndices = Array.from(referencedCharacterIndices);

    const introducedCharacterIndices = new Set(
      state.events.filter((entry) => entry.type === "character_introduction").map((entry) => entry.characterIndex),
    );

    for (const characterIndex of event.referencedCharacterIndices) {
      if (!introducedCharacterIndices.has(characterIndex)) {
        state.events.push({
          type: "character_introduction",
          characterIndex,
        });
      }
    }
  };

  const applyInventoryChange = async () => {
    const inventorySchema = z.object({
      gained: schemas.Item.array(),
      lost: schemas.Item.array(),
    });

    const result = await backend.getObject(checkInventoryChangePrompt(state), inventorySchema);
    if (result.gained.length === 0 && result.lost.length === 0) {
      return;
    }

    const event: InventoryChangeEvent = {
      type: "inventory_change",
      gained: result.gained,
      lost: result.lost,
    };
    state.events.push(event);

    const removeNames = new Set(result.lost.map((item) => item.name.toLowerCase()));
    state.inventory = state.inventory.filter((item) => !removeNames.has(item.name.toLowerCase()));
    state.inventory.push(...result.gained);
  };

  try {
    schemas.State.parse(state);

    if (state.view === "welcome") {
      snapshotState(state);
      state.view = "connection";
    } else if (state.view === "connection") {
      snapshotState(state);
      const testObject = await backend.getObject({ system: "test", user: "test" }, z.literal("waidrin"));
      if (testObject !== "waidrin") {
        throw new Error("Backend does not support schema constraints");
      }

      state.view = "genre";
    } else if (state.view === "genre") {
      snapshotState(state);
      state.view = "character";
    } else if (state.view === "character") {
      snapshotState(state);
      state.world = await backend.getObject(generateWorldPrompt(state), schemas.World);

      state.protagonist = await backend.getObject(generateProtagonistPrompt(state), RawCharacter);
      state.protagonist.locationIndex = 0;

      state.view = "scenario";
    } else if (state.view === "scenario") {
      snapshotState(state);
      const location = await backend.getObject(generateStartingLocationPrompt(state), schemas.Location);

      state.locations = [location];
      const locationIndex = state.locations.length - 1;
      state.protagonist.locationIndex = locationIndex;

      const characters = await backend.getObject(
        generateStartingCharactersPrompt(state),
        RawCharacter.array().length(5),
      );
      state.characters = characters.map((character) => ({ ...character, locationIndex }));

      state.events = [
        {
          type: "location_change",
          locationIndex,
          presentCharacterIndices: state.characters.map((_, index) => index),
        },
      ];

      state.view = "chat";
    } else if (state.view === "chat") {
      snapshotState(state);
      state.actions = [];

      if (action) {
        state.events.push({
          type: "action",
          action,
        });
      }

      await narrate(action);
      await applyInventoryChange();

      if (!(await getBoolean(backend, checkIfSameLocationPrompt(state)))) {
        const schema = z.object({
          newLocation: schemas.Location,
          accompanyingCharacters: z.enum(state.characters.map((character) => character.name)).array(),
        });

        const newLocationInfo = await backend.getObject(generateNewLocationPrompt(state), schema);

        state.locations.push(newLocationInfo.newLocation);
        const locationIndex = state.locations.length - 1;
        state.protagonist.locationIndex = locationIndex;

        const accompanyingCharacterIndices = state.characters
          .map((character, index) => (newLocationInfo.accompanyingCharacters.includes(character.name) ? index : -1))
          .filter((index) => index >= 0);

        for (const index of accompanyingCharacterIndices) {
          state.characters[index].locationIndex = locationIndex;
        }

        const generateCharactersPrompt = generateNewCharactersPrompt(state, newLocationInfo.accompanyingCharacters);

        const event: LocationChangeEvent = {
          type: "location_change",
          locationIndex,
          presentCharacterIndices: accompanyingCharacterIndices,
        };

        event.summary = await backend.getNarration(summarizeScenePrompt(state));

        state.events.push(event);

        const characters = await backend.getObject(generateCharactersPrompt, RawCharacter.array().length(5));
        state.characters.push(...characters.map((character) => ({ ...character, locationIndex })));

        for (let i = state.characters.length - characters.length; i < state.characters.length; i++) {
          event.presentCharacterIndices.push(i);
        }

        await narrate();
        await applyInventoryChange();
      }

      state.actions = await backend.getObject(generateActionsPrompt(state), schemas.Action.array().length(3));
    } else {
      throw new Error(`Invalid value for state.view: ${state.view}`);
    }

    updateState();
  } catch (error) {
    throw error;
  }
}

export function undo(state: State): void {
  const previous = state.history.pop();
  if (previous) {
    Object.assign(state, previous);
  }
}

export function regenerate(state: State): void {
  if (state.view !== "chat" || state.history.length === 0) {
    return;
  }

  const previous = state.history[state.history.length - 1];
  if (!previous || previous.view !== "chat") {
    return;
  }

  const preservedHistory = [...state.history];
  Object.assign(state, previous);
  state.history = preservedHistory;
}

function resetScenarioState(state: State, view: "character" | "scenario"): void {
  state.view = view;
  state.world = initialState.world;
  state.locations = [];
  state.inventory = [];
  state.characters = [];
  state.protagonist = initialState.protagonist;
  state.protagonistGuidance = initialState.protagonistGuidance;
  state.startingLocationGuidance = initialState.startingLocationGuidance;
  state.startingCharactersGuidance = initialState.startingCharactersGuidance;
  state.systemPromptOverride = initialState.systemPromptOverride;
  state.protagonistPromptOverride = initialState.protagonistPromptOverride;
  state.startingLocationPromptOverride = initialState.startingLocationPromptOverride;
  state.startingCharactersPromptOverride = initialState.startingCharactersPromptOverride;
  state.hiddenDestiny = initialState.hiddenDestiny;
  state.betrayal = initialState.betrayal;
  state.oppositeSexMagnet = initialState.oppositeSexMagnet;
  state.sameSexMagnet = initialState.sameSexMagnet;
  state.sexualContentLevel = initialState.sexualContentLevel;
  state.violentContentLevel = initialState.violentContentLevel;
  state.events = [];
  state.actions = [];
  state.history = [];
}

export function newCharacter(state: State): void {
  resetScenarioState(state, "character");
}

export function newScenario(state: State): void {
  resetScenarioState(state, "scenario");
}

export function resetState(state: State): void {
  Object.assign(state, structuredClone(initialState));
}

export function describeItemList(items: Item[]): string {
  if (items.length === 0) {
    return "None.";
  }

  return items.map((item) => `• ${item.name}: ${item.description}`).join("\n");
}
