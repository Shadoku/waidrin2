// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

export type GenrePromptConfig = {
  systemPrompt: string;
  worldPrompt: string;
  protagonistPrompt: string;
  startingLocationPrompt: string;
  startingCharactersPrompt: string;
  mainPromptPreamble: string;
  narrationPrompt: string;
  actionsPrompt: string;
  checkLocationPrompt: string;
  newLocationPrompt: string;
  newCharactersPrompt: string;
  summarizePrompt: string;
};

export const genrePromptConfigs: Record<"fantasy" | "scifi" | "reality", GenrePromptConfig> = {
  fantasy: {
    systemPrompt: "You are the game master of a text-based fantasy role-playing game.",
    worldPrompt: `
Create a fictional world for a fantasy adventure RPG and return its name
and a short description (100 words maximum) as a JSON object.
Do not use a cliched name like 'Eldoria'.
The world is populated by humans, elves, and dwarves.
`,
    protagonistPrompt: `
Create a {{protagonistGender}} {{protagonistRace}} protagonist
for a fantasy adventure set in the world of {{worldName}}.

{{worldDescription}}

Return the character description as a JSON object. Include a short biography (100 words maximum).
`,
    startingLocationPrompt: `
Create a starting location for a fantasy adventure set in the world of {{worldName}}.

{{worldDescription}}

Return the name and type of the location, and a short description (100 words maximum), as a JSON object.
Choose from the following location types: {{locationTypes}}
`,
    startingCharactersPrompt: `
This is the start of a fantasy adventure set in the world of {{worldName}}. {{worldDescription}}

The protagonist is {{protagonistName}}. {{protagonistBiography}}

{{protagonistName}} is about to enter {{locationName}}. {{locationDescription}}

Create 5 characters that {{protagonistName}} might encounter at {{locationName}}.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
    mainPromptPreamble: `This is a fantasy adventure RPG set in the world of {{worldName}}. {{worldDescription}}

The protagonist (who you should refer to as "you" in your narration, as the adventure happens from their perspective)
is {{protagonistName}}. {{protagonistBiography}}`,
    narrationPrompt: `
{{actionLine}}
Narrate what happens next, using novel-style prose, in the present tense.
Prioritize dialogue over descriptions.
Do not mention more than 2 different characters in your narration.
Refer to characters using their first names.
Make all character names bold by surrounding them with double asterisks (**Name**).
Write 2-3 paragraphs (no more than 200 words in total).
Stop when it is the protagonist's turn to speak or act.
Remember to refer to the protagonist ({{protagonistName}}) as "you" in your narration.
Do not explicitly ask the protagonist for a response at the end; they already know what is expected of them.
`,
    actionsPrompt: `
Suggest 3 options for what the protagonist ({{protagonistName}}) could do or say next.
Each option should be a single, short sentence that starts with a verb.
Return the options as a JSON array of strings.
`,
    checkLocationPrompt: `
Is the protagonist ({{protagonistName}}) still at {{locationName}}?
Answer with "yes" or "no".
`,
    newLocationPrompt: `
The protagonist ({{protagonistName}}) has left {{locationName}}.
Return the name and type of their new location, and a short description (100 words maximum), as a JSON object.
Also include the names of the characters that are going to accompany {{protagonistName}} there, if any.
`,
    newCharactersPrompt: `
The protagonist ({{protagonistName}}) is about to enter {{locationName}}. {{locationDescription}}

{{accompanyingCharactersLine}}

Create 5 additional, new characters that {{protagonistName}} might encounter at {{locationName}}.
Do not reuse characters that have already appeared in the story.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
    summarizePrompt: `
{{mainPromptPreamble}}

You will create a compact memory of the just-completed scene. This memory is used as long-term context for future generations.
Write a 1-2 paragraph scene summary (no more than 300 words in total).
Use proper names and refer to the protagonist as "you".
Capture only plot-relevant facts that will matter later such as:
what {{protagonistName}} does/learns/decides,
changes to location, inventory, injuries, or relationships,
discoveries/clues,
unresolved goals, promises, threats, or deadlines.
Do not quote dialogue, add new facts, or include stylistic prose.
Return only the summary with no preamble, labels, markdown or quotes.

Here's the context for the scene to summarize:

{{sceneContext}}

Here's the scene to summarize:

{{sceneText}}
`,
  },
  scifi: {
    systemPrompt: "You are the game master of a text-based science-fiction role-playing game.",
    worldPrompt: `
Create a science-fiction setting for an adventure RPG and return its name
and a short description (100 words maximum) as a JSON object.
Avoid clichéd names.
The setting can include space travel, advanced technology, and alien cultures.
`,
    protagonistPrompt: `
Create a {{protagonistGender}} {{protagonistRace}} protagonist
for a science-fiction adventure set in the world of {{worldName}}.

{{worldDescription}}

Return the character description as a JSON object. Include a short biography (100 words maximum).
`,
    startingLocationPrompt: `
Create a starting location for a science-fiction adventure set in the world of {{worldName}}.

{{worldDescription}}

Return the name and type of the location, and a short description (100 words maximum), as a JSON object.
Choose from the following location types: {{locationTypes}}
`,
    startingCharactersPrompt: `
This is the start of a science-fiction adventure set in the world of {{worldName}}. {{worldDescription}}

The protagonist is {{protagonistName}}. {{protagonistBiography}}

{{protagonistName}} is about to enter {{locationName}}. {{locationDescription}}

Create 5 characters that {{protagonistName}} might encounter at {{locationName}}.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
    mainPromptPreamble: `This is a science-fiction adventure RPG set in the world of {{worldName}}. {{worldDescription}}

The protagonist (who you should refer to as "you" in your narration, as the adventure happens from their perspective)
is {{protagonistName}}. {{protagonistBiography}}`,
    narrationPrompt: `
{{actionLine}}
Narrate what happens next, using novel-style prose, in the present tense.
Prioritize dialogue over descriptions.
Do not mention more than 2 different characters in your narration.
Refer to characters using their first names.
Make all character names bold by surrounding them with double asterisks (**Name**).
Write 2-3 paragraphs (no more than 200 words in total).
Stop when it is the protagonist's turn to speak or act.
Remember to refer to the protagonist ({{protagonistName}}) as "you" in your narration.
Do not explicitly ask the protagonist for a response at the end; they already know what is expected of them.
`,
    actionsPrompt: `
Suggest 3 options for what the protagonist ({{protagonistName}}) could do or say next.
Each option should be a single, short sentence that starts with a verb.
Return the options as a JSON array of strings.
`,
    checkLocationPrompt: `
Is the protagonist ({{protagonistName}}) still at {{locationName}}?
Answer with "yes" or "no".
`,
    newLocationPrompt: `
The protagonist ({{protagonistName}}) has left {{locationName}}.
Return the name and type of their new location, and a short description (100 words maximum), as a JSON object.
Also include the names of the characters that are going to accompany {{protagonistName}} there, if any.
`,
    newCharactersPrompt: `
The protagonist ({{protagonistName}}) is about to enter {{locationName}}. {{locationDescription}}

{{accompanyingCharactersLine}}

Create 5 additional, new characters that {{protagonistName}} might encounter at {{locationName}}.
Do not reuse characters that have already appeared in the story.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
    summarizePrompt: `
{{mainPromptPreamble}}

You will create a compact memory of the just-completed scene. This memory is used as long-term context for future generations.
Write a 1-2 paragraph scene summary (no more than 300 words in total).
Use proper names and refer to the protagonist as "you".
Capture only plot-relevant facts that will matter later such as:
what {{protagonistName}} does/learns/decides,
changes to location, inventory, injuries, or relationships,
discoveries/clues,
unresolved goals, promises, threats, or deadlines.
Do not quote dialogue, add new facts, or include stylistic prose.
Return only the summary with no preamble, labels, markdown or quotes.

Here's the context for the scene to summarize:

{{sceneContext}}

Here's the scene to summarize:

{{sceneText}}
`,
  },
  reality: {
    systemPrompt: "You are the game master of a text-based contemporary role-playing game grounded in reality.",
    worldPrompt: `
Create a realistic contemporary setting for a narrative adventure and return its name
and a short description (100 words maximum) as a JSON object.
Avoid fantastical elements; keep it grounded in the real world.
`,
    protagonistPrompt: `
Create a {{protagonistGender}} {{protagonistRace}} protagonist
for a contemporary adventure set in the world of {{worldName}}.

{{worldDescription}}

Return the character description as a JSON object. Include a short biography (100 words maximum).
`,
    startingLocationPrompt: `
Create a starting location for a contemporary adventure set in the world of {{worldName}}.

{{worldDescription}}

Return the name and type of the location, and a short description (100 words maximum), as a JSON object.
Choose from the following location types: {{locationTypes}}
`,
    startingCharactersPrompt: `
This is the start of a contemporary adventure set in the world of {{worldName}}. {{worldDescription}}

The protagonist is {{protagonistName}}. {{protagonistBiography}}

{{protagonistName}} is about to enter {{locationName}}. {{locationDescription}}

Create 5 characters that {{protagonistName}} might encounter at {{locationName}}.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
    mainPromptPreamble: `This is a contemporary adventure set in the world of {{worldName}}. {{worldDescription}}

The protagonist (who you should refer to as "you" in your narration, as the adventure happens from their perspective)
is {{protagonistName}}. {{protagonistBiography}}`,
    narrationPrompt: `
{{actionLine}}
Narrate what happens next, using novel-style prose, in the present tense.
Prioritize dialogue over descriptions.
Do not mention more than 2 different characters in your narration.
Refer to characters using their first names.
Make all character names bold by surrounding them with double asterisks (**Name**).
Write 2-3 paragraphs (no more than 200 words in total).
Stop when it is the protagonist's turn to speak or act.
Remember to refer to the protagonist ({{protagonistName}}) as "you" in your narration.
Do not explicitly ask the protagonist for a response at the end; they already know what is expected of them.
`,
    actionsPrompt: `
Suggest 3 options for what the protagonist ({{protagonistName}}) could do or say next.
Each option should be a single, short sentence that starts with a verb.
Return the options as a JSON array of strings.
`,
    checkLocationPrompt: `
Is the protagonist ({{protagonistName}}) still at {{locationName}}?
Answer with "yes" or "no".
`,
    newLocationPrompt: `
The protagonist ({{protagonistName}}) has left {{locationName}}.
Return the name and type of their new location, and a short description (100 words maximum), as a JSON object.
Also include the names of the characters that are going to accompany {{protagonistName}} there, if any.
`,
    newCharactersPrompt: `
The protagonist ({{protagonistName}}) is about to enter {{locationName}}. {{locationDescription}}

{{accompanyingCharactersLine}}

Create 5 additional, new characters that {{protagonistName}} might encounter at {{locationName}}.
Do not reuse characters that have already appeared in the story.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
    summarizePrompt: `
{{mainPromptPreamble}}

You will create a compact memory of the just-completed scene. This memory is used as long-term context for future generations.
Write a 1-2 paragraph scene summary (no more than 300 words in total).
Use proper names and refer to the protagonist as "you".
Capture only plot-relevant facts that will matter later such as:
what {{protagonistName}} does/learns/decides,
changes to location, inventory, injuries, or relationships,
discoveries/clues,
unresolved goals, promises, threats, or deadlines.
Do not quote dialogue, add new facts, or include stylistic prose.
Return only the summary with no preamble, labels, markdown or quotes.

Here's the context for the scene to summarize:

{{sceneContext}}

Here's the scene to summarize:

{{sceneText}}
`,
  },
};

