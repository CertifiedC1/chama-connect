import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Page Not Found - Chama App</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
        
        {/* Open Graph */}
        <meta property="og:title" content="Page Not Found - Chama App" />
        <meta property="og:description" content="The page you're looking for doesn't exist." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://id-preview--99668365-71ff-4751-a51d-83f3b05f728c.lovable.app/og-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Page Not Found - Chama App" />
        <meta name="twitter:description" content="The page you're looking for doesn't exist." />
        <meta name="twitter:image" content="https://id-preview--99668365-71ff-4751-a51d-83f3b05f728c.lovable.app/og-image.png" />
      </Helmet>
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
      </div>
    </>
  );
};

export default NotFound;
