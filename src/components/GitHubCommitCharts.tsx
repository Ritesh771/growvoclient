import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BarChart3, PieChart as PieChartIcon, RefreshCw, Users, Filter } from 'lucide-react';

interface WeeklyData {
  week: string;
  commits: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface AuthorData {
  author: string;
  commits: number;
}

interface AuthorTimelineData {
  week: string;
  [key: string]: string | number; // Dynamic keys for each author
}

interface Repository {
  id: string;
  owner: string;
  repo: string;
}

interface CommitWithRepo extends Commit {
  repo_id: string;
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
  const [allCommits, setAllCommits] = useState<CommitWithRepo[]>([]);
  const [filteredCommits, setFilteredCommits] = useState<CommitWithRepo[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [authorData, setAuthorData] = useState<AuthorData[]>([]);
  const [authorTimelineData, setAuthorTimelineData] = useState<AuthorTimelineData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCommits, setFetchingCommits] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>('all');

  useEffect(() => {
    if (repositories.length > 0) {
      loadAllCommits();
      // Set default selected repo to the first one if only one repo, otherwise keep 'all'
      if (repositories.length === 1 && selectedRepo === 'all') {
        setSelectedRepo(repositories[0].id);
      }
    } else {
      // Clear data when no repositories
      setAllCommits([]);
      setFilteredCommits([]);
      setWeeklyData([]);
      setCategoryData([]);
      setAuthorData([]);
      setSelectedRepo('all');
    }
  }, [repositories]);

  useEffect(() => {
    filterCommits();
  }, [allCommits, selectedRepo]);

  useEffect(() => {
    if (filteredCommits.length > 0) {
      processChartData();
    } else {
      // Clear chart data when no commits
      setWeeklyData([]);
      setCategoryData([]);
      setAuthorData([]);
      setAuthorTimelineData([]);
    }
  }, [filteredCommits]);

  const filterCommits = () => {
    if (selectedRepo === 'all') {
      setFilteredCommits(allCommits);
    } else {
      const filtered = allCommits.filter(commit => commit.repo_id === selectedRepo);
      setFilteredCommits(filtered);
    }
  };

