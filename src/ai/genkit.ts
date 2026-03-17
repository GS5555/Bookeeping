/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 * It serves as the central point for AI configuration in the application.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { googleCloud } from '@genkit-ai/google-cloud';

// Initialize Genkit and export the AI instance
export const ai = genkit({
  plugins: [
    googleAI(),
    googleCloud(),
  ],
  // Log to the console in non-prod environments.
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  // In a real app, you would configure a production-ready tracer.
});
