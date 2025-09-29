import React from 'react';
import { GitHubDashboard } from './GitHubDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';

export const DeveloperView: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-blue-400" />
              Client Portal
            </CardTitle>
            <CardDescription className="text-white/70 text-lg">
              Track and analyze your GitHub repository commits
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
          <GitHubDashboard />
        </div>
      </div>
    </div>
  );
};