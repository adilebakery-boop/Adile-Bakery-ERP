import { Plus, Edit2, Trash2 } from 'lucide-react';

const products = [
  { id: 1, name: 'White Bread', category: 'Bread', price: 35, unit: 'Piece', image: '🍞' },
  { id: 2, name: 'Whole Wheat', category: 'Bread', price: 40, unit: 'Piece', image: '🍞' },
  { id: 3, name: 'Sourdough', category: 'Bread', price: 55, unit: 'Piece', image: '🥖' },
  { id: 4, name: 'Chocolate Cake', category: 'Cake', price: 250, unit: 'Piece', image: '🎂' },
  { id: 5, name: 'Vanilla Cake', category: 'Cake', price: 220, unit: 'Piece', image: '🎂' },
];

export default function ProductsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F]">Products</h1>
        <button className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Image</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Price (ETB)</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-[#F9F7F2]">
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 bg-[#F9F7F2] rounded-lg flex items-center justify-center text-xl">
                      {product.image}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{product.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      product.category === 'Bread' 
                        ? 'bg-[#D2B48C]/20 text-[#D2B48C]' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#D2B48C]">{product.price} ETB</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.unit}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-[#001F3F] hover:bg-[#F9F7F2] rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}