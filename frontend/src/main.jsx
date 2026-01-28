import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Calculate basename synchronously before React renders
// This ensures React Router gets the correct basename
const getBasename = () => {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;
  
  // If accessed directly on Jobs app port (localhost:2003, localhost:5173, etc.), no basename needed
  // If accessed through gateway/sub-path (localhost:3000/jobs, etc.), use /jobs as basename
  if (pathname.startsWith('/jobs')) {
    return '/jobs';
  }
  
  // Check for production path pattern like /i5h0t1r1a2a2s.com/jobs/
  const jobsIndex = pathname.indexOf('/jobs');
  if (jobsIndex > 0) {
    // Production path with prefix - extract everything up to and including /jobs
    return pathname.substring(0, jobsIndex + 5); // +5 for '/jobs'
  }
  
  // Default: no basename (direct access to Jobs app)
  return '/';
};

// Store basename in a way that App can access it
window.__JOBS_BASENAME__ = getBasename();
console.log('[Jobs App] Detected basename:', window.__JOBS_BASENAME__, 'for pathname:', window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

