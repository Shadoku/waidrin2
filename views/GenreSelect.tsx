// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { Box, Heading, RadioCards, Text, TextArea } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { useShallow } from "zustand/shallow";
import ImageOption from "@/components/ImageOption";
import WizardStep from "@/components/WizardStep";
import { useStateStore } from "@/lib/state";

export default function GenreSelect({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
  const { genre, customPrompts, setState } = useStateStore(
    useShallow((state) => ({
      genre: state.genre,
      customPrompts: state.customPrompts,
      setState: state.set,
    })),
  );

  const promptFields: Array<{ key: keyof typeof customPrompts; label: string; description?: string }> = [
    { key: "systemPrompt", label: "System prompt" },
    { key: "worldPrompt", label: "World prompt" },
    { key: "protagonistPrompt", label: "Protagonist prompt" },
    { key: "startingLocationPrompt", label: "Starting location prompt" },
    { key: "startingCharactersPrompt", label: "Starting characters prompt" },
    { key: "mainPromptPreamble", label: "Main prompt preamble" },
    { key: "narrationPrompt", label: "Narration prompt" },
    { key: "actionsPrompt", label: "Actions prompt" },
    { key: "checkLocationPrompt", label: "Check location prompt" },
    { key: "newLocationPrompt", label: "New location prompt" },
    { key: "newCharactersPrompt", label: "New characters prompt" },
    { key: "summarizePrompt", label: "Summarize prompt" },
  ];

  return (
    <WizardStep title="Genre" onNext={onNext} onBack={onBack}>
      <RadioCards.Root
        value={genre}
        onValueChange={(value) =>
          setState((state) => {
            state.genre = value as typeof state.genre;
          })
        }
        columns="4"
      >
        <ImageOption title="Fantasy" description="Elves, dwarves, and wizards" image="fantasy" value="fantasy" />
        <ImageOption title="Sci-Fi" description="Spaceships and aliens" image="scifi" value="scifi" />
        <ImageOption title="Reality" description="Dust and grime" image="reality" value="reality" />
        <ImageOption title="Custom" description="Bring your own prompts" image="fantasy" value="custom" />
      </RadioCards.Root>

      {genre === "custom" && (
        <Box mt="6">
          <Heading size="6" color="gold" mb="3">
            Custom genre prompts
          </Heading>
          <Text size="4" color="gray" as="div" mb="4">
            Customize every prompt used by the engine. Use variables like{" "}
            <code>
              {"{{worldName}}"}
            </code>
            , <code>{"{{protagonistName}}"}</code>, <code>{"{{locationName}}"}</code>,{" "}
            <code>{"{{locationTypes}}"}</code>, <code>{"{{actionLine}}"}</code>,{" "}
            <code>{"{{accompanyingCharactersLine}}"}</code>, <code>{"{{sceneContext}}"}</code>, and{" "}
            <code>{"{{sceneText}}"}</code>.
          </Text>

          <Box className="grid gap-4">
            {promptFields.map((field) => (
              <Label.Root key={field.key}>
                <Text size="5" color="cyan">
                  {field.label}
                </Text>
                <TextArea
                  value={customPrompts[field.key]}
                  onChange={(event) =>
                    setState((state) => {
                      state.customPrompts[field.key] = event.target.value;
                    })
                  }
                  className="mt-2 [&_textarea]:text-(length:--font-size-4)"
                  size="3"
                  resize="vertical"
                />
              </Label.Root>
            ))}
          </Box>
        </Box>
      )}
    </WizardStep>
  );
}
