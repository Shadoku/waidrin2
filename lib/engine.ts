// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { current } from "immer";
import { throttle } from "lodash";
import * as z from "zod/v4";
import { getBackend } from "./backend";
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
  type Prompt,
  summarizeScenePrompt,
} from "./prompts";
import * as schemas from "./schemas";
import {
  getState,
  initialState,
  type InventoryChangeEvent,
  type Item,
  type Location,
  type LocationChangeEvent,
  type NarrationEvent,
} from "./state";

// When generating a character, the location isn't determined yet.
const RawCharacter = schemas.Character.omit({ locationIndex: true });

async function getBoolean(prompt: Prompt, onToken?: (token: string, count: number) => void): Promise<boolean> {
  return (await getBackend().getObject(prompt, z.enum(["yes", "no"]), onToken)) === "yes";
}

export async function next(
  action?: string,
  onProgress?: (title: string, message: string, tokenCount: number) => void,
): Promise<void> {
  const backend = getBackend();

  await getState().setAsync(async (state) => {
    const snapshotState = () => {
      const snapshot = schemas.StateBase.parse(current(state));
      state.history.push(snapshot);
    };
    let step: [string, string];

    const onToken = throttle(
      (_token: string, count: number) => {
        if (onProgress) {
          onProgress(step[0], step[1], count);
        }
      },
      state.updateInterval,
      { leading: true, trailing: true },
    );

    const updateState = throttle(
      () => {
        // TODO: Can the call to current() be removed?
        getState().set(current(state));
      },
      state.updateInterval,
      { leading: true, trailing: true },
    );

    const onLocationChange = async (newLocation: Location) => {
      for (const plugin of state.plugins) {
        if (plugin.enabled && plugin.plugin && plugin.plugin.onLocationChange) {
          await plugin.plugin.onLocationChange(newLocation, state);
        }
      }
    };

    const narrate = async (action?: string) => {
      const event: NarrationEvent = {
        type: "narration",
        text: "",
        locationIndex: state.protagonist.locationIndex,
        referencedCharacterIndices: [],
      };

      state.events.push(event);

      step = ["Narrating", ""];
      event.text = await backend.getNarration(narratePrompt(state, action), (token: string, count: number) => {
        event.text += token;
        onToken(token, count);
        updateState();
      });

      const referencedCharacterIndices = new Set<number>();

      // Character names in the text are surrounded with double asterisks
      // in accordance with the prompt instructions.
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
        state.events.filter((event) => event.type === "character_introduction").map((event) => event.characterIndex),
      );

      for (const characterIndex of event.referencedCharacterIndices) {
        if (!introducedCharacterIndices.has(characterIndex)) {
          state.events.push({
            type: "character_introduction",
            characterIndex,
          });
          updateState();
        }
      }
    };

    const applyInventoryChange = async () => {
      const inventorySchema = z.object({
        gained: schemas.Item.array(),
        lost: schemas.Item.array(),
      });

      const result = await backend.getObject(checkInventoryChangePrompt(state), inventorySchema, onToken);
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

      updateState();
    };

    try {
      // Validate state before processing to avoid wasting
      // time and tokens on requests for invalid states.
      schemas.State.parse(state);

      if (state.view === "welcome") {
        snapshotState();
        state.view = "connection";
      } else if (state.view === "connection") {
        snapshotState();
        step = ["Checking connection", "If this takes longer than a few seconds, there is probably something wrong"];
        const testObject = await backend.getObject({ system: "test", user: "test" }, z.literal("waidrin"), onToken);
        if (testObject !== "waidrin") {
          throw new Error("Backend does not support schema constraints");
        }

        state.view = "genre";
      } else if (state.view === "genre") {
        snapshotState();
        state.view = "character";
      } else if (state.view === "character") {
        snapshotState();
        step = ["Generating world", "This typically takes between 10 and 30 seconds"];
        state.world = await backend.getObject(generateWorldPrompt(state), schemas.World, onToken);

        step = ["Generating protagonist", "This typically takes between 10 and 30 seconds"];
        state.protagonist = await backend.getObject(generateProtagonistPrompt(state), RawCharacter, onToken);
        state.protagonist.locationIndex = 0;

        state.view = "scenario";
      } else if (state.view === "scenario") {
        snapshotState();
        step = ["Generating starting location", "This typically takes between 10 and 30 seconds"];
        const location = await backend.getObject(generateStartingLocationPrompt(state), schemas.Location, onToken);

        await onLocationChange(location);

        state.locations = [location];
        const locationIndex = state.locations.length - 1;
        state.protagonist.locationIndex = locationIndex;

        step = ["Generating characters", "This typically takes between 30 seconds and 1 minute"];
        const characters = await backend.getObject(
          generateStartingCharactersPrompt(state),
          RawCharacter.array().length(5),
          onToken,
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
        snapshotState();
        state.actions = [];
        updateState();

        if (action) {
          state.events.push({
            type: "action",
            action,
          });
          updateState();
        }

        await narrate(action);
        await applyInventoryChange();

        step = ["Checking for location change", "This typically takes a few seconds"];
        if (!(await getBoolean(checkIfSameLocationPrompt(state), onToken))) {
          const schema = z.object({
            newLocation: schemas.Location,
            accompanyingCharacters: z.enum(state.characters.map((character) => character.name)).array(),
          });

          step = ["Generating location", "This typically takes between 10 and 30 seconds"];
          const newLocationInfo = await backend.getObject(generateNewLocationPrompt(state), schema, onToken);

          await onLocationChange(newLocationInfo.newLocation);

          state.locations.push(newLocationInfo.newLocation);
          const locationIndex = state.locations.length - 1;
          state.protagonist.locationIndex = locationIndex;

          const accompanyingCharacterIndices = state.characters
            .map((character, index) => (newLocationInfo.accompanyingCharacters.includes(character.name) ? index : -1))
            .filter((index) => index >= 0);

          for (const index of accompanyingCharacterIndices) {
            state.characters[index].locationIndex = locationIndex;
          }

          // Must be called *before* adding the location change event to the state!
          const generateCharactersPrompt = generateNewCharactersPrompt(state, newLocationInfo.accompanyingCharacters);

          const event: LocationChangeEvent = {
            type: "location_change",
            locationIndex,
            presentCharacterIndices: accompanyingCharacterIndices,
          };

          // summarize the previous scene (all events after the last location change)
          step = ["Summarizing scene", "This typically takes between 10 and 30 seconds"];
          event.summary = await backend.getNarration(summarizeScenePrompt(state), (token: string, count: number) => {
            event.summary += token;
            onToken(token, count);
            updateState();
          });

          state.events.push(event);
          updateState();

          step = ["Generating characters", "This typically takes between 30 seconds and 1 minute"];
          const characters = await backend.getObject(generateCharactersPrompt, RawCharacter.array().length(5), onToken);
          state.characters.push(...characters.map((character) => ({ ...character, locationIndex })));

          for (let i = state.characters.length - characters.length; i < state.characters.length; i++) {
            event.presentCharacterIndices.push(i);
          }

          await narrate();
          await applyInventoryChange();
        }

        step = ["Generating actions", "This typically takes a few seconds"];
        state.actions = await backend.getObject(
          generateActionsPrompt(state),
          schemas.Action.array().length(3),
          onToken,
        );
      } else {
        throw new Error(`Invalid value for state.view: ${state.view}`);
      }

      // Validate state before returning to prevent
      // invalid states being committed to the store.
      schemas.State.parse(state);
    } finally {
      // Cancel any pending partial updates to avoid confusing the frontend
      // by a partial update arriving after the function returns.
      onToken.cancel();
      updateState.cancel();
    }
  });
}

export function back(): void {
  getState().set((state) => {
    if (state.view === "welcome") {
      // No previous state exists.
    } else if (state.view === "connection") {
      state.view = "welcome";
    } else if (state.view === "genre") {
      state.view = "connection";
    } else if (state.view === "character") {
      state.view = "genre";
    } else if (state.view === "scenario") {
      state.view = "character";
    } else if (state.view === "chat") {
      // Chat states cannot be unambiguously reversed.
    } else {
      throw new Error(`Invalid value for state.view: ${state.view}`);
    }
  });
}

export function undo(): void {
  getState().set((state) => {
    const previous = state.history.pop();
    if (previous) {
      Object.assign(state, previous);
    }
  });
}

export function regenerate(): void {
  getState().set((state) => {
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
  });
}

export function reset(): void {
  getState().set(initialState);
}

function resetScenarioState(view: "character" | "scenario"): void {
  getState().set((state) => {
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
  });
}

export function newCharacter(): void {
  resetScenarioState("character");
}

export function newScenario(): void {
  resetScenarioState("scenario");
}

export function abort(): void {
  getBackend().abort();
}

export function isAbortError(error: unknown): boolean {
  return getBackend().isAbortError(error);
}
