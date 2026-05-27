
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PricePoint } from '../types';

interface PriceChartProps {
  data: PricePoint[];
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-black rounded-xl border border-dashed border-red-950">
        <p className="text-red-950 text-xs font-bold uppercase tracking-widest">No Mana Flow Data</p>
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#991b1b" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#991b1b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#450a0a" vertical={false} />
          <XAxis 
            dataKey="date" 
            hide={true}
          />
          <YAxis 
            stroke="#7f1d1d" 
            fontSize={10} 
            tickFormatter={(val) => `$${val}`} 
            width={35}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000000', borderColor: '#7f1d1d', borderRadius: '8px', fontSize: '10px' }}
            itemStyle={{ color: '#ef4444' }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#ef4444" 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
