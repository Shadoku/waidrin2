// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram/handler";
import type { TelegramUpdate } from "@/lib/telegram/types";

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as TelegramUpdate;
    await handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
