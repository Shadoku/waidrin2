// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { DropdownMenu, IconButton, Text } from "@radix-ui/themes";
import { GiElfHelmet } from "react-icons/gi";
import { newCharacter, newScenario, reset } from "@/lib/engine";

export default function MainMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton className="fixed top-3 left-3" variant="ghost" color="gray">
          <GiElfHelmet size="35" />
        </IconButton>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content color="gray">
        <DropdownMenu.Item
          onClick={() => window.open("https://github.com/p-e-w/waidrin/issues", "_blank", "noopener,noreferrer")}
        >
          <Text size="5">Report an issue...</Text>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onClick={newCharacter}>
          <Text size="5">New character (keeps connection settings)</Text>
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={newScenario}>
          <Text size="5">New scenario (keeps connection settings)</Text>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item color="red" onClick={reset}>
          <Text size="5">Reset state (wipes all progress)</Text>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
