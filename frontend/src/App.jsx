import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
import { ErrorBoundary } from './components/ui';

function App() {
  useEffect(() => {
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;