import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Copy, Trash2, Clock, LogOut, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectCodes } from '@/hooks/useProjectCodes';

interface AdminViewProps {
  onLogout: () => void;
  onBack: () => void;
}

export const AdminView = ({ onLogout, onBack }: AdminViewProps) => {
  const { signOut } = useAuth();
  const { codes, loading, activeCode, generateCode, invalidateCode } = useProjectCodes();
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Update countdown timer
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

    return () => clearInterval(interval);
  }, [activeCode]);

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
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="brand-logo gradient-text text-2xl md:text-3xl">Growvo Client Portal</CardTitle>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">Manage freelancer project access codes</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="self-start sm:self-auto hover-scale">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </CardHeader>
      </Card>

      {/* Current Code Section */}
      <Card className="card-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl font-heading">
            <Clock className="h-5 w-5 md:h-6 md:w-6" />
            Active Project Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeCode ? (
            <>
              <div className="code-display gradient-text animate-scale-in">
                {activeCode.code}
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
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          Used: {code.used_count}
                        </span>
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
    </div>
  );
};