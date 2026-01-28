// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { Box, Button, Flex, HoverCard, Link, Text, TextArea } from "@radix-ui/themes";
import { useCallback, useMemo, useState } from "react";
import Markdown from "react-markdown";
import { useShallow } from "zustand/shallow";
import { type NarrationEvent, useStateStore } from "@/lib/state";
import CharacterView from "./CharacterView";

export default function NarrationEventView({ event, index }: { event: NarrationEvent; index: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(event.text);

  const { characters, setState } = useStateStore(
    useShallow((state) => ({
      characters: state.characters,
      setState: state.set,
    })),
  );

  const computeReferencedCharacterIndices = useCallback(
    (text: string) => {
      const referenced = new Set<number>();

      for (const match of text.matchAll(/\*\*(.+?)(?:'s?)?\*\*/g)) {
        const name = match[1];

        for (const [characterIndex, character] of characters.entries()) {
          if (character.name === name || character.name.split(" ")[0] === name) {
            referenced.add(characterIndex);
            break;
          }
        }
      }

      return Array.from(referenced);
    },
    [characters],
  );

  // Hack to highlight dialogue in text:
  //
  // 1. Surround quoted portions of text with asterisks, marking them as italics.
  // 2. Use a custom <em> component (see below) to render italics as dialogue
  //    if they start with quotation marks.
  //
  // It would be cleaner to use a dedicated semantic element instead (e.g. <span class="...">),
  // but that requires enabling HTML support in react-markdown, which is a security risk.
  const markdown = event.text.replaceAll(/".*?(?:"|$)/g, "*$&*");

  const NameView = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: The correct type is private in react-markdown.
    (props: any) => {
      const { children } = props;

      if (typeof children === "string") {
        const possessiveSuffix = /'s?$/;
        const name = children.replace(possessiveSuffix, "");

        for (const character of characters) {
          if (character.name === name || character.name.split(" ")[0] === name) {
            return (
              <HoverCard.Root>
                <HoverCard.Trigger>
                  <Link color="blue" href="#" onClick={(event) => event.preventDefault()}>
                    {children}
                  </Link>
                </HoverCard.Trigger>
                <HoverCard.Content maxWidth="40rem">
                  <Box p="2">
                    <CharacterView character={character} />
                  </Box>
                </HoverCard.Content>
              </HoverCard.Root>
            );
          }
        }
      }

      return <strong>{children}</strong>;
    },
    [characters],
  );

  const DialogueView = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: The correct type is private in react-markdown.
    (props: any) => {
      const { children } = props;

      const firstChild = Array.isArray(children) && children.length > 0 ? children[0] : children;

      if (typeof firstChild === "string" && firstChild.startsWith('"')) {
        return <Text color="amber">{children}</Text>;
      } else {
        return <em>{children}</em>;
      }
    },
    [],
  );

  const components = useMemo(
    () => ({
      strong: NameView,
      em: DialogueView,
    }),
    [NameView, DialogueView],
  );

  return (
    <Box className="text-(length:--font-size-5) [&_p]:mb-[0.7em]" width="100%" p="6">
      <Flex direction="column" gap="3">
        {isEditing ? (
          <TextArea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="[&_textarea]:text-(length:--font-size-5)"
            size="3"
            resize="vertical"
            maxLength={5000}
          />
        ) : (
          <Markdown components={components}>{markdown}</Markdown>
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
                    if (target?.type === "narration") {
                      target.text = draft;
                      target.referencedCharacterIndices = computeReferencedCharacterIndices(draft);
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
                  setDraft(event.text);
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
                setDraft(event.text);
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
