export default function Skeleton({ className = '', variant = 'text' }) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'h-4 rounded',
    title: 'h-8 w-3/4 rounded',
    avatar: 'h-12 w-12 rounded-full',
    thumbnail: 'h-20 w-20 rounded-lg',
    card: 'h-32 rounded-2xl',
    button: 'h-10 w-24 rounded-xl',
    input: 'h-12 rounded-xl',
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ 
        background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}