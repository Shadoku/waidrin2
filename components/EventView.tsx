// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { memo } from "react";
import type { Event } from "@/lib/state";
import ActionEventView from "./ActionEventView";
import CharacterIntroductionEventView from "./CharacterIntroductionEventView";
import LocationChangeEventView from "./LocationChangeEventView";
import NarrationEventView from "./NarrationEventView";

// The list of events can grow very long, so this component is memoized
// to prevent re-rendering all events when one of them is updated.
export default memo(function EventView({ event, index }: { event: Event; index: number }) {
  return (
    <>
      {event.type === "action" && <ActionEventView event={event} index={index} />}
      {event.type === "narration" && <NarrationEventView event={event} index={index} />}
      {event.type === "character_introduction" && <CharacterIntroductionEventView event={event} />}
      {event.type === "location_change" && <LocationChangeEventView event={event} />}
    </>
  );
});