  const loadAllCommits = async () => {
    try {
      setLoading(true);
      const repoIds = repositories.map(repo => repo.id);
      const { data, error } = await supabase
        .from('github_commits')
        .select('commit_date, enhanced_category, author_name, repo_id')
        .in('repo_id', repoIds)
        .order('commit_date', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Loaded commits:', data?.length || 0);
      setAllCommits(data || []);
    } catch (error) {
      console.error('Error loading commits for charts:', error);
      toast({
        title: "Error loading commit data",
        description: "Failed to load commits for analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCommitsFromGitHub = async () => {
    try {
      setFetchingCommits(true);
      
      for (const repo of repositories) {
        const { data, error } = await supabase.functions.invoke('github-integration', {
          body: {
            action: 'fetch-commits',
            repoId: repo.id,
          },
        });

        if (error) {
          throw error;
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch commits');
        }
      }

      toast({
        title: "Commits updated!",
        description: "Successfully fetched latest commits from GitHub",
      });

      // Reload commits after fetching
      await loadAllCommits();
    } catch (error) {
      console.error('Error fetching commits from GitHub:', error);
      toast({
        title: "Error fetching commits",
        description: "Failed to fetch commits from GitHub. Please try again.",
        variant: "destructive",
      });
    } finally {
      setFetchingCommits(false);
    }
  };

  const processChartData = () => {
    // Process daily commits (not weekly)
    const dailyCommits: { [key: string]: number } = {};
    const categoryCommits: { [key: string]: number } = {};
    const authorCommits: { [key: string]: number } = {};
    const authorDailyCommits: { [key: string]: { [key: string]: number } } = {};

    filteredCommits.forEach(commit => {
      // Daily data - use actual commit date
      const date = new Date(commit.commit_date);
      
      // Use the actual date (not week start)
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      dailyCommits[dateKey] = (dailyCommits[dateKey] || 0) + 1;

      // Category data
      const category = commit.enhanced_category || 'Other';
      categoryCommits[category] = (categoryCommits[category] || 0) + 1;

      // Author data
      const author = commit.author_name || 'Unknown';
      authorCommits[author] = (authorCommits[author] || 0) + 1;
      
      // Author daily data for timeline
      if (!authorDailyCommits[dateKey]) {
        authorDailyCommits[dateKey] = {};
      }
      authorDailyCommits[dateKey][author] = (authorDailyCommits[dateKey][author] || 0) + 1;
    });

    // Convert to chart format with actual commit dates
    const daily = Object.entries(dailyCommits)
      .map(([dateStr, count]) => {
        const date = new Date(dateStr);
        // Format as "Sep 27" (showing actual commit date)
        const dateLabel = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        });
        return {
          week: dateLabel, // Keep 'week' as key for chart compatibility
          commits: count,
          dateStr: dateStr // Keep for sorting
        };
      })
      .sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime())
      .slice(-10) // Last 10 days
      .map(({ week, commits }) => ({ week, commits })); // Remove dateStr for final data

    const categories = Object.entries(categoryCommits)
      .map(([category, count]) => ({
        name: category,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);

    const authors = Object.entries(authorCommits)
      .map(([author, count]) => ({
        author: author && author.trim() ? 
          (author.length > 20 ? author.substring(0, 20) + '...' : author) : 
          'Unknown',
        commits: count,
      }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10); // Top 10 authors

    // Create author timeline data with cumulative commits (competition style)
    const authorNames = Object.keys(authorCommits).slice(0, 6); // Top 6 authors for line chart
    const sortedDates = Object.keys(authorDailyCommits).sort().slice(-10); // Last 10 days
    
    // Initialize cumulative counters for each author
    const cumulativeCounts: { [key: string]: number } = {};
    authorNames.forEach(author => {
      cumulativeCounts[author] = 0;
    });
    
    const authorTimeline = sortedDates.map(dateKey => {
      const date = new Date(dateKey);
      const weekData: AuthorTimelineData = {
        week: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
      
      // Add today's commits to cumulative total for each author
      authorNames.forEach(author => {
        const todayCommits = authorDailyCommits[dateKey]?.[author] || 0;
        cumulativeCounts[author] += todayCommits;
        weekData[author] = cumulativeCounts[author]; // Use cumulative count
      });
      
      return weekData;
    });

    console.log('Raw commit dates sample:', filteredCommits.slice(0, 3).map(c => ({ date: c.commit_date, parsed: new Date(c.commit_date).toLocaleDateString() }))); // Debug log
    console.log('Daily commits breakdown:', dailyCommits); // Debug log
    console.log('Author data:', authors); // Debug log
    console.log('Filtered commits:', filteredCommits.length); // Debug log
    console.log('Daily commits data:', daily); // Debug log
    console.log('Author timeline:', authorTimeline); // Debug log

    setWeeklyData(daily);
    setCategoryData(categories);
    setAuthorData(authors);
    setAuthorTimelineData(authorTimeline);
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

  const LINE_COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // yellow
    '#ec4899', // pink
  ];

  if (repositories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No repositories added</p>
          <p className="text-sm text-muted-foreground">Add a GitHub repository to see commit analytics</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-medium text-muted-foreground">Loading commit data...</p>
        </CardContent>
      </Card>
    );
  }

  if (allCommits.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground mb-2">No commit data available</p>
            <p className="text-sm text-muted-foreground mb-4">
              Fetch commits from your GitHub repositories to see analytics
            </p>
          </div>
          <Button 
            onClick={fetchCommitsFromGitHub} 
            disabled={fetchingCommits}
            className="btn-primary"
          >
            {fetchingCommits ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Fetching Commits...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Fetch Commits from GitHub
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Repository Filter and Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">Commit Analytics</h3>
            <p className="text-sm text-muted-foreground">
              {filteredCommits.length} commits 
              {selectedRepo === 'all' 
                ? `from ${repositories.length} repositories` 
                : `from ${repositories.find(r => r.id === selectedRepo)?.owner}/${repositories.find(r => r.id === selectedRepo)?.repo}`
              }
            </p>
          </div>
          
          {/* Repository Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Repositories</SelectItem>
                {repositories.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.owner}/{repo.repo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          onClick={fetchCommitsFromGitHub} 
          disabled={fetchingCommits}
          variant="outline"
          size="sm"
        >
          {fetchingCommits ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-2" />
              Refresh Data
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Commits Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Commits
            </CardTitle>
            <CardDescription>
              Commits by date (last 10 days)
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

        {/* Top Contributors Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Contributors
            </CardTitle>
            <CardDescription>
              Most active contributors by commit count ({authorData.length} contributors found)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={authorData} layout="horizontal" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="author" type="category" width={150} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="commits" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No contributor data available</p>
                <p className="text-sm text-muted-foreground">Commits need author information to display contributors</p>
              </div>
            )}
          </CardContent>
        </Card>

       
      
      </div>
    </div>
  );
};