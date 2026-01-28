// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

const { Telegraf, Markup } = require("telegraf");

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN. Set it before running the Telegram bot.");
}

const webUrl = process.env.WAIDRIN_WEB_URL ?? "https://waidrin.example.com/telegram";

const bot = new Telegraf(token);

const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback("Start adventure", "start_adventure")],
  [Markup.button.callback("Pick a genre", "pick_genre"), Markup.button.callback("My characters", "my_characters")],
  [Markup.button.url("Open Waidrin on the web", webUrl)],
]);

bot.start(async (ctx) => {
  await ctx.reply(
    "Welcome to Waidrin on Telegram. I can spin up a new story, manage characters, and keep your adventure on track.",
    mainMenu,
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Try /start to launch the main menu. You can also just tell me what kind of story you want to play.",
  );
});

bot.action("start_adventure", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Tell me the kind of adventure you want today. Example: *A sky pirate heist with a mysterious patron.*",
    { parse_mode: "Markdown" },
  );
});

bot.action("pick_genre", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Choose a genre to get started:",
    Markup.inlineKeyboard([
      [Markup.button.callback("Fantasy", "genre_fantasy"), Markup.button.callback("Sci-fi", "genre_scifi")],
      [Markup.button.callback("Noir", "genre_noir"), Markup.button.callback("Slice of life", "genre_slice")],
    ]),
  );
});

bot.action(["genre_fantasy", "genre_scifi", "genre_noir", "genre_slice"], async (ctx) => {
  await ctx.answerCbQuery();
  const genre = ctx.callbackQuery.data.replace("genre_", "");
  await ctx.reply(
    `Great choice! I will prepare a ${genre} scenario. Want a custom hero name or should I generate one?`,
  );
});

bot.action("my_characters", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Character sync is coming soon. For now, tell me who you want to play and I will set them up.",
  );
});

bot.on("text", async (ctx) => {
  await ctx.reply(
    "Got it. I will turn that into the opening scene and send you the first prompt.\n\n" +
      "If you want menu options again, type /start.",
  );
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
