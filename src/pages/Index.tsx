import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminView } from '@/components/AdminView';
import { LoginForm } from '@/components/LoginForm';
import { DeveloperView } from '@/components/DeveloperView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, Shield, Zap, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type ViewType = 'home' | 'admin' | 'developer' | 'login';

const Index = () => {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<ViewType>('home');

  // Initialize view from URL parameters on component mount
  useEffect(() => {
    const viewParam = searchParams.get('view') as ViewType;
    if (viewParam && ['home', 'admin', 'developer', 'login'].includes(viewParam)) {
      setCurrentView(viewParam);
    }
  }, [searchParams]);

  // Update URL when view changes
  const updateView = (view: ViewType) => {
    setCurrentView(view);
    if (view === 'home') {
      // Remove view parameter for home
      setSearchParams({});
    } else {
      setSearchParams({ view });
    }
  };

  const handleAdminClick = () => {
    if (user) {
      updateView('admin');
    } else {
      updateView('login');
    }
  };

  const handleLogin = () => {
    updateView('admin');
  };

  const handleLogout = () => {
    updateView('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <div className="animate-fade-in">
        <div className="fixed top-4 left-4 z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateView('home')}
            className="p-2 hover:bg-primary/10 transition-colors hover-scale"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Button>
        </div>
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <div className="container mx-auto mobile-optimized py-6 max-w-5xl">
        <AdminView onLogout={handleLogout} onBack={() => updateView('home')} />
      </div>
    );
  }

  if (currentView === 'developer') {
    return (
      <div className="animate-fade-in">
        <div className="fixed top-4 left-4 z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateView('home')}
            className="p-2 hover:bg-primary/10 transition-colors hover-scale"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Button>
        </div>
        <DeveloperView />
      </div>
    );
  }

  // Home view - Freelancing themed
  return (
    <div className="min-h-screen mesh-bg animate-fade-in">
      <div className="container mx-auto mobile-optimized py-8 lg:py-12">
        {/* Hero Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="float-animation mb-8">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-6 overflow-hidden">
              <img 
                src="/growvo.png" 
                alt="Growvo Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          
          <h1 className="brand-logo gradient-text text-4xl md:text-5xl lg:text-6xl mb-4">
            Growvo
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground/90 mb-4">
            Freelancer Project Access Portal
          </p>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Secure project code management for freelancers and clients. Generate temporary access codes with enterprise-grade security.
          </p>
        </div>

        {/* Features Grid */}
        <div className="responsive-grid mb-12 lg:mb-16">
          <Card className="card-feature text-center">
            <CardHeader>
              <div className="mx-auto mb-4 p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Shield className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-heading">Client Portal</CardTitle>
              <p className="text-muted-foreground text-sm md:text-base">
                Generate secure project access codes and manage GitHub repositories for your freelancers
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleAdminClick}
                className="w-full btn-primary text-sm md:text-base hover-scale"
              >
                <Settings className="h-4 w-4 mr-2" />
                Access Client Portal
              </Button>
            </CardContent>
          </Card>

          <Card className="card-feature text-center">
            <CardHeader>
              <div className="mx-auto mb-4 p-4 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Users className="h-8 w-8 md:h-10 md:w-10 text-accent" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-heading">Freelancer Access</CardTitle>
              <p className="text-muted-foreground text-sm md:text-base">
                Enter your project code to access client resources and GitHub analytics
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => updateView('developer')}
                className="w-full btn-secondary text-sm md:text-base hover-scale"
                variant="outline"
              >
                <Users className="h-4 w-4 mr-2" />
                Enter Project Code
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <Card className="card-glass mb-8 lg:mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-heading gradient-text">
              Why Choose Growvo?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Lock, title: "Secure Access", desc: "Enterprise-grade security for project protection" },
                { icon: Zap, title: "Instant Setup", desc: "Generate codes in seconds, no complex setup" },
                { icon: CheckCircle, title: "Time-Limited", desc: "Auto-expiring codes for enhanced security" },
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="card-glass">
          <CardContent className="p-4 md:p-6 text-center">
            <p className="text-sm md:text-base text-muted-foreground">
              <span className="gradient-accent font-semibold">Growvo</span> • Secure Freelancer-Client Collaboration • GitHub Integration • 2-Day Code Expiry • Mobile Optimized
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
