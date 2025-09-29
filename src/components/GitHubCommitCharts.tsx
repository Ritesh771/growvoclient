import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface Repository {
  id: string;
  owner: string;
  repo: string;
}

interface Commit {
  commit_date: string;
  enhanced_category: string;
  author_name: string;
}

interface GitHubCommitChartsProps {
  repositories: Repository[];
}

export const GitHubCommitCharts: React.FC<GitHubCommitChartsProps> = ({ repositories }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [authorData, setAuthorData] = useState<any[]>([]);

  useEffect(() => {
    if (repositories.length > 0) {
      loadAllCommits();
    }
  }, [repositories]);

  useEffect(() => {
    if (commits.length > 0) {
      processChartData();
    }
  }, [commits]);

  const loadAllCommits = async () => {
    try {
      const repoIds = repositories.map(repo => repo.id);
      const { data, error } = await supabase
        .from('github_commits')
        .select('commit_date, enhanced_category, author_name')
        .in('repo_id', repoIds)
        .order('commit_date', { ascending: false });

      if (error) {
        throw error;
      }

      setCommits(data || []);
    } catch (error) {
      console.error('Error loading commits for charts:', error);
    }
  };

  const processChartData = () => {
    // Process weekly commits
    const weeklyCommits: { [key: string]: number } = {};
    const categoryCommits: { [key: string]: number } = {};
    const authorCommits: { [key: string]: number } = {};

    commits.forEach(commit => {
      // Weekly data - get start of week
      const date = new Date(commit.commit_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklyCommits[weekKey] = (weeklyCommits[weekKey] || 0) + 1;

      // Category data
      categoryCommits[commit.enhanced_category] = (categoryCommits[commit.enhanced_category] || 0) + 1;

      // Author data
      authorCommits[commit.author_name] = (authorCommits[commit.author_name] || 0) + 1;
    });

    // Convert to chart format
    const weekly = Object.entries(weeklyCommits)
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        commits: count,
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
      .slice(-8); // Last 8 weeks

    const categories = Object.entries(categoryCommits)
      .map(([category, count]) => ({
        name: category,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);

    const authors = Object.entries(authorCommits)
      .map(([author, count]) => ({
        author: author.length > 15 ? author.substring(0, 15) + '...' : author,
        commits: count,
      }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10); // Top 10 authors

    setWeeklyData(weekly);
    setCategoryData(categories);
    setAuthorData(authors);
  };

  const COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // yellow
    '#ec4899', // pink
    '#6b7280', // gray
    '#14b8a6', // teal
  ];

  if (repositories.length === 0 || commits.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No commit data available</p>
          <p className="text-sm text-muted-foreground">Add repositories and fetch commits to see charts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Commits Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Commits
          </CardTitle>
          <CardDescription>
            Commits per week over the last 8 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="commits" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Commit Categories Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Commit Categories
          </CardTitle>
          <CardDescription>
            Distribution of commit types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Authors Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Contributors
          </CardTitle>
          <CardDescription>
            Most active contributors by commit count
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={authorData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="author" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="commits" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};