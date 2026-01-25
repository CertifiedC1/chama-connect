import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Users, Wallet, Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Chama App - Home</title>
        <meta name="description" content="Manage your Chama savings group with M-Pesa integration. Track contributions, handle loans, and integrate seamlessly with M-Pesa." />
        
        {/* Open Graph */}
        <meta property="og:title" content="Chama App - Manage Your Savings Group" />
        <meta property="og:description" content="The all-in-one platform for managing your Chama savings group. Track contributions, handle loans, and integrate seamlessly with M-Pesa." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://id-preview--99668365-71ff-4751-a51d-83f3b05f728c.lovable.app/og-image.png" />
        <meta property="og:url" content="/" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Chama App - Manage Your Savings Group" />
        <meta name="twitter:description" content="The all-in-one platform for managing your Chama savings group with M-Pesa integration." />
        <meta name="twitter:image" content="https://id-preview--99668365-71ff-4751-a51d-83f3b05f728c.lovable.app/og-image.png" />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-lg font-bold text-primary-foreground">C</span>
            </div>
            <span className="font-bold text-xl text-foreground">Chama App</span>
          </div>
          
          <Button onClick={() => navigate('/auth')} variant="outline">
            Sign In
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-accent/50 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            M-Pesa Integrated
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Manage Your <span className="text-primary">Chama</span> With Ease
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The all-in-one platform for managing your savings group. Track contributions, 
            handle loans, and integrate seamlessly with M-Pesa.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="h-12 px-8 text-base font-medium"
              onClick={() => navigate('/auth?mode=signup')}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-12 px-8 text-base"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto">
          <div className="bg-card border rounded-2xl p-6 text-center hover:shadow-lg transition-shadow animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">M-Pesa Payments</h3>
            <p className="text-sm text-muted-foreground">
              Accept contributions directly via M-Pesa with automatic tracking
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-6 text-center hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Member Management</h3>
            <p className="text-sm text-muted-foreground">
              Easily add, manage, and track all your Chama members
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-6 text-center hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Secure & Reliable</h3>
            <p className="text-sm text-muted-foreground">
              Bank-grade security for all your financial data
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <p className="text-center text-sm text-muted-foreground">
          © 2024 Chama App. All rights reserved.
        </p>
      </footer>
      </div>
    </>
  );
}
