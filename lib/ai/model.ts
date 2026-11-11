import { google } from '@ai-sdk/google';
import { defaultSettingsMiddleware, wrapLanguageModel } from 'ai';

/**
 * Gemini con la clave de Google AI Studio (GOOGLE_GENERATIVE_AI_API_KEY). 3.8 Flash aconseja bien, lee fotos y cuesta céntimos;
 * GEMINI_MODEL cambia de modelo sin tocar el código. Piensa poco: si no, gasta el maxOutputTokens pensando y corta la respuesta.
 */
export const AI_MODEL = wrapLanguageModel({
  model: google(process.env.GEMINI_MODEL || 'gemini-3.8-flash'),
  middleware: defaultSettingsMiddleware({
    settings: { providerOptions: { google: { thinkingConfig: { thinkingLevel: 'low' } } } },
  }),
});
