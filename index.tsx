import React from 'react';
import ReactDOM from 'react-dom/client'; // Notice the /client import for hydrateRoot
import App from './App'; // Adjust the path to your main App component

// Get the root element where your app is mounted
const rootElement = document.getElementById('root');

if (rootElement) {
  // Use hydrateRoot for SSR to attach event listeners to the pre-rendered HTML
  ReactDOM.hydrateRoot(
    rootElement,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error(
    'Root element not found. Make sure an element with id="root" exists in your index.html.'
  );
}