export const defaultCustomPrompts: GenrePromptConfig = {
  systemPrompt: "You are the game master of a text-based role-playing game in a custom genre.",
  worldPrompt: `
Create a compelling setting for a custom-genre adventure and return its name
and a short description (100 words maximum) as a JSON object.
Avoid clichés and give the setting a distinctive tone.
`,
  protagonistPrompt: `
Create a {{protagonistGender}} {{protagonistRace}} protagonist for a custom-genre adventure
set in the world of {{worldName}}.

{{worldDescription}}

Return the character description as a JSON object. Include a short biography (100 words maximum).
`,
  startingLocationPrompt: `
Create a starting location for a custom-genre adventure set in the world of {{worldName}}.

{{worldDescription}}

Return the name and type of the location, and a short description (100 words maximum), as a JSON object.
Choose from the following location types: {{locationTypes}}
`,
  startingCharactersPrompt: `
This is the start of a custom-genre adventure set in the world of {{worldName}}. {{worldDescription}}

The protagonist is {{protagonistName}}. {{protagonistBiography}}

{{protagonistName}} is about to enter {{locationName}}. {{locationDescription}}

Create 5 characters that {{protagonistName}} might encounter at {{locationName}}.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
  mainPromptPreamble: `This is a custom-genre adventure set in the world of {{worldName}}. {{worldDescription}}

The protagonist (who you should refer to as "you" in your narration, as the adventure happens from their perspective)
is {{protagonistName}}. {{protagonistBiography}}`,
  narrationPrompt: `
{{actionLine}}
Narrate what happens next, using novel-style prose, in the present tense.
Prioritize dialogue over descriptions.
Do not mention more than 2 different characters in your narration.
Refer to characters using their first names.
Make all character names bold by surrounding them with double asterisks (**Name**).
Write 2-3 paragraphs (no more than 200 words in total).
Stop when it is the protagonist's turn to speak or act.
Remember to refer to the protagonist ({{protagonistName}}) as "you" in your narration.
Do not explicitly ask the protagonist for a response at the end; they already know what is expected of them.
`,
  actionsPrompt: `
Suggest 3 options for what the protagonist ({{protagonistName}}) could do or say next.
Each option should be a single, short sentence that starts with a verb.
Return the options as a JSON array of strings.
`,
  checkLocationPrompt: `
Is the protagonist ({{protagonistName}}) still at {{locationName}}?
Answer with "yes" or "no".
`,
  newLocationPrompt: `
The protagonist ({{protagonistName}}) has left {{locationName}}.
Return the name and type of their new location, and a short description (100 words maximum), as a JSON object.
Also include the names of the characters that are going to accompany {{protagonistName}} there, if any.
`,
  newCharactersPrompt: `
The protagonist ({{protagonistName}}) is about to enter {{locationName}}. {{locationDescription}}

{{accompanyingCharactersLine}}

Create 5 additional, new characters that {{protagonistName}} might encounter at {{locationName}}.
Do not reuse characters that have already appeared in the story.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
  summarizePrompt: `
{{mainPromptPreamble}}

You will create a compact memory of the just-completed scene. This memory is used as long-term context for future generations.
Write a 1-2 paragraph scene summary (no more than 300 words in total).
Use proper names and refer to the protagonist as "you".
Capture only plot-relevant facts that will matter later such as:
what {{protagonistName}} does/learns/decides,
changes to location, inventory, injuries, or relationships,
discoveries/clues,
unresolved goals, promises, threats, or deadlines.
Do not quote dialogue, add new facts, or include stylistic prose.
Return only the summary with no preamble, labels, markdown or quotes.

Here's the context for the scene to summarize:

{{sceneContext}}

Here's the scene to summarize:

{{sceneText}}
`,
};

export const defaultLlmConfig = {
  apiUrl: "http://localhost:8080/v1/",
  apiKey: "",
  model: "",
  contextLength: 16384,
  inputLength: 16384,
  generationParams: {
    temperature: 0.5,
  },
  narrationParams: {
    temperature: 0.6,
    min_p: 0.03,
    dry_multiplier: 0.8,
  },
  updateInterval: 200,
  logPrompts: false,
  logParams: false,
  logResponses: false,
};
