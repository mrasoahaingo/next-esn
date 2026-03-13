
import { createGateway } from 'ai';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
});

export const modelName = 'google/gemini-2.5-flash';
export const model = gateway(modelName);
