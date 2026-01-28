// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { Box, Button, Dialog, Flex, RadioCards, SegmentedControl, Text, TextArea } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { GiFemale, GiMale } from "react-icons/gi";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import ImageOption from "@/components/ImageOption";
import WizardStep from "@/components/WizardStep";
import { getProtagonistPromptText, getSystemPrompt } from "@/lib/prompts";
import { type Gender, type Race, useStateStore } from "@/lib/state";

export default function CharacterSelect({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
  const { gender, race, protagonistGuidance, systemPromptOverride, protagonistPromptOverride, setState, fullState } =
    useStateStore(
      useShallow((state) => ({
        gender: state.protagonist.gender,
        race: state.protagonist.race,
        protagonistGuidance: state.protagonistGuidance,
        systemPromptOverride: state.systemPromptOverride,
        protagonistPromptOverride: state.protagonistPromptOverride,
        setState: state.set,
        fullState: state,
      })),
    );

  const [reviewOpen, setReviewOpen] = useState(false);
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [protagonistPromptDraft, setProtagonistPromptDraft] = useState("");

  const effectiveSystemPrompt = useMemo(() => getSystemPrompt(fullState), [fullState]);
  const effectiveProtagonistPrompt = useMemo(() => getProtagonistPromptText(fullState), [fullState]);

  const openReview = () => {
    setSystemPromptDraft(systemPromptOverride.trim() || effectiveSystemPrompt);
    setProtagonistPromptDraft(protagonistPromptOverride.trim() || effectiveProtagonistPrompt);
    setReviewOpen(true);
  };

  return (
    <WizardStep title="Character" onNext={onNext ? openReview : undefined} onBack={onBack}>
      <SegmentedControl.Root
        value={gender}
        onValueChange={(value: Gender) =>
          setState((state) => {
            state.protagonist.gender = value;
          })
        }
        className="w-full"
        size="3"
        mb="5"
      >
        <SegmentedControl.Item value="male">
          <GiMale className="inline mt-[-7px]" size="25" /> <Text size="6">Male</Text>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="female">
          <GiFemale className="inline mt-[-7px]" size="25" /> <Text size="6">Female</Text>
        </SegmentedControl.Item>
      </SegmentedControl.Root>

      <RadioCards.Root
        value={race}
        onValueChange={(value: Race) =>
          setState((state) => {
            state.protagonist.race = value;
          })
        }
        columns="3"
      >
        <ImageOption title="Human" image={`${gender}-human`} value="human" />
        <ImageOption title="Elf" image={`${gender}-elf`} value="elf" />
        <ImageOption title="Dwarf" image={`${gender}-dwarf`} value="dwarf" />
      </RadioCards.Root>

      <Box mt="6">
        <Label.Root>
          <Text size="5" color="cyan">
            Optional character description
          </Text>
          <TextArea
            value={protagonistGuidance}
            onChange={(event) =>
              setState((state) => {
                state.protagonistGuidance = event.target.value;
              })
            }
            className="mt-2 [&_textarea]:text-(length:--font-size-4)"
            size="3"
            resize="vertical"
            placeholder="Add details, personality traits, or a backstory hook to guide generation..."
          />
        </Label.Root>
      </Box>

      {onNext && (
        <Dialog.Root open={reviewOpen} onOpenChange={setReviewOpen}>
          <Dialog.Content maxWidth="50rem">
            <Dialog.Title className="lowercase" size="7">
              Review character prompts
            </Dialog.Title>
            <Dialog.Description size="4" color="gray" mb="4">
              Review and edit the final prompts before they are sent to the model.
            </Dialog.Description>

            <Flex direction="column" gap="4">
              <Label.Root>
                <Text size="5" color="cyan">
                  System prompt
                </Text>
                <TextArea
                  value={systemPromptDraft}
                  onChange={(event) => setSystemPromptDraft(event.target.value)}
                  className="mt-2 [&_textarea]:text-(length:--font-size-4)"
                  size="3"
                  resize="vertical"
                />
              </Label.Root>
              <Label.Root>
                <Text size="5" color="cyan">
                  Protagonist prompt
                </Text>
                <TextArea
                  value={protagonistPromptDraft}
                  onChange={(event) => setProtagonistPromptDraft(event.target.value)}
                  className="mt-2 [&_textarea]:text-(length:--font-size-4)"
                  size="3"
                  resize="vertical"
                />
              </Label.Root>
            </Flex>

            <Flex justify="end" gap="3" mt="5">
              <Button variant="ghost" color="gray" onClick={() => setReviewOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setState((state) => {
                    state.systemPromptOverride = systemPromptDraft.trim();
                    state.protagonistPromptOverride = protagonistPromptDraft.trim();
                  });
                  setReviewOpen(false);
                  onNext();
                }}
              >
                Continue
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </WizardStep>
  );
}
