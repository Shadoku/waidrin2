// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import * as z from "zod/v4";

const Text = z.string().trim().nonempty();

const Name = Text.max(100);

const Description = Text.max(2000);

export const Action = Text.max(200);

const Index = z.int();

const RequestParams = z.record(z.string(), z.unknown());
const PromptText = z.string().trim().min(1).max(10000);

export const View = z.enum(["welcome", "connection", "genre", "character", "scenario", "chat"]);
export const Genre = z.enum(["fantasy", "scifi", "reality", "custom"]);

export const PromptConfig = z.object({
  systemPrompt: PromptText,
  worldPrompt: PromptText,
  protagonistPrompt: PromptText,
  startingLocationPrompt: PromptText,
  startingCharactersPrompt: PromptText,
  mainPromptPreamble: PromptText,
  narrationPrompt: PromptText,
  actionsPrompt: PromptText,
  checkLocationPrompt: PromptText,
  newLocationPrompt: PromptText,
  newCharactersPrompt: PromptText,
  summarizePrompt: PromptText,
});

export const PromptOverrideText = z.string().trim().max(10000);

export const World = z.object({
  name: Name,
  description: Description,
});

export const Gender = z.enum(["male", "female"]);

export const Race = z.enum(["human", "elf", "dwarf"]);

export const Character = z.object({
  name: Name,
  gender: Gender,
  race: Race,
  biography: Description,
  locationIndex: Index,
});

export const LocationType = z.enum(["tavern", "market", "road"]);

export const Location = z.object({
  name: Name,
  type: LocationType,
  description: Description,
});

export const Item = z.object({
  name: Name,
  description: Description,
});

export const SexualContentLevel = z.enum(["regular", "explicit", "actively_explicit"]);

export const ViolentContentLevel = z.enum(["regular", "graphic", "pervasive"]);

export const ActionEvent = z.object({
  type: z.literal("action"),
  action: Action,
});

export const NarrationEvent = z.object({
  type: z.literal("narration"),
  text: Text.max(5000),
  locationIndex: Index,
  referencedCharacterIndices: Index.array(),
});

export const CharacterIntroductionEvent = z.object({
  type: z.literal("character_introduction"),
  characterIndex: Index,
});

export const LocationChangeEvent = z.object({
  type: z.literal("location_change"),
  locationIndex: Index,
  presentCharacterIndices: Index.array(),
  summary: Text.max(5000).optional(),
});

export const InventoryChangeEvent = z.object({
  type: z.literal("inventory_change"),
  gained: Item.array(),
  lost: Item.array(),
});

export const Event = z.discriminatedUnion("type", [
  ActionEvent,
  NarrationEvent,
  CharacterIntroductionEvent,
  LocationChangeEvent,
  InventoryChangeEvent,
]);

export const StateBase = z.object({
  apiUrl: z.url(),
  apiKey: z.string().trim(),
  model: z.string().trim(),
  contextLength: z.int(),
  inputLength: z.int(),
  generationParams: RequestParams,
  narrationParams: RequestParams,
  updateInterval: z.int(),
  logPrompts: z.boolean(),
  logParams: z.boolean(),
  logResponses: z.boolean(),
  genre: Genre,
  view: View,
  customPrompts: PromptConfig,
  protagonistGuidance: z.string().trim().max(500),
  startingLocationGuidance: z.string().trim().max(500),
  startingCharactersGuidance: z.string().trim().max(500),
  systemPromptOverride: PromptOverrideText,
  protagonistPromptOverride: PromptOverrideText,
  startingLocationPromptOverride: PromptOverrideText,
  startingCharactersPromptOverride: PromptOverrideText,
  world: World,
  locations: Location.array(),
  inventory: Item.array(),
  characters: Character.array(),
  protagonist: Character,
  hiddenDestiny: z.boolean(),
  betrayal: z.boolean(),
  oppositeSexMagnet: z.boolean(),
  sameSexMagnet: z.boolean(),
  sexualContentLevel: SexualContentLevel,
  violentContentLevel: ViolentContentLevel,
  events: Event.array(),
  actions: Action.array(),
});

export const State = StateBase.extend({
  history: StateBase.array(),
});
