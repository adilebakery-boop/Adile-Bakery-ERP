import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
import { ErrorBoundary } from './components/ui';
import QueryProvider from './providers/QueryProvider';

function App() {
  useEffect(() => {
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;