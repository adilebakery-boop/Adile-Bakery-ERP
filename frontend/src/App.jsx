import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './routes';

function App() {
  useEffect(() => {
    // Apply dark mode on app load
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return <RouterProvider router={router} />;
}

export default App;