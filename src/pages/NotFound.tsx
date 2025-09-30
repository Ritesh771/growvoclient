import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="text-center max-w-md mx-auto">
        <h1 className="mb-4 text-6xl md:text-8xl font-bold text-gray-800">404</h1>
        <p className="mb-4 text-lg md:text-xl text-gray-600">Oops! Page not found</p>
        <a href="/" className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm md:text-base">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
