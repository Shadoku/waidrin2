// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import OpenAI from "openai";
import * as z from "zod/v4";
import type { Prompt } from "@/lib/prompts";

export type TokenCallback = (token: string, count: number) => void;

export type BackendSettings = {
  apiUrl: string;
  apiKey: string;
  model: string;
  generationParams: Record<string, unknown>;
  narrationParams: Record<string, unknown>;
};

export class TelegramBackend {
  private controller = new AbortController();
  private settings: BackendSettings;

  constructor(settings: BackendSettings) {
    this.settings = settings;
  }

  updateSettings(settings: BackendSettings): void {
    this.settings = settings;
  }

  private getClient(): OpenAI {
    return new OpenAI({
      baseURL: this.settings.apiUrl,
      apiKey: this.settings.apiKey,
    });
  }

  private async *getResponseStream(prompt: Prompt, params: Record<string, unknown> = {}): AsyncGenerator<string> {
    try {
      const stream = await this.getClient().chat.completions.create(
        {
          stream: true,
          model: this.settings.model,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          max_tokens: 4096,
          max_completion_tokens: 4096,
          ...params,
        },
        { signal: this.controller.signal },
      );

      for await (const chunk of stream) {
        if (chunk.choices.length === 0) {
          return;
        }

        const choice = chunk.choices[0];

        if (choice.delta.content) {
          yield choice.delta.content;
        }

        if (choice.finish_reason) {
          return;
        }
      }

      if (stream.controller.signal.aborted) {
        throw new OpenAI.APIUserAbortError();
      }
    } finally {
      this.controller = new AbortController();
    }
  }

  private async getResponse(prompt: Prompt, params: Record<string, unknown> = {}, onToken?: TokenCallback): Promise<string> {
    let response = "";
    let count = 0;

    if (onToken) {
      onToken("", 0);
    }

    for await (const token of this.getResponseStream(prompt, params)) {
      response += token;
      count++;

      if (onToken) {
        onToken(token, count);
      }
    }

    return response;
  }

  async getNarration(prompt: Prompt, onToken?: TokenCallback): Promise<string> {
    return await this.getResponse(prompt, this.settings.narrationParams, onToken);
  }

  async getObject<Schema extends z.ZodType, Type extends z.infer<Schema>>(
    prompt: Prompt,
    schema: Schema,
    onToken?: TokenCallback,
  ): Promise<Type> {
    const response = await this.getResponse(
      prompt,
      {
        ...this.settings.generationParams,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "schema",
            strict: true,
            schema: z.toJSONSchema(schema),
          },
        },
      },
      onToken,
    );

    return schema.parse(JSON.parse(response)) as Type;
  }

  abort(): void {
    this.controller.abort();
  }

  isAbortError(error: unknown): boolean {
    return error instanceof OpenAI.APIUserAbortError;
  }
}
