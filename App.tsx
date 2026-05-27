// Add these imports at the top if you haven't yet
import { db } from './firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import React, { useState, useEffect, useCallback } from 'react';
import { Scan, LayoutGrid, MessageSquare, Download, X, Link as LinkIcon, AlertCircle, Share2, Search, Heart, BrainCircuit, CheckCircle2, RefreshCw, Bell, TrendingUp as TrendingUpIcon, Award, ChevronRight, ChevronLeft, Scroll, History, PlusCircle } from 'lucide-react';
import Scanner from './components/Scanner';
import Inventory from './components/Inventory';
import ChatInterface from './components/ChatInterface';
import PriceChart from './components/PriceChart';
import { Card, ChatMessage, CardCondition, WishlistItem, AdvisorRecommendation, CardGrade } from './types';
import { analyzeCardImage, getMarketValue, getChatResponse, getAdvisorRecommendations, checkWishlistMatches, gradeCard } from './services/geminiService';
import { downloadTradeMeCSV } from './utils/export';
import initialInventory from './inventory_data.json';

// Cryptographic hash generation using native Web Crypto API to sign the digital twin
const generateVerificationHash = async (
  cardName: string,
  cardNumber: string,
  setName: string,
  overallGrade?: number
): Promise<string> => {
  const salt = Math.random().toString(36).substring(2, 8);
  const input = `${cardName}|${cardNumber}|${setName}|${overallGrade || 'Raw'}|${salt}|${Date.now()}`;
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const KoruIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 50,5 C 25.15,5 5,25.15 5,50 c 0,24.85 20.15,45 45,45 c 19.35,0 35.89,-12.19 42.27,-29.25 c 1.55,-4.14 -1.26,-8.54 -5.62,-8.99 c -4.14,-0.43 -7.97,2.16 -9.28,6.1 C 72.53,77.34 62.25,83 50,83 c -18.23,0 -33,-14.77 -33,-33 c 0,-18.23 14.77,-33 33,-33 c 18.23,0 33,14.77 33,33 c 0,5.52 -4.48,10 -10,10 c -5.52,0 -10,-4.48 -10,-10 c 0,-7.18 -5.82,-13 -13,-13 c -7.18,0 -13,5.82 -13,13 c 0,7.18 5.82,13 13,13 c 3.31,0 6,-2.69 6,-6 c 0,-3.31 -2.69,-6 -6,-6 c -1.11,0 -2,-0.9 -2,-2 c 0,-1.1 0.9,-2 2,-2 c 3.31,0 6,2.69 6,6 c 0,6.63 -5.37,12 -12,12 c -9.94,0 -18,-8.06 -18,-18 c 0,-9.94 8.06,-18 18,-18 c 13.26,0 24,10.75 24,24 c 0,12.15 -9.85,22 -22,22 c -17.67,0 -32,-14.33 -32,-32 C 15,25.43 30.67,10 50,10 c 22.09,0 40,17.91 40,40 c 0,3.31 2.69,6 6,6 c 3.31,0 6,-2.69 6,-6 C 102,22.09 78.71,5 50,5 Z"
      />
    </svg>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'inventory' | 'wishlist' | 'advisor'>('inventory');
  const [cards, setCards] = useState<Card[]>(initialInventory as Card[]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [recommendations, setRecommendations] = useState<AdvisorRecommendation[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Buyer Portal States
  const [isBuyerView, setIsBuyerView] = useState(false);
  const [searchCodeQuery, setSearchCodeQuery] = useState('');
  const [freeLookups, setFreeLookups] = useState(20);
  
  // Memory UI
  const [newMemory, setNewMemory] = useState('');
  
  // Scanning Flow
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [pendingCard, setPendingCard] = useState<Partial<Card> | null>(null);
  const [pendingGrade, setPendingGrade] = useState<CardGrade | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<CardCondition>('Near Mint');
  
  // Modals/UI
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [isWishlistChecking, setIsWishlistChecking] = useState(false);

  // Reset active image index when selectedCard changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedCard]);

  // Persistence & URL Routing
  useEffect(() => {
    const savedCards = localStorage.getItem('tohumana_inventory');
    const savedWishlist = localStorage.getItem('tohumana_wishlist');
    let loadedCards = initialInventory as Card[];
    if (savedCards) {
      try {
        loadedCards = JSON.parse(savedCards);
      } catch (e) {
        console.error("Failed to parse saved cards:", e);
      }
    }
    setCards(loadedCards);
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));

    const savedLookups = localStorage.getItem('tohumana_free_lookups');
    let currentLookups = 20;
    if (savedLookups) {
      currentLookups = parseInt(savedLookups, 10);
      setFreeLookups(currentLookups);
    } else {
      localStorage.setItem('tohumana_free_lookups', '20');
      setFreeLookups(20);
    }

    // Parse URL parameter for verification code
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || params.get('c');
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const matchedCard = loadedCards.find(
        c => (c.tohuManaId && c.tohuManaId.toUpperCase() === cleanCode) || 
             c.id.toUpperCase() === cleanCode ||
             c.cardNumber.toUpperCase().replace('-', '') === cleanCode.replace('TM-', '')
      );
      if (matchedCard) {
        setSelectedCard(matchedCard);
        setIsBuyerView(true);
      } else {
        setIsBuyerView(true);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tohumana_inventory', JSON.stringify(cards));
    localStorage.setItem('tohumana_wishlist', JSON.stringify(wishlist));
  }, [cards, wishlist]);

  const handleScan = async (base64: string, isManual?: boolean) => {
    setIsProcessing(true);
    setProcessingStatus('Whiro is identifying your artifact...');
    try {
      const analyzed = await analyzeCardImage(base64);
      setPendingCard({ 
        ...analyzed, 
        isManualUpload: isManual,
        images: [base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`]
      });
      setPendingGrade(null); // Reset any old grade
    } catch (error) {
      console.error("Scan failed:", error);
      alert("Scan failed. Try again.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleGradingScan = async (images: string[]) => {
    setIsProcessing(true);
    setProcessingStatus('Whiro is performing detailed grading...');
    try {
      const analyzed = await analyzeCardImage(images[0]);
      const grade = await gradeCard(images);
      
      setPendingCard({
        ...analyzed,
        images: images.map(img => img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`)
      });
      setPendingGrade(grade);

      const gradeMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        content: `I have analyzed the mana of your ${analyzed.name}. Tohu Mana Grade: ${grade.overall}/10. ${grade.report}`,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, gradeMsg]);
      setIsChatOpen(true);
      setIsChatCollapsed(false);
    } catch (error: any) {
      console.error("Grading failed:", error);
      alert(error.message || "Grading failed. Ensure your environment is well lit.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const confirmAndSaveCard = async () => {
    if (!pendingCard) return;
    setIsProcessing(true);
    setProcessingStatus(`Whiro is fetching market value...`);
    
    try {
      const conditionToUse = pendingGrade ? 
        (pendingGrade.overall >= 9 ? 'Mint' : pendingGrade.overall >= 7 ? 'Near Mint' : 'Lightly Played') : 
        selectedCondition;

      const marketData = await getMarketValue(pendingCard, conditionToUse);
      const tohuManaId = pendingGrade ? `TM-${Math.random().toString(36).substr(2, 6).toUpperCase()}` : undefined;
      const verificationHash = await generateVerificationHash(
        pendingCard.name || 'Unknown',
        pendingCard.cardNumber || 'N/A',
        pendingCard.setName || 'Unknown',
        pendingGrade?.overall
      );

      // This is the object that will represent the card's Mana in the Den
      const cardData = {
        tohuManaId,
        name: pendingCard.name || 'Unknown',
        cardNumber: pendingCard.cardNumber || 'N/A',
        setName: pendingCard.setName || 'Unknown',
        imageUrl: pendingCard.imageUrl || '',
        images: pendingCard.images || [],
        condition: conditionToUse,
        estimatedValue: marketData.estimatedValue,
        lastUpdated: new Date().toISOString(),
        priceHistory: marketData.history,
        sources: marketData.sources,
        grade: pendingGrade || null, // Firestore prefers null over undefined
        isManualUpload: !!pendingCard.isManualUpload,
        verificationHash,
        createdAt: new Date().toISOString(), // Fallback local ISO string
        status: 'available'
      };

      setProcessingStatus(`Whiro is binding this card to Alpha Terminal 01...`);

      let docId = `local-${Date.now()}`;
      try {
        // PUSH TO FIRESTORE (best-effort optional sync)
        const docRef = await addDoc(collection(db, "tohu_mana_inventory"), {
          ...cardData,
          createdAt: serverTimestamp() // Official Firestore server timestamp
        });
        docId = docRef.id;
      } catch (e) {
        console.error("Whiro encountered an error binding to Firestore, using local ID instead:", e);
      }

      // Always update local state so the UI stays snappy and works offline!
      const newCard: Card = { 
        id: docId, 
        ...cardData,
        createdAt: new Date().toISOString()
      } as Card;

      setCards(prev => [newCard, ...prev]);
      setPendingCard(null);
      setPendingGrade(null);
      setActiveTab('inventory');
      setSelectedCard(newCard);

    } catch (e) {
      console.error("Whiro encountered an error binding to the Den:", e);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const addMemoryToCard = (cardId: string) => {
    if (!newMemory.trim()) return;
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        const updatedMemories = [...(c.memories || []), newMemory.trim()];
        const updatedCard = { ...c, memories: updatedMemories };
        if (selectedCard?.id === cardId) setSelectedCard(updatedCard);
        return updatedCard;
      }
      return c;
    }));
    setNewMemory('');
  };

  const handleBuyerSearch = () => {
    if (freeLookups <= 0) {
      alert("Free lookup limit reached. Premium subscription coming soon!");
      return;
    }
    const query = searchCodeQuery.trim().toUpperCase();
    if (!query) return;

    const matchedCard = cards.find(
      c => (c.tohuManaId && c.tohuManaId.toUpperCase() === query) || 
           c.id.toUpperCase() === query || 
           c.cardNumber.toUpperCase().replace('-', '') === query.replace('TM-', '')
    );

    if (matchedCard) {
      setSelectedCard(matchedCard);
      const nextLookups = freeLookups - 1;
      setFreeLookups(nextLookups);
      localStorage.setItem('tohumana_free_lookups', nextLookups.toString());
    } else {
      alert("Card Code not found in the Tohu Mana Registry. Make sure it matches the TM-... code on the listing.");
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    let chatContext = "";
    if (isBuyerView && selectedCard) {
      chatContext = `Buyer Mode: The user is looking at card: ${selectedCard.name} [${selectedCard.cardNumber}] from set ${selectedCard.setName} with condition ${selectedCard.condition} and estimated value $${(selectedCard.estimatedValue * 1.63).toFixed(2)} NZD. Grade: ${selectedCard.grade?.overall || 'N/A'}/10. Report: ${selectedCard.grade?.report || 'Raw'}. Verification Hash: ${selectedCard.verificationHash || 'N/A'}.`;
    } else {
      const invSummary = cards.slice(0, 10).map(c => `${c.name} (${c.condition}, $${c.estimatedValue.toFixed(2)})`).join(', ');
      chatContext = `Admin Mode: User's inventory in The Den: ${invSummary}.`;
    }

    try {
      const response = await getChatResponse(content, chatMessages, chatContext);
      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        content: response || "...", 
        timestamp: Date.now(),
        isRecalling: true
      };
      setChatMessages(prev => [...prev, botMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const conditions: CardCondition[] = ['Mint', 'Near Mint', 'Lightly Played', 'Heavily Played', 'Damaged'];

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative">
      <img 
        src="https://ruqejtkudezadrqbdodx.supabase.co/storage/v1/object/public/card_images/Whiro+Kitenga.png" 
        className="bg-mana-image"
        alt="Whiro Kitenga Background"
      />
      <div className="bg-mana-overlay"></div>

      {isBuyerView ? (
        <main className="flex-1 flex flex-col relative overflow-hidden z-10 bg-transparent">
          <header className="h-16 px-6 border-b border-amber-900/40 flex items-center justify-between bg-black/75 backdrop-blur-xl z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-950/80 rounded-lg flex items-center justify-center border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.45)] p-1.5 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                <KoruIcon className="w-full h-full text-amber-500" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">TMT <span className="text-amber-500 italic">Twin Registry</span></h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline mr-2">{freeLookups} / 20 lookups left</span>
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)} 
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                title="Consult Whiro Oracle"
              >
                <MessageSquare size={16} />
              </button>
              <button 
                onClick={() => {
                  const pw = prompt("Enter Admin Password:");
                  if (pw === "kaitiaki") {
                    setIsBuyerView(false);
                    setSelectedCard(null);
                    window.history.pushState({}, document.title, window.location.pathname);
                  } else if (pw !== null) {
                    alert("Invalid Admin Credentials.");
                  }
                }}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                title="Admin Portal Login"
              >
                <LinkIcon size={16} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            <div className="max-w-5xl mx-auto">
              {/* Registry Lookup Input */}
              <div className="mb-8 p-6 bg-slate-900/90 rounded-3xl border border-amber-950/60 shadow-xl max-w-xl mx-auto text-center">
                <h3 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Verify Card Digital Twin</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={searchCodeQuery}
                    onChange={(e) => setSearchCodeQuery(e.target.value)}
                    placeholder="Enter Card Code (e.g. TM-BT10110)" 
                    className="flex-1 bg-black/50 border border-amber-900/40 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleBuyerSearch()}
                  />
                  <button 
                    onClick={handleBuyerSearch}
                    className="px-6 bg-amber-700 hover:bg-amber-600 rounded-xl font-bold text-sm text-white uppercase tracking-wider transition-all"
                  >
                    Verify
                  </button>
                </div>
                <div className="flex justify-between items-center mt-3 text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <span>Lookups: {freeLookups} / 20 Remaining</span>
                  <span className="text-amber-500 animate-pulse">Premium subscription coming soon!</span>
                </div>
              </div>

              {selectedCard ? (
                <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Left Column: Image view */}
                  <div className="w-full lg:w-5/12 aspect-[2.5/3.5] bg-slate-900/40 p-6 rounded-[2.5rem] border border-amber-900/20 flex items-center justify-center relative min-h-[350px]">
                    <img 
                      src={(selectedCard.images && selectedCard.images[activeImageIndex]) || selectedCard.imageUrl} 
                      alt={selectedCard.name} 
                      className="w-full h-full object-contain rounded-2xl shadow-2xl border border-amber-900/10" 
                    />
                    {selectedCard.images && selectedCard.images.length > 1 && (
                      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-10">
                        {selectedCard.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`w-3.5 h-3.5 rounded-full transition-all ${
                              activeImageIndex === idx 
                                ? 'bg-amber-500 scale-125 shadow-[0_0_12px_rgba(245,158,11,0.8)] border border-white/20' 
                                : 'bg-white/30 hover:bg-white/60'
                            }`}
                            title={["Front", "Back", "Angle"][idx] || `View Image ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: High contrast card specs */}
                  <div className="flex-1 w-full bg-slate-950/80 p-8 sm:p-10 rounded-[2.5rem] border border-amber-900/30">
                    <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">{selectedCard.name}</h3>
                    <p className="text-xs text-slate-400 font-bold mb-6 tracking-widest uppercase">{selectedCard.setName} • #{selectedCard.cardNumber}</p>
                    
                    {/* Access-friendly Card Info Table */}
                    <div className="p-6 bg-slate-900/80 rounded-3xl border border-amber-700/20 text-slate-200 mb-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Set Group</span>
                          <span className="text-sm font-semibold text-white">{selectedCard.setName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Card Number</span>
                          <span className="text-sm font-semibold text-white">{selectedCard.cardNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Condition</span>
                          <span className="text-sm font-semibold text-white">{selectedCard.condition}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Digital Twin ID</span>
                          <span className="text-sm font-semibold text-amber-500 font-mono">{selectedCard.tohuManaId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grading Report */}
                    {selectedCard.grade && (
                      <div className="p-6 bg-slate-900/60 rounded-3xl border border-amber-700/10 mb-6 text-slate-200">
                        <span className="text-xs font-black text-amber-500 uppercase tracking-widest block mb-3">Whiro's Grading Report</span>
                        <div className="grid grid-cols-4 gap-2 text-center mb-4">
                          <div className="bg-black/40 p-2 rounded-xl border border-white/5"><div className="text-[8px] text-slate-400 uppercase">Centering</div><div className="font-bold text-sm text-white">{selectedCard.grade.centering}</div></div>
                          <div className="bg-black/40 p-2 rounded-xl border border-white/5"><div className="text-[8px] text-slate-400 uppercase">Corners</div><div className="font-bold text-sm text-white">{selectedCard.grade.corners}</div></div>
                          <div className="bg-black/40 p-2 rounded-xl border border-white/5"><div className="text-[8px] text-slate-400 uppercase">Edges</div><div className="font-bold text-sm text-white">{selectedCard.grade.edges}</div></div>
                          <div className="bg-black/40 p-2 rounded-xl border border-white/5"><div className="text-[8px] text-slate-400 uppercase">Surface</div><div className="font-bold text-sm text-white">{selectedCard.grade.surface}</div></div>
                        </div>
                        <p className="text-xs italic text-slate-300">"{selectedCard.grade.report}"</p>
                      </div>
                    )}

                    {/* Cryptographic Twin verification hash */}
                    {selectedCard.verificationHash && (
                      <div className="p-5 bg-slate-900/40 border border-white/5 rounded-3xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-950/60 border border-amber-500/50 rounded-xl text-amber-500">
                            <Award size={20} />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Verified Digital Twin</div>
                            <div className="text-xs font-mono text-amber-500 select-all">{selectedCard.verificationHash}</div>
                          </div>
                        </div>
                        <span className="self-start sm:self-auto px-3 py-1 bg-amber-900/40 text-amber-100 text-[8px] font-black tracking-widest rounded-full border border-amber-800 uppercase">
                          Twin Verified
                        </span>
                      </div>
                    )}

                    {/* Price History */}
                    <div className="mb-6">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Estimated Value (NZD)</span>
                      <div className="text-3xl font-black text-white mb-4">${(selectedCard.estimatedValue * 1.63).toFixed(2)}</div>
                      <PriceChart data={selectedCard.priceHistory} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 italic">
                  Enter a verification code above to retrieve the card's digital twin parameters.
                </div>
              )}
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col relative overflow-hidden z-10 bg-transparent">
          <header className="h-16 px-6 border-b border-red-900/40 flex items-center justify-between bg-black/60 backdrop-blur-xl z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-950/80 rounded-lg flex items-center justify-center border border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.45)] p-1.5 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(220,38,38,0.6)]">
                <KoruIcon className="w-full h-full text-red-500" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">Tohu Mana <span className="text-red-600 italic">Trading</span></h1>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => downloadTradeMeCSV(cards)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-900/20 border border-red-800/50 hover:bg-red-800/40 rounded-lg text-xs font-bold transition-all text-white">
                <Download size={14} className="text-red-500" /> Export CSV
              </button>
              <button onClick={() => setIsChatOpen(!isChatOpen)} className="md:hidden p-2 rounded-lg bg-red-900/20 border border-red-800/50"><MessageSquare size={20} className="text-red-500" /></button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {activeTab === 'scan' ? (
              <div className="max-w-2xl mx-auto py-10">
                {pendingCard ? (
                  <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-8 border border-red-800/50 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl shadow-red-900/20">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white uppercase tracking-tighter">
                      <CheckCircle2 className="text-red-500" /> {pendingGrade ? 'Graded Ritual Complete' : 'Confirm Soul of Card'}
                    </h3>
                    <div className="flex gap-6 mb-8">
                      <div className="relative">
                        <img src={pendingCard.imageUrl} className="w-32 h-44 object-cover rounded-xl border border-red-800/40 shadow-[0_0_15px_rgba(153,27,27,0.3)]" alt="Scanned" />
                        {pendingGrade && (
                          <div className="absolute -top-3 -right-3 w-12 h-12 bg-red-800 border-2 border-red-400 rounded-full flex flex-col items-center justify-center shadow-lg">
                            <span className="text-[8px] font-black uppercase text-red-200">GRADE</span>
                            <span className="text-sm font-black leading-none">{pendingGrade.overall}</span>
                          </div>
                        )}
                        {pendingCard.isManualUpload && (
                          <div className="absolute -bottom-2 -right-2 px-2 py-1 bg-red-900/80 text-[8px] font-black text-white rounded-md border border-red-500 shadow-lg">MANUAL ENTRY</div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-red-400 font-bold uppercase mb-1 tracking-widest">Whiro Identified</p>
                        <h4 className="text-2xl font-bold text-white mb-1 leading-tight">{pendingCard.name}</h4>
                        <p className="text-slate-300 font-medium">{pendingCard.setName} • #{pendingCard.cardNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={confirmAndSaveCard} disabled={isProcessing} className="flex-1 py-4 bg-red-700 hover:bg-red-600 rounded-2xl font-bold shadow-lg shadow-red-950/50 disabled:opacity-50 transition-all text-white uppercase tracking-widest">
                        {isProcessing ? 'Summoning Market...' : 'Bind to Den'}
                      </button>
                      <button onClick={() => { setPendingCard(null); setPendingGrade(null); }} className="px-8 py-4 bg-transparent border border-white/10 hover:bg-white/5 rounded-2xl font-bold text-slate-300">Abort</button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="text-center mb-8">
                      <h2 className="text-4xl font-black mb-3 text-white tracking-tighter uppercase">SCAN THE MANA</h2>
                    </div>
                    <div className="p-1.5 rounded-[40px] bg-gradient-to-br from-red-800 to-black mean-glow shadow-2xl">
                      <Scanner 
                        onScan={handleScan} 
                        onGradingScan={handleGradingScan}
                        isProcessing={isProcessing} 
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'inventory' ? (
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                      THE DEN
                      <span className="text-[10px] font-bold text-red-100 bg-red-900/60 border border-red-600/50 px-3 py-1 rounded-full uppercase tracking-[0.2em]">Protected</span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Wealth of Mana: <span className="text-red-500 font-black text-lg ml-1">${cards.reduce((acc, c) => acc + c.estimatedValue, 0).toFixed(2)}</span></p>
                  </div>
                </div>
                <Inventory cards={cards} onSelectCard={setSelectedCard} />
              </div>
            ) : (
               <div className="max-w-4xl mx-auto py-20 text-center opacity-40 italic">Coming Soon to the Mana Registry...</div>
            )}
          </div>

          <nav className="h-20 bg-black/80 backdrop-blur-2xl border-t border-red-900/40 px-4 sm:px-12 flex items-center justify-between z-20">
            <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'inventory' ? 'text-red-500 scale-110' : 'text-slate-500 hover:text-red-800'}`}>
              <LayoutGrid size={24} /><span className="text-[10px] font-black uppercase tracking-widest hidden xs:block">The Den</span>
            </button>
            <button onClick={() => setActiveTab('wishlist')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'wishlist' ? 'text-red-500 scale-110' : 'text-slate-500 hover:text-red-800'}`}>
              <Heart size={24} /><span className="text-[10px] font-black uppercase tracking-widest hidden xs:block">Hunts</span>
            </button>
            <button onClick={() => setActiveTab('scan')} className="relative -top-8 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-red-800 border-2 border-red-500 shadow-[0_0_25px_rgba(220,38,38,0.5)] text-white transition-all hover:scale-110 active:scale-90">
              <Scan size={30} />
            </button>
            <button onClick={() => setActiveTab('advisor')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'advisor' ? 'text-red-500 scale-110' : 'text-slate-500 hover:text-red-800'}`}>
              <BrainCircuit size={24} /><span className="text-[10px] font-black uppercase tracking-widest hidden xs:block">Oracle</span>
            </button>
            <button onClick={() => { setIsChatOpen(true); setIsChatCollapsed(false); }} className={`flex flex-col items-center gap-1 transition-all ${isChatOpen && !isChatCollapsed ? 'text-red-500 scale-110' : 'text-slate-500 hover:text-red-800'}`}>
              <MessageSquare size={24} /><span className="text-[10px] font-black uppercase tracking-widest hidden xs:block">Chat</span>
            </button>
          </nav>
        </main>
      )}

      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedCard(null)}></div>
          <div className="relative bg-black w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(153,27,27,0.3)] border border-red-900 flex flex-col md:flex-row">
            <div className="w-full md:w-5/12 aspect-[2.5/3.5] bg-black/40 p-8 flex items-center justify-center relative">
              <img 
                src={(selectedCard.images && selectedCard.images[activeImageIndex]) || selectedCard.imageUrl} 
                alt={selectedCard.name} 
                className="w-full h-full object-contain rounded-2xl shadow-2xl border-2 border-red-900/30" 
              />
              {selectedCard.images && selectedCard.images.length > 1 && (
                <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 z-10">
                  {selectedCard.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        activeImageIndex === idx 
                          ? 'bg-red-500 scale-125 shadow-[0_0_10px_rgba(220,38,38,0.7)]' 
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                      title={["Front", "Back", "Angle"][idx] || `View Image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
              <button onClick={() => setSelectedCard(null)} className="absolute top-6 right-6 p-2 rounded-full bg-black/60 text-white md:hidden border border-red-800/50 z-20"><X size={24} /></button>
            </div>
            <div className="flex-1 p-8 sm:p-12 overflow-y-auto bg-black/40">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">{selectedCard.name}</h3>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-1.5 bg-red-950/30 border border-red-800/40 rounded-full text-xs font-black text-red-100 uppercase tracking-widest">{selectedCard.setName}</span>
                    <span className="px-4 py-1.5 bg-red-700 text-white border border-red-400 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">{selectedCard.condition}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedCard(null)} className="hidden md:block p-3 rounded-2xl hover:bg-red-900/20 transition-all border border-transparent hover:border-red-800"><X size={28} className="text-red-500" /></button>
              </div>

              {/* Personal Memories Section - Vector Source */}
              <div className="mb-10">
                <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                  <History size={14} /> Ancient Records & Memories
                </h4>
                <div className="space-y-4 mb-6">
                  {selectedCard.memories && selectedCard.memories.length > 0 ? (
                    selectedCard.memories.map((mem, i) => (
                      <div key={i} className="p-4 bg-red-950/10 border border-red-900/30 rounded-2xl italic text-slate-300 text-sm relative">
                        <Scroll className="absolute -left-2 -top-2 text-red-800 opacity-30" size={24} />
                        "{mem}"
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest">No memories recorded in this artifact.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    placeholder="Record a personal experience with this card..." 
                    className="flex-1 bg-black/50 border border-red-900/40 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none"
                  />
                  <button 
                    onClick={() => addMemoryToCard(selectedCard.id)}
                    className="p-3 bg-red-900 hover:bg-red-800 text-white rounded-xl transition-all"
                  >
                    <PlusCircle size={24} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-10">
                <div className="p-6 bg-red-950/10 rounded-3xl border border-red-900/30 shadow-inner">
                  <div className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-2">Artifact Value</div>
                  <div className="text-4xl font-black text-red-500 tracking-tighter">${selectedCard.estimatedValue.toFixed(2)}</div>
                </div>
                {selectedCard.grade && (
                  <div className="p-6 bg-red-950/10 rounded-3xl border border-red-900/30 shadow-inner">
                    <div className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-2">Ritual Grade</div>
                    <div className="text-4xl font-black text-white tracking-tighter">{selectedCard.grade.overall}<span className="text-sm opacity-40">/10</span></div>
                  </div>
                )}
              </div>

              {selectedCard.verificationHash && (
                <div className="mb-10 p-5 bg-red-950/20 rounded-3xl border border-red-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-950/60 border border-red-500/50 rounded-xl text-red-500 animate-pulse">
                      <Award size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.25em]">Verified Digital Twin</div>
                      <div className="text-[10px] sm:text-xs font-mono text-red-400 font-bold tracking-tight select-all">{selectedCard.verificationHash}</div>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1 bg-red-900/40 text-red-100 text-[8px] font-black tracking-widest rounded-full border border-red-800 uppercase">
                    On-Chain Verified
                  </span>
                </div>
              )}
              
              <div className="mb-12">
                <h4 className="text-xs font-black text-red-950 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">Mana Variance (3 Weeks)</h4>
                <PriceChart data={selectedCard.priceHistory} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Shelf Implementation */}
      <div 
        className={`fixed inset-y-0 right-0 z-[110] md:relative md:inset-auto flex transition-all duration-500 ease-in-out ${
          isChatOpen 
            ? isChatCollapsed 
              ? 'translate-x-[calc(100%-40px)] md:translate-x-[calc(100%-48px)]' 
              : 'translate-x-0'
            : 'translate-x-full'
        }`}
      >
        <button 
          onClick={() => setIsChatCollapsed(!isChatCollapsed)}
          className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2 w-12 h-24 bg-red-950/80 backdrop-blur-xl border border-red-900/60 border-r-0 rounded-l-2xl items-center justify-center text-red-500 hover:text-red-400 transition-colors shadow-[-5px_0_15px_rgba(0,0,0,0.5)] z-20 group"
        >
          {isChatCollapsed ? (
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          ) : (
            <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
          )}
        </button>

        <div className="flex flex-col bg-black md:bg-transparent h-full shadow-2xl">
          <div className="md:hidden h-16 px-6 border-b border-red-900 flex items-center justify-between bg-black">
            <h2 className="font-black text-red-50 uppercase tracking-widest">Whiro Assistant</h2>
            <button onClick={() => setIsChatOpen(false)} className="p-2 text-red-600"><X size={24} /></button>
          </div>
          <ChatInterface messages={chatMessages} onSendMessage={handleSendMessage} isLoading={isChatLoading} />
        </div>
      </div>
    </div>
  );
};

export default App;
