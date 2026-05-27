
import React from 'react';
import { Card as CardType } from '../types';
import { ChevronRight } from 'lucide-react';

interface InventoryProps {
  cards: CardType[];
  onSelectCard: (card: CardType) => void;
}

const Inventory: React.FC<InventoryProps> = ({ cards, onSelectCard }) => {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-red-800/40">
        <div className="w-20 h-20 rounded-full bg-black border-2 border-dashed border-red-900/30 flex items-center justify-center mb-6">
          <ChevronRight size={32} className="rotate-90 text-red-950" />
        </div>
        <p className="font-black uppercase tracking-[0.2em] text-sm">The Den is empty.</p>
        <p className="text-xs mt-2 text-slate-600 font-bold uppercase">Begin the scanning ritual.</p>
      </div>
    );
  }

  const getConditionColor = (cond: string) => {
    switch (cond) {
      case 'Mint': return 'text-white border-red-400 bg-red-700 shadow-[0_0_8px_rgba(185,28,28,0.5)]';
      case 'Near Mint': return 'text-red-100 border-red-600 bg-red-900/80';
      default: return 'text-slate-300 border-white/20 bg-white/5';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
      {cards.map((card) => (
        <div 
          key={card.id}
          onClick={() => onSelectCard(card)}
          className="group relative bg-black/40 backdrop-blur-md border border-red-900/30 rounded-[2.5rem] overflow-hidden hover:border-red-600/80 transition-all duration-500 cursor-pointer shadow-2xl hover:shadow-[0_0_30px_rgba(153,27,27,0.3)]"
        >
          <div className="aspect-[2.5/3.5] relative overflow-hidden bg-black/20">
            <img 
              src={card.imageUrl} 
              alt={card.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 brightness-90 group-hover:brightness-110"
            />
            
            {card.verificationHash && (
              <div className="absolute top-4 left-4 p-2 bg-black/85 backdrop-blur-md rounded-xl text-red-500 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.4)]" title="Verified Digital Twin">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            )}

            <div className="absolute top-4 right-4 flex flex-col items-end gap-2.5">
              <span className="px-3 py-1 bg-black/90 backdrop-blur-md rounded-full text-[10px] font-black text-red-500 border border-red-800/50 tracking-widest">
                #{card.cardNumber}
              </span>
              <span className={`px-3 py-1 backdrop-blur-md rounded-full text-[9px] font-black border tracking-widest uppercase ${getConditionColor(card.condition)}`}>
                {card.condition}
              </span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black 10% via-transparent to-transparent opacity-90"></div>
            <div className="absolute bottom-5 left-6 right-6">
              <div className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-red-500 transition-colors leading-tight">{card.name}</div>
              <div className="text-[10px] text-white/60 font-black uppercase tracking-widest mt-1">{card.setName}</div>
            </div>
          </div>
          
          <div className="p-5 flex items-center justify-between border-t border-red-900/20 bg-black/60">
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white font-black mb-1 opacity-50">Artifact Mana</div>
              <div className="text-2xl font-black text-red-500 tracking-tighter">${card.estimatedValue.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-red-950/20 text-red-700 group-hover:bg-red-700 group-hover:text-white transition-all duration-300 border border-red-900/30">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Inventory;