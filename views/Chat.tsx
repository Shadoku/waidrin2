// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { Box, Button, Flex, ScrollArea, SegmentedControl, Text } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import ActionChoice from "@/components/ActionChoice";
import ErrorBar from "@/components/ErrorBar";
import EventView from "@/components/EventView";
import ProcessingBar from "@/components/ProcessingBar";
import CharacterView from "@/components/CharacterView";
import { abort, isAbortError, next, regenerate, undo } from "@/lib/engine";
import { useStateStore } from "@/lib/state";

type InfoPane = "player" | "party" | "location" | "inventory" | "options";

export default function Chat() {
  const [lastAction, setLastAction] = useState<string | undefined>(undefined);
  const [barVisible, setBarVisible] = useState(false);
  const [barTitle, setBarTitle] = useState("");
  const [barTokenCount, setBarTokenCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [activePane, setActivePane] = useState<InfoPane | null>(null);
  const [settingsSection, setSettingsSection] = useState<"sexual" | "violence">("sexual");

  const doAction = async (action?: string) => {
    try {
      await next(action, (title, _message, tokenCount) => {
        setBarVisible(true);
        setBarTitle(title);
        setBarTokenCount(tokenCount);
      });
    } catch (error) {
      if (!isAbortError(error)) {
        let message = error instanceof Error ? error.message : String(error);
        if (!message) {
          message = "Unknown error";
        }
        setErrorMessage(message);
      }
    } finally {
      setBarVisible(false);
    }
  };

  const { events, actions, history, protagonist, characters, locations, inventory, genre, sexualContentLevel, violentContentLevel } =
    useStateStore(
    useShallow((state) => ({
      events: state.events,
      actions: state.actions,
      history: state.history,
      protagonist: state.protagonist,
      characters: state.characters,
      locations: state.locations,
      inventory: state.inventory,
      genre: state.genre,
      sexualContentLevel: state.sexualContentLevel,
      violentContentLevel: state.violentContentLevel,
    })),
  );

  const eventsContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the bottom of the events container when new content is added.
  //
  // biome-ignore lint/correctness/useExhaustiveDependencies: The dependency is indirect.
  useEffect(() => {
    const eventsContainer = eventsContainerRef.current;
    if (eventsContainer) {
      eventsContainer.scroll({
        top: eventsContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [events]);

  // Forward the state machine once after transitioning to the chat view
  // to generate initial narration and actions.
  //
  // biome-ignore lint/correctness/useExhaustiveDependencies: This should run only once.
  useEffect(() => {
    if (actions.length === 0) {
      doAction();

      // Note that in Strict Mode (used during development), React runs the effect twice
      // *even with an empty dependency array*, so the cleanup function is important here
      // (see https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development).
      return () => abort();
    }
  }, []);

  useEffect(() => {
    const lastActionEvent = [...events].reverse().find((event) => event.type === "action");
    setLastAction(lastActionEvent ? lastActionEvent.action : undefined);
  }, [events]);

  const canUndo = history.length > 0 && history[history.length - 1].view === "chat";
  const canRegenerate = canUndo;

  const currentLocation = locations[protagonist.locationIndex];
  const partyMembers = characters.filter((character) => character.locationIndex === protagonist.locationIndex);

  return (
    <Flex width="100%" justify="center">
      <Flex className="w-full max-w-[90rem]" gap="6">
        <Flex
          className="bg-black border-l border-r border-(--gold-10) shadow-[0_0_30px_var(--slate-10)] flex-1 min-w-0 max-w-[60rem]"
          direction="column"
          height="100vh"
        >
          <ScrollArea ref={eventsContainerRef} className="flex-1">
            <Flex direction="column">
              {events.map((event, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Events are append-only, so this is valid.
                <EventView key={index} event={event} index={index} />
              ))}
            </Flex>
          </ScrollArea>

          {actions.length > 0 && !errorMessage && (
            <ActionChoice
              onAction={(action) => {
                setLastAction(action);
                doAction(action);
              }}
              onUndo={() => {
                undo();
              }}
              onRegenerate={() => {
                regenerate();
                doAction(lastAction);
              }}
              canUndo={canUndo}
              canRegenerate={canRegenerate}
            />
          )}

          {barVisible && (
            <ProcessingBar title={barTitle} onCancel={abort}>
              <Text className="tabular-nums" as="div" align="right" size="4" color="lime" mr="2">
                {barTokenCount ? `Tokens generated: ${barTokenCount}` : "Waiting for response..."}
              </Text>
            </ProcessingBar>
          )}

          {errorMessage && (
            <ErrorBar
              errorMessage={errorMessage}
              onRetry={() => {
                setErrorMessage("");
                doAction(lastAction);
              }}
              onCancel={() => setErrorMessage("")}
            />
          )}

          <Flex
            className="border-t border-(--gold-9) bg-(--slate-2) flex-wrap"
            justify="between"
            p="3"
            gap="2"
          >
            {([
              { key: "player", label: "Player character" },
              { key: "party", label: "Party" },
              { key: "location", label: "Location" },
              { key: "inventory", label: "Inventory" },
              { key: "options", label: "Options" },
            ] as const).map((item) => (
              <Button
                key={item.key}
                variant={activePane === item.key ? "solid" : "soft"}
                color="gold"
                onClick={() => setActivePane(activePane === item.key ? null : item.key)}
              >
                {item.label}
              </Button>
            ))}
          </Flex>
        </Flex>

        {activePane && (
          <Flex
            className="bg-(--slate-1) border border-(--gold-10) shadow-[0_0_20px_var(--slate-9)] w-[22rem] shrink-0"
            direction="column"
            height="100vh"
          >
            <Flex align="center" justify="between" className="border-b border-(--gold-9)" p="4">
              <Text size="5" weight="bold">
                {activePane === "player" && "Player character"}
                {activePane === "party" && "Party"}
                {activePane === "location" && "Location"}
                {activePane === "inventory" && "Inventory"}
                {activePane === "options" && "Options"}
              </Text>
              <Button variant="ghost" color="gold" onClick={() => setActivePane(null)}>
                Close
              </Button>
            </Flex>
            <ScrollArea className="flex-1" type="auto">
              <Box p="4">
                {activePane === "player" && <CharacterView character={protagonist} />}

                {activePane === "party" && (
                  <Flex direction="column" gap="4">
                    {partyMembers.length === 0 && <Text color="gray">No party members yet.</Text>}
                    {partyMembers.map((member) => (
                      <CharacterView key={`${member.name}-${member.locationIndex}`} character={member} />
                    ))}
                  </Flex>
                )}

                {activePane === "location" && (
                  <Flex direction="column" gap="3">
                    {currentLocation ? (
                      <>
                        <Text size="5" weight="bold">
                          {currentLocation.name}
                        </Text>
                        <Text size="2" color="gray">
                          {currentLocation.type}
                        </Text>
                        <Text>{currentLocation.description}</Text>
                      </>
                    ) : (
                      <Text color="gray">No location yet.</Text>
                    )}
                  </Flex>
                )}

                {activePane === "inventory" && (
                  <Flex direction="column" gap="3">
                    {inventory.length === 0 && <Text color="gray">Inventory is empty.</Text>}
                    {inventory.map((item) => (
                      <Box key={item.name} className="border border-(--slate-6) rounded-[12px]" p="3">
                        <Text weight="bold">{item.name}</Text>
                        <Text as="div" size="2" color="gray">
                          {item.description}
                        </Text>
                      </Box>
                    ))}
                  </Flex>
                )}

                {activePane === "options" && (
                  <Flex direction="column" gap="3">
                    <Box className="border border-(--slate-6) rounded-[12px]" p="3">
                      <Text weight="bold">Genre</Text>
                      <Text as="div" size="2" color="gray">
                        {genre}
                      </Text>
                    </Box>
                    <Box className="border border-(--slate-6) rounded-[12px]" p="3">
                      <Text weight="bold" mb="2" as="div">
                        Content
                      </Text>
                      <SegmentedControl.Root
                        value={settingsSection}
                        onValueChange={(value) => setSettingsSection(value as "sexual" | "violence")}
                      >
                        <SegmentedControl.Item value="sexual">Sexual</SegmentedControl.Item>
                        <SegmentedControl.Item value="violence">Violence</SegmentedControl.Item>
                      </SegmentedControl.Root>
                      <Text as="div" size="2" color="gray" mt="2">
                        {settingsSection === "sexual"
                          ? `Level: ${sexualContentLevel}`
                          : `Level: ${violentContentLevel}`}
                      </Text>
                    </Box>
                  </Flex>
                )}
              </Box>
            </ScrollArea>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}
