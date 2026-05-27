
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Card, PricePoint, GroundingSource, CardCondition, AdvisorRecommendation, WishlistItem, CardGrade } from "../types";

// Always use named parameter for apiKey initialization and use the env variable directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "dummy-dev-key-so-the-page-loads-without-crashing" });

export async function analyzeCardImage(base64Image: string): Promise<Partial<Card>> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: "Analyze this trading card. Extract the card name, card number (e.g. 151/165), and set name if possible. Return as JSON." }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          cardNumber: { type: Type.STRING },
          setName: { type: Type.STRING }
        },
        required: ["name", "cardNumber", "setName"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return {
    name: data.name,
    cardNumber: data.cardNumber,
    setName: data.setName,
    imageUrl: `data:image/jpeg;base64,${base64Image}`
  };
}

export async function gradeCard(images: string[]): Promise<CardGrade> {
  // Use Gemini 3 Pro for complex visual analysis of multiple angles
  // Correctly structure the contents with a single Content object containing all image and text parts.
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          ...images.map(img => ({ inlineData: { data: img, mimeType: 'image/jpeg' } })),
          {
            text: `Perform a detailed Tohu Mana grading analysis. Examine centering (alignment), edge discoloration/chipping, surface crinkles/creases, and corner wear. 
            If the images are too dim, blurry, or unclear, set 'failure' to true.
            Return grades from 1-10 for centering, corners, edges, and surface.
            Provide a detailed report as Whiro. Return JSON.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          failure: { type: Type.BOOLEAN },
          failureReason: { type: Type.STRING },
          centering: { type: Type.NUMBER },
          corners: { type: Type.NUMBER },
          edges: { type: Type.NUMBER },
          surface: { type: Type.NUMBER },
          overall: { type: Type.NUMBER },
          report: { type: Type.STRING }
        },
        required: ["failure", "overall", "report"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  if (data.failure) {
    throw new Error(data.failureReason || "Grading failed due to image quality.");
  }

  return {
    centering: data.centering || 0,
    corners: data.corners || 0,
    edges: data.edges || 0,
    surface: data.surface || 0,
    overall: data.overall || 0,
    report: data.report || ""
  };
}

export async function getMarketValue(card: Partial<Card>, condition: CardCondition = 'Near Mint'): Promise<{
  estimatedValue: number;
  history: PricePoint[];
  sources: GroundingSource[];
}> {
  const query = `What is the honest estimated sold price of a ${card.name} ${card.cardNumber} ${card.setName} trading card in ${condition} condition? Please look at eBay and popular card listing sites for sold listings in the last 3 weeks. Provide a price history (at least 5 data points over the last 21 days) and list sources. Adjust for condition: ${condition}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: GroundingSource[] = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || 'Market Listing',
      uri: chunk.web.uri
    }));

  const parseResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this market research for ${card.name} in ${condition} condition: "${response.text}", extract the average sold price today and a historical price trend for the last 3 weeks. Return as JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          averagePrice: { type: Type.NUMBER },
          history: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                price: { type: Type.NUMBER }
              },
              required: ["date", "price"]
            }
          }
        },
        required: ["averagePrice", "history"]
      }
    }
  });

  const parsedData = JSON.parse(parseResponse.text || '{}');

  return {
    estimatedValue: parsedData.averagePrice || 0,
    history: parsedData.history || [],
    sources: sources.slice(0, 5)
  };
}

export async function getAdvisorRecommendations(inventory: Card[], goal: string): Promise<AdvisorRecommendation[]> {
  const inventorySummary = inventory.map(c => `${c.name} (${c.condition}, $${c.estimatedValue})`).join(', ');
  const prompt = `Act as Whiro, an expert Trading Advisor for Tohu Mana Trading. 
  Your personality is deep, professional, and slightly mystical, reflecting the concept of mana and mana-value.
  Goal: ${goal}. 
  Inventory: ${inventorySummary}. 
  Analyze recent market trends using search and suggest 3-5 specific actions (Buy/Sell/Hold). 
  Explain why for each, considering profit maximization and the user's goal. Return as JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: 'buy, sell, or hold' },
            cardName: { type: Type.STRING },
            reason: { type: Type.STRING },
            priority: { type: Type.STRING, description: 'low, medium, high' }
          },
          required: ["type", "cardName", "reason", "priority"]
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
}

export async function checkWishlistMatches(item: WishlistItem): Promise<WishlistItem['foundListings']> {
  const query = `Find current active listings for ${item.name} ${item.setName} ${item.cardNumber || ''} trading card. Look for prices around ${item.targetPrice || 'market value'}.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const parsePrompt = `From this search data: "${response.text}", identify specific listings for ${item.name} that match the search. Extract platform, price, title, and URL. Return as JSON.`;
  
  const parseResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: parsePrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            platform: { type: Type.STRING },
            price: { type: Type.NUMBER },
            uri: { type: Type.STRING },
            title: { type: Type.STRING }
          },
          required: ["platform", "price", "uri", "title"]
        }
      }
    }
  });

  return JSON.parse(parseResponse.text || '[]');
}

export async function getChatResponse(message: string, history: any[], context: string) {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Whiro, the wise and ancient kaitiaki (advisor) for Tohu Mana Trading. 
      Context of current session: ${context}.
      Answer questions about market trends, grading advice, shipping, card condition, or the specific collection items in this context. 
      Your tone is deep, mystical, yet professional. Protect the collection's mana and reflect a respectful te reo / English blend where appropriate.`
    }
  });

  const result = await chat.sendMessage({ message });
  return result.text;
}
