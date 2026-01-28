// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { Box, Button, Flex, Text, TextField } from "@radix-ui/themes";
import { useState } from "react";
import { useShallow } from "zustand/shallow";
import type { ActionEvent } from "@/lib/state";
import { useStateStore } from "@/lib/state";

export default function ActionEventView({ event, index }: { event: ActionEvent; index: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(event.action);

  const { setState } = useStateStore(
    useShallow((state) => ({
      setState: state.set,
    })),
  );

  return (
    <Box className="bg-(--sky-1)" width="100%" p="6">
      <Flex direction="column" gap="3">
        {isEditing ? (
          <TextField.Root
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="text-(length:--font-size-5)"
            size="3"
            maxLength={200}
          />
        ) : (
          <Text size="6" color="gray">
            {event.action}
          </Text>
        )}

        <Flex justify="end" gap="2">
          {isEditing ? (
            <>
              <Button
                variant="soft"
                onClick={() => {
                  if (!draft.trim()) {
                    return;
                  }
                  setState((state) => {
                    const target = state.events[index];
                    if (target?.type === "action") {
                      target.action = draft;
                    }
                  });
                  setIsEditing(false);
                }}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                color="gray"
                onClick={() => {
                  setDraft(event.action);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              color="gray"
              onClick={() => {
                setDraft(event.action);
                setIsEditing(true);
              }}
            >
              Edit
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
