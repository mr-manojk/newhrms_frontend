import { GoogleGenAI } from "@google/genai";

// Use a getter or a safe initialization to prevent top-level crashes
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch {
    return '';
  }
};

export const askNexusAI = async (query: string, context: string) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "AI Features are currently unavailable (Missing API Key). Please contact your administrator.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config: {
        systemInstruction: `You are NexusAI, an expert HR virtual assistant for "NexusHR Cloud". 
        Your goal is to help employees with workplace queries, policy explanations, and drafting professional communications.
        
        Context for current user: ${context}
        
        Guidelines:
        1. Be professional, empathetic, and concise.
        2. Use the user's name if provided in context.
        3. If asked about leave policies, reference standard quotas: 21 Annual, 12 Sick, 10 Casual.
        4. If helping draft a message, keep it corporate and polite.
        5. Do not hallucinate data that isn't in the context; if unsure, tell them to contact HR Admin Sarah Chen.`,
        temperature: 0.7,
      },
    });

    return response.text || "I processed that, but I don't have a specific answer right now.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my brain right now. Please try again in a moment.";
  }
};