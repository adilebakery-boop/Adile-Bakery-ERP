import { useState } from 'react';
import { Save } from 'lucide-react';

const productsByCategory = {
  Bread: ['White Bread', 'Whole Wheat', 'Sourdough', 'Baguette', 'Rye Bread'],
  Cake: ['Chocolate Cake', 'Vanilla Cake', 'Red Velvet', 'Carrot Cake', 'Cheesecake'],
  Fetir: ['Plain Fetir', 'Cheese Fetir', 'Butter Fetir', 'Honey Fetir']
};

export default function RemainingPage() {
  const [remaining, setRemaining] = useState({});

  const handleQuantityChange = (product, value) => {
    setRemaining({ ...remaining, [product]: value });
  };

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F]">Remaining Stock</h1>
      </div>

      {Object.entries(productsByCategory).map(([category, products]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-bold text-[#001F3F] mb-4">{category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <div key={product} className="bg-white p-5 rounded-[24px] border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
                <p className="text-sm text-gray-500 mb-3">{product}</p>
                <input
                  type="number"
                  value={remaining[product] || ''}
                  onChange={(e) => handleQuantityChange(product, e.target.value)}
                  className="w-full px-4 py-4 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-3xl font-bold text-center text-[#001F3F]"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save Button Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E1D8] p-4 lg:left-72">
        <div className="max-w-7xl mx-auto flex justify-end">
          <button className="px-8 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Remaining
          </button>
        </div>
      </div>
    </div>
  );
}