import { useEffect } from 'react';
import { redirectToSomethingX } from '../config/redirectUrls';

export default function SharedProfileRedirect() {
  useEffect(() => {
    redirectToSomethingX('/profile-builder');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-12 w-12 rounded-full border-4 border-gray-200 border-t-gray-400"></div>
        <p className="mt-4 text-gray-500 text-sm font-medium">Opening your shared profile page...</p>
      </div>
    </div>
  );
}
