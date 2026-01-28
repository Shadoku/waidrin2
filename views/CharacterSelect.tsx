// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { Box, RadioCards, SegmentedControl, Text, TextArea } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { GiFemale, GiMale } from "react-icons/gi";
import { useShallow } from "zustand/shallow";
import ImageOption from "@/components/ImageOption";
import WizardStep from "@/components/WizardStep";
import { type Gender, type Race, useStateStore } from "@/lib/state";

export default function CharacterSelect({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
  const { gender, race, protagonistGuidance, setState } = useStateStore(
    useShallow((state) => ({
      gender: state.protagonist.gender,
      race: state.protagonist.race,
      protagonistGuidance: state.protagonistGuidance,
      setState: state.set,
    })),
  );

  return (
    <WizardStep title="Character" onNext={onNext} onBack={onBack}>
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
    </WizardStep>
  );
}
