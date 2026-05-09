import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-[24px] w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#E5E1D8]">
          <h2 className="text-xl font-semibold text-[#001F3F]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-[#001F3F] hover:bg-[#F9F7F2] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}