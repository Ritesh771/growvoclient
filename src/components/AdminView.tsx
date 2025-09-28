import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Copy, Trash2, Clock, LogOut, Zap, ArrowLeft } from 'lucide-react';

interface CodeEntry {
  code: string;
  generated: number;
  expiry: number;
}

interface AdminViewProps {
  onLogout: () => void;
  onBack: () => void;
}

export const AdminView = ({ onLogout, onBack }: AdminViewProps) => {
  const [currentCode, setCurrentCode] = useState<CodeEntry | null>(null);
  const [codeHistory, setCodeHistory] = useState<CodeEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    loadStoredData();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStoredData = () => {
    const storedCode = localStorage.getItem('trackingCode');
    const storedHistory = localStorage.getItem('codeHistory');

    if (storedCode) {
      const codeData = JSON.parse(storedCode);
      if (codeData.expiry > Date.now()) {
        setCurrentCode(codeData);
      } else {
        localStorage.removeItem('trackingCode');
      }
    }

    if (storedHistory) {
      setCodeHistory(JSON.parse(storedHistory));
    }
  };

  const updateCountdown = () => {
    if (currentCode) {
      const now = Date.now();
      const timeRemaining = currentCode.expiry - now;
      
      if (timeRemaining <= 0) {
        setCurrentCode(null);
        setTimeLeft('');
        localStorage.removeItem('trackingCode');
        return;
      }

      const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    }
  };

  const generateCode = () => {
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const generated = Date.now();
    const expiry = generated + (2 * 24 * 60 * 60 * 1000); // 2 days

    const codeEntry: CodeEntry = { code, generated, expiry };
    
    setCurrentCode(codeEntry);
    localStorage.setItem('trackingCode', JSON.stringify(codeEntry));

    // Add to history
    const updatedHistory = [codeEntry, ...codeHistory].slice(0, 10); // Keep last 10
    setCodeHistory(updatedHistory);
    localStorage.setItem('codeHistory', JSON.stringify(updatedHistory));

    toast({
      title: "Code Generated",
      description: `New tracking code: ${code}`,
    });
  };

  const copyCode = async () => {
    if (currentCode) {
      try {
        await navigator.clipboard.writeText(currentCode.code);
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

  const invalidateCode = () => {
    setCurrentCode(null);
    setTimeLeft('');
    localStorage.removeItem('trackingCode');
    toast({
      title: "Code Invalidated",
      description: "Current tracking code has been expired",
    });
  };

  const expireIndividualCode = (codeToExpire: string) => {
    const updatedHistory = codeHistory.map(entry => 
      entry.code === codeToExpire 
        ? { ...entry, expiry: Date.now() - 1 } 
        : entry
    );
    setCodeHistory(updatedHistory);
    localStorage.setItem('codeHistory', JSON.stringify(updatedHistory));
    
    // If the current code is being expired, clear it
    if (currentCode?.code === codeToExpire) {
      setCurrentCode(null);
      setTimeLeft('');
      localStorage.removeItem('trackingCode');
    }
    
    toast({
      title: "Code Expired",
      description: `Code ${codeToExpire} has been expired`,
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
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
          <Button variant="outline" onClick={onLogout} className="self-start sm:self-auto hover-scale">
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
          {currentCode ? (
            <>
              <div className="code-display gradient-text animate-scale-in">
                {currentCode.code}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="countdown-badge">
                  <Clock className="h-4 w-4" />
                  Expires in: {timeLeft}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={copyCode} className="btn-primary hover-scale">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button variant="destructive" onClick={invalidateCode} className="hover-scale">
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
              <Button onClick={generateCode} className="btn-primary hover-scale" size="lg">
                <Zap className="h-4 w-4 mr-2" />
                Generate New Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code History */}
      {codeHistory.length > 0 && (
        <Card className="card-glass animate-fade-in">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl font-heading">Recent Codes</CardTitle>
            <p className="text-muted-foreground text-sm">History of generated project access codes</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {codeHistory.slice(0, 5).map((entry, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-lg text-primary">{entry.code}</span>
                      {entry.expiry < Date.now() && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive animate-pulse">
                          Expired
                        </span>
                      )}
                      {entry.expiry > Date.now() && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Generated: {formatDate(entry.generated)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {formatDate(entry.expiry)}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {entry.expiry > Date.now() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => expireIndividualCode(entry.code)}
                        className="hover-scale text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Expire
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};