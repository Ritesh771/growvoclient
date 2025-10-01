import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Copy, Trash2, Clock, LogOut, Zap, ArrowLeft, GitBranch, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectCodes } from '@/hooks/useProjectCodes';
import { supabase } from '@/integrations/supabase/client';
import { GitHubDashboard } from './GitHubDashboard';
import { CodeUsageAnalytics } from './CodeUsageAnalytics';
import { RecentActivity } from './RecentActivity';

interface AdminViewProps {
  onLogout: () => void;
  onBack: () => void;
}

export const AdminView = ({ onLogout, onBack }: AdminViewProps) => {
  const { signOut } = useAuth();
  const { codes, loading, activeCode, generateCode, invalidateCode } = useProjectCodes();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [usageStats, setUsageStats] = useState({
    totalFreelancers: 0,
    totalAccess: 0,
    activeCodes: 0
  });

  const loadUsageStats = async () => {
    try {
      if (codes.length === 0) {
        setUsageStats({ totalFreelancers: 0, totalAccess: 0, activeCodes: 0 });
        return;
      }

      const codeIds = codes.map(code => code.id);
      const { data: verifications } = await supabase
        .from('otp_verifications')
        .select('freelancer_identifier, code_id')
        .in('code_id', codeIds);

      const uniqueFreelancers = new Set(
        verifications
          ?.filter(v => v.freelancer_identifier)
          .map(v => v.freelancer_identifier.toLowerCase().trim()) || []
      ).size;

      const totalAccess = verifications?.length || 0;
      const activeCodes = codes.filter(code => 
        code.is_active && new Date(code.expires_at) > new Date()
      ).length;

      setUsageStats({
        totalFreelancers: uniqueFreelancers,
        totalAccess,
        activeCodes
      });
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  // Set up real-time notifications for new freelancer access
  useEffect(() => {
    const channel = supabase
      .channel('otp_verifications_admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'otp_verifications'
        },
        (payload) => {
          const verification = payload.new;
          if (verification.freelancer_identifier) {
            toast({
              title: "🎉 New Freelancer Access",
              description: `${verification.freelancer_identifier} just accessed your project!`,
              duration: 5000,
            });
            
            // Reload stats to update the overview
            loadUsageStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update countdown timer and load usage stats
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeCode) {
        const now = new Date();
        const expiresAt = new Date(activeCode.expires_at);
        const timeRemaining = expiresAt.getTime() - now.getTime();
        
        if (timeRemaining <= 0) {
          setTimeLeft('Expired');
          return;
        }

        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft('');
      }
    }, 1000);

    // Load usage statistics
    loadUsageStats();

    return () => clearInterval(interval);
  }, [activeCode, codes]);

  const handleGenerateCode = async () => {
    await generateCode();
  };

  const handleCopyCode = async () => {
    if (activeCode) {
      try {
        await navigator.clipboard.writeText(activeCode.code);
        toast({
          title: "Copied!",
          description: "Code copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Could not copy to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const handleInvalidateCode = async () => {
    if (activeCode) {
      await invalidateCode(activeCode.id);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      {/* Header */}
      <Card className="card-glass">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="p-2 hover:bg-primary/10 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Button>
              <div className="p-2 rounded-lg bg-primary/10 overflow-hidden">
                <img 
                  src="/growvo.png" 
                  alt="Growvo Logo" 
                  className="h-6 w-6 object-contain"
                />
              </div>
              <CardTitle className="brand-logo gradient-text text-2xl md:text-3xl">Growvo Client Portal</CardTitle>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">Manage freelancer project access and GitHub repositories</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="self-start sm:self-auto hover-scale">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </CardHeader>
      </Card>

      {/* Quick Stats Overview */}
      <Card className="card-glass">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-primary">{codes.length}</p>
              <p className="text-xs text-muted-foreground">Total Codes</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-success">{usageStats.activeCodes}</p>
              <p className="text-xs text-muted-foreground">Active Codes</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-accent">{usageStats.totalFreelancers}</p>
              <p className="text-xs text-muted-foreground">Freelancers</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-warning">{usageStats.totalAccess}</p>
              <p className="text-xs text-muted-foreground">Total Access</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <RecentActivity codes={codes} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="codes" className="space-y-6">
         <div className="flex flex-col gap-4">
           <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1">
          <TabsTrigger value="codes" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            Access Codes
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            Usage Analytics
          </TabsTrigger>
          <TabsTrigger value="github" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2">
            <GitBranch className="h-3 w-3 sm:h-4 sm:w-4" />
            GitHub Integration
          </TabsTrigger>
        </TabsList>
          </div>

        <TabsContent value="codes" className="space-y-6">
          {/* Current Code Section */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl font-heading">
                <Clock className="h-5 w-5 md:h-6 md:w-6" />
                Active Project Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 overflow-x-hidden">
                 {activeCode ? (
                <>
                  <div className="relative">
                    <div className="code-display break-words text-center">
                      <span className="relative z-10 text-primary font-mono font-black text-4xl sm:text-5xl md:text-6xl tracking-widest">
                        {activeCode.code}
                          </span>
                        </div>
                          <div className="absolute -top-1 right-2 px-3 py-1 bg-success text-success-foreground text-xs font-medium rounded-full shadow-lg animate-pulse">
                      Active
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground mb-4">
                    Share this 6-digit code with your freelancer to grant project access
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="countdown-badge">
                      <Clock className="h-4 w-4" />
                      Expires in: {timeLeft}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={handleCopyCode} className="btn-primary hover-scale">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                      <Button variant="destructive" onClick={handleInvalidateCode} className="hover-scale">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Expire Now
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 lg:py-12 animate-fade-in">
                  <div className="mb-6">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 float-animation">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-6 text-sm md:text-base">No active project code</p>
                  </div>
                  <Button 
                    onClick={handleGenerateCode} 
                    className="btn-primary hover-scale" 
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Generate New Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Code History */}
          {codes.length > 0 && (
            <Card className="card-glass animate-fade-in">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-heading">Recent Codes</CardTitle>
                <p className="text-muted-foreground text-sm">History of generated project access codes</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {codes.slice(0, 5).map((code, index) => {
                    const now = new Date();
                    const expiresAt = new Date(code.expires_at);
                    const isExpired = expiresAt <= now || !code.is_active;

                    return (
                      <div
                        key={code.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02]"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono font-bold text-lg text-primary">{code.code}</span>
                            {isExpired ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive animate-pulse">
                                Expired
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                                Active
                              </span>
                            )}
                          
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Generated: {formatDate(code.generated_at)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {formatDate(code.expires_at)}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {!isExpired && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => invalidateCode(code.id)}
                              className="hover-scale text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Expire
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl font-heading">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
                Code Usage Analytics
              </CardTitle>
              <p className="text-muted-foreground text-sm md:text-base">
                Comprehensive insights into how your project codes are being used by freelancers.
              </p>
            </CardHeader>
            <CardContent>
              <CodeUsageAnalytics codes={codes} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-6">
          <Card className="card-glass">
            <CardHeader>
              
              
            </CardHeader>
            <CardContent>
              <GitHubDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};