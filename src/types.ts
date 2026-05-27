
export type CardCondition = 'Mint' | 'Near Mint' | 'Lightly Played' | 'Heavily Played' | 'Damaged';

export interface PricePoint {
  date: string;
  price: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface CardGrade {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  overall: number;
  report: string;
}

export interface Card {
  id: string;
  tohuManaId?: string; // Unique ID for graded cards
  name: string;
  cardNumber: string;
  setName: string;
  imageUrl: string;
  images?: string[]; // Optional array of base64 images (front, back, angle)
  condition: CardCondition;
  estimatedValue: number;
  lastUpdated: string;
  priceHistory: PricePoint[];
  sources: GroundingSource[];
  grade?: CardGrade;
  isManualUpload?: boolean;
  rawOcrData?: string;
  verificationHash?: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  setName: string;
  cardNumber?: string;
  targetPrice?: number;
  priceRange?: [number, number];
  foundListings: Array<{
    platform: string;
    price: number;
    uri: string;
    title: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface TradeMeListing {
  Title: string;
  Description: string;
  Price: string;
  Category: string;
  ImageUrl: string;
}

export interface AdvisorRecommendation {
  type: 'buy' | 'sell' | 'hold';
  cardName: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}
