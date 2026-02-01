// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import type { Metadata } from "next";
import styles from "./telegram.module.css";

const telegramBotUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "https://t.me/waidrin_bot";

export const metadata: Metadata = {
  title: "Waidrin on Telegram",
  description: "Chat with Waidrin on Telegram with a streamlined mobile-first experience.",
};

export default function TelegramPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.badge}>Telegram Bot Front End</p>
          <h1 className={styles.title}>Waidrin, now in your Telegram chats.</h1>
          <p className={styles.subtitle}>
            Launch roleplay sessions, manage characters, and keep adventures flowing from your phone.
            This experience is purpose-built for Telegram and separate from the full React application.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href={telegramBotUrl} rel="noreferrer" target="_blank">
              Open the Waidrin bot
              <ArrowRightIcon />
            </a>
            <div className={styles.secondaryAction}>
              <span>Bot URL</span>
              <code>{telegramBotUrl}</code>
            </div>
          </div>
          <div className={styles.heroDetails}>
            <div>
              <strong>Instant sessions</strong>
              <span>Start with /start and jump straight into a curated scenario.</span>
            </div>
            <div>
              <strong>Always in sync</strong>
              <span>Resume your latest adventure anytime with automatic session memory.</span>
            </div>
            <div>
              <strong>Telegram-native controls</strong>
              <span>Use inline buttons to switch scenes, characters, and genres without typing commands.</span>
            </div>
          </div>
        </div>
        <div className={styles.heroPreview}>
          <div className={styles.chatCard}>
            <header>
              <div>
                <p className={styles.chatTitle}>Waidrin Bot</p>
                <p className={styles.chatStatus}>Online • Ready for your next quest</p>
              </div>
              <span className={styles.chatBadge}>Telegram</span>
            </header>
            <div className={styles.chatBody}>
              <div className={styles.messageIncoming}>
                <span className={styles.messageLabel}>Waidrin</span>
                <p>
                  Your airship docks above the floating citadel. Choose a crew member to brief and pick a
                  mission template.
                </p>
              </div>
              <div className={styles.messageOutgoing}>
                <span className={styles.messageLabel}>You</span>
                <p>Brief the navigator and queue up a stealth reconnaissance run.</p>
              </div>
              <div className={styles.messageIncoming}>
                <span className={styles.messageLabel}>Waidrin</span>
                <p>
                  Stealth route confirmed. I&#39;ve prepared three intel options. Tap to choose or ask for a
                  custom briefing.
                </p>
              </div>
            </div>
            <footer className={styles.chatFooter}>
              <button type="button">Intel Option A</button>
              <button type="button">Intel Option B</button>
              <button type="button">Custom briefing</button>
            </footer>
          </div>
        </div>
      </section>

      <section className={styles.gridSection}>
        <div className={styles.sectionHeading}>
          <h2>Designed for Telegram from the ground up</h2>
          <p>
            This front end prioritizes fast mobile navigation, smart presets, and a UI that feels right at
            home in Telegram&#39;s chat-first workflow.
          </p>
        </div>
        <div className={styles.grid}>
          <article>
            <RocketIcon />
            <h3>Quick start flows</h3>
            <p>Start new adventures in seconds with guided prompts and inline menu controls.</p>
          </article>
          <article>
            <ChatBubbleIcon />
            <h3>Threaded scene management</h3>
            <p>Keep important lore, NPCs, and logs in easy-to-recall chat threads.</p>
          </article>
          <article>
            <CheckIcon />
            <h3>Play-ready templates</h3>
            <p>Switch between genres, characters, and pacing presets without leaving Telegram.</p>
          </article>
        </div>
      </section>

      <section className={styles.stepsSection}>
        <div className={styles.sectionHeading}>
          <h2>How it works</h2>
          <p>Everything you need to begin an adventure is built into the Telegram flow.</p>
        </div>
        <ol className={styles.steps}>
          <li>
            <span>1</span>
            <div>
              <h3>Open the bot</h3>
              <p>Tap the Telegram button above to open the official Waidrin bot.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Pick a scenario</h3>
              <p>Choose a genre or bring your own idea—Waidrin will guide the setup.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Play on the go</h3>
              <p>Continue the story anytime with Waidrin&#39;s smart memory and recap controls.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className={styles.ctaSection}>
        <div>
          <h2>Ready to chat in Telegram?</h2>
          <p>Launch the bot and start your next Waidrin session in seconds.</p>
        </div>
        <a className={styles.primaryAction} href={telegramBotUrl} rel="noreferrer" target="_blank">
          Open Waidrin on Telegram
          <ArrowRightIcon />
        </a>
      </section>
    </main>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M13.5 5.5 20 12l-6.5 6.5M4 12h15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 3c4.5 1 7.5 4 8 8l-6 6-4-4-6 6 2-6-4-4 6-6c4-1 7-2 10 0Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <circle cx="14.5" cy="9.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4 6h16v10H8l-4 4V6Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path d="M8 11h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M6 12.5 10.5 17 19 8.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
