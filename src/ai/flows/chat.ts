'use server';
/**
 * @fileOverview A simple chat flow for the AI Business Assistant.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChatInputSchema = z.string();
const ChatOutputSchema = z.string();

export async function sendChatMessage(message: string): Promise<string> {
  return chatFlow(message);
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (message) => {
    const llmResponse = await ai.generate({
      prompt: `You are an expert business assistant for a cricket goods store. Analyze the user's request and provide insightful, actionable advice. User query: "${message}"`,
      model: 'googleai/gemini-1.5-flash',
      config: {
        temperature: 0.5,
      },
    });

    return llmResponse.text;
  }
);
