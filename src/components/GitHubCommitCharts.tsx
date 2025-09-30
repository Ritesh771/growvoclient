import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BarChart3, PieChart as PieChartIcon, RefreshCw, Users, Filter, Trophy, Medal, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
  repo_url: string;
  created_at: string;
  updated_at: string;
  last_fetched_at: string | null;
  last_commit_sha: string | null;
  fetch_status: string | null;
  last_error_message: string | null;
  fetch_count: number | null;
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
  const [cacheStatus, setCacheStatus] = useState<{[repoId: string]: {
    lastFetchedAt: string | null;
    fetchStatus: string | null;
    fetchCount: number | null;
    errorMessage: string | null;
    nextFetchAt: string | null;
  }}>({});
  const [fetchingCommits, setFetchingCommits] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>('all');

  // Helper function to get ranking medal/icon
  const getRankingIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <div className="h-6 w-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</div>;
    }
  };

  // Helper function to get ranking colors
  const getRankingColors = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-gradient-to-r from-yellow-50 to-yellow-100',
          border: 'border-yellow-200',
          text: 'text-yellow-800'
        };
      case 2:
        return {
          bg: 'bg-gradient-to-r from-gray-50 to-gray-100',
          border: 'border-gray-200',
          text: 'text-gray-800'
        };
      case 3:
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-amber-100',
          border: 'border-amber-200',
          text: 'text-amber-800'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
          border: 'border-blue-200',
          text: 'text-blue-800'
        };
    }
  };

  // Helper function to generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const loadCacheStatus = () => {
    const status: {[repoId: string]: any} = {};
    repositories.forEach(repo => {
      status[repo.id] = {
        lastFetchedAt: repo.last_fetched_at,
        fetchStatus: repo.fetch_status,
        fetchCount: repo.fetch_count,
        errorMessage: repo.last_error_message,
        nextFetchAt: null
      };
    });
    setCacheStatus(status);
  };

  useEffect(() => {
    if (repositories.length > 0) {
      loadAllCommits();
      loadCacheStatus();
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
      setCacheStatus({});
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
          if (data.rateLimited) {
            // Handle rate limiting
            setCacheStatus(prev => ({
              ...prev,
              [repo.id]: {
                lastFetchedAt: data.lastFetchedAt,
                fetchStatus: 'rate_limited',
                fetchCount: prev[repo.id]?.fetchCount || 0,
                errorMessage: data.error,
                nextFetchAt: data.nextFetchAt
              }
            }));

            toast({
              title: "Rate Limited",
              description: data.error,
              variant: "destructive",
            });
            continue;
          } else {
            throw new Error(data.error || 'Failed to fetch commits');
          }
        }

        // Update cache status with successful fetch
        setCacheStatus(prev => ({
          ...prev,
          [repo.id]: {
            lastFetchedAt: data.lastFetchedAt,
            fetchStatus: 'success',
            fetchCount: (prev[repo.id]?.fetchCount || 0) + 1,
            errorMessage: null,
            nextFetchAt: null
          }
        }));

        const fetchType = data.fetchType || 'unknown';
        const message = data.isIncremental
          ? `Fetched ${data.newCommitsCount} new commits for ${repo.owner}/${repo.repo}`
          : `Fetched ${data.newCommitsCount} commits for ${repo.owner}/${repo.repo} (${fetchType})`;

        toast({
          title: "Commits updated!",
          description: message,
        });
      }

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
    console.log('Processing chart data for commits:', filteredCommits.length);
    console.log('Sample commits:', filteredCommits.slice(0, 3));
    
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

      // Author data - improved handling
      const authorName = commit.author_name;
      console.log('Processing author:', authorName, 'Type:', typeof authorName);
      
      if (authorName && typeof authorName === 'string' && authorName.trim() !== '') {
        const cleanAuthor = authorName.trim();
        if (cleanAuthor !== 'null' && cleanAuthor !== 'undefined') {
          authorCommits[cleanAuthor] = (authorCommits[cleanAuthor] || 0) + 1;
          
          // Author daily data for timeline
          if (!authorDailyCommits[dateKey]) {
            authorDailyCommits[dateKey] = {};
          }
          authorDailyCommits[dateKey][cleanAuthor] = (authorDailyCommits[dateKey][cleanAuthor] || 0) + 1;
        }
      }
    });

    console.log('Author commits after processing:', authorCommits);

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
      .filter(([author, count]) => {
        console.log('Filtering author:', author, 'with count:', count);
        return count > 0;
      })
      .map(([author, count]) => {
        const displayName = author && author.trim() && author !== 'null' && author !== 'undefined' ? 
          (author.length > 25 ? author.substring(0, 22) + '...' : author) : 
          'Unknown';
        console.log('Mapping author:', author, 'to display name:', displayName, 'commits:', count);
        return {
          author: displayName,
          commits: count,
        };
      })
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10); // Top 10 authors

    console.log('Final authors array:', authors);

    // If no valid authors found but we have commits, create a fallback entry
    if (authors.length === 0 && filteredCommits.length > 0) {
      console.log('No valid authors found, creating fallback');
      authors.push({
        author: 'Unknown Contributors',
        commits: filteredCommits.length
      });
    }

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
    console.log('Author commits raw:', authorCommits); // Debug log
    console.log('Author data processed:', authors); // Debug log
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger className="w-full sm:w-[200px]">
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

            {/* Cache Status Indicator */}
            {selectedRepo !== 'all' && cacheStatus[selectedRepo] && (
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  cacheStatus[selectedRepo].fetchStatus === 'success' ? 'bg-green-500' :
                  cacheStatus[selectedRepo].fetchStatus === 'error' ? 'bg-red-500' :
                  cacheStatus[selectedRepo].fetchStatus === 'rate_limited' ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`} />
                <span className="text-muted-foreground text-xs sm:text-sm">
                  {cacheStatus[selectedRepo].lastFetchedAt
                    ? `Updated ${new Date(cacheStatus[selectedRepo].lastFetchedAt).toLocaleString()}`
                    : 'Never fetched'
                  }
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {selectedRepo !== 'all' && cacheStatus[selectedRepo]?.fetchStatus === 'rate_limited' && (
            <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded w-fit">
              Rate limited until {cacheStatus[selectedRepo]?.nextFetchAt ? 
                new Date(cacheStatus[selectedRepo].nextFetchAt).toLocaleTimeString() : 'later'}
            </div>
          )}
          
          <Button 
            onClick={fetchCommitsFromGitHub} 
            disabled={fetchingCommits || (selectedRepo !== 'all' && cacheStatus[selectedRepo]?.fetchStatus === 'rate_limited')}
            variant="outline"
            size="sm"
            className="w-fit"
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

        {/* Top Contributors Leaderboard */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-white border-0 shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  Top Contributors
                </CardTitle>
                <CardDescription className="text-slate-600 mt-2">
                  Recognition for our most active contributors • {authorData.length} champions
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-800">
                  {authorData.reduce((sum, author) => sum + author.commits, 0)}
                </div>
                <div className="text-sm text-slate-500">Total Commits</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {authorData.length > 0 ? (
              <div className="space-y-4">
                {authorData.map((author, index) => {
                  const rank = index + 1;
                  const colors = getRankingColors(rank);
                  const initials = getInitials(author.author);
                  const isTopThree = rank <= 3;
                  
                  return (
                    <div 
                      key={`${author.author}-${index}`}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                        isTopThree 
                          ? 'bg-gradient-to-r from-white via-slate-50 to-white border-slate-200 shadow-md' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {/* Background gradient for top 3 */}
                      {isTopThree && (
                        <div className={`absolute inset-0 opacity-5 ${
                          rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                          rank === 2 ? 'bg-gradient-to-r from-slate-400 to-slate-600' :
                          'bg-gradient-to-r from-amber-400 to-orange-500'
                        }`} />
                      )}
                      
                      <div className="relative p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                            {/* Ranking Badge */}
                            <div className="flex-shrink-0">
                              <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold text-sm sm:text-lg shadow-lg ${
                                rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                                rank === 2 ? 'bg-gradient-to-r from-slate-400 to-slate-500 text-white' :
                                rank === 3 ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {rank <= 3 ? (
                                  rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'
                                ) : (
                                  `#${rank}`
                                )}
                              </div>
                            </div>
                            
                            {/* Profile Section */}
                            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                              <div className="relative flex-shrink-0">
                                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-4 border-white shadow-lg ring-2 ring-slate-100">
                                  <AvatarImage 
                                    src={`https://github.com/${author.author}.png`} 
                                    alt={author.author}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                  <AvatarFallback className={`font-bold text-sm sm:text-lg ${
                                    isTopThree ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                {isTopThree && (
                                  <div className={`absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                                    rank === 1 ? 'bg-yellow-500' :
                                    rank === 2 ? 'bg-slate-500' :
                                    'bg-amber-500'
                                  }`}>
                                    ⭐
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-lg sm:text-xl mb-1 truncate ${
                                  isTopThree ? 'text-slate-800' : 'text-slate-700'
                                }`}>
                                  {author.author}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  {isTopThree && (
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs font-medium px-2 sm:px-3 py-1 ${
                                        rank === 1 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                        rank === 2 ? 'bg-slate-100 text-slate-800 border-slate-200' :
                                        'bg-amber-100 text-amber-800 border-amber-200'
                                      }`}
                                    >
                                      {rank === 1 ? '🏆 Champion' : rank === 2 ? '🥈 Elite' : '🥉 Expert'}
                                    </Badge>
                                  )}
                                  <span className="text-xs sm:text-sm text-slate-500">
                                    {rank <= 3 ? 'Top Contributor' : 'Active Developer'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Commit Stats */}
                          <div className="text-right flex-shrink-0">
                            <div className={`text-2xl sm:text-3xl font-bold mb-1 ${
                              isTopThree ? 'text-slate-800' : 'text-slate-700'
                            }`}>
                              {author.commits}
                            </div>
                            <div className="text-xs sm:text-sm text-slate-500 font-medium">
                              {author.commits === 1 ? 'commit' : 'commits'}
                            </div>
                            {/* Progress bar for top 3 */}
                            {isTopThree && (
                              <div className="w-20 sm:w-24 h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                    rank === 2 ? 'bg-gradient-to-r from-slate-400 to-slate-500' :
                                    'bg-gradient-to-r from-amber-400 to-amber-500'
                                  }`}
                                  style={{ width: `${(author.commits / authorData[0].commits) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Enhanced Summary Stats */}
                <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-100">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      <span className="text-xs sm:text-sm font-medium text-blue-800">Contributors</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-blue-900">{authorData.length}</div>
                    <div className="text-xs sm:text-sm text-blue-600 mt-1">Active team members</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-100">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                      <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      <span className="text-xs sm:text-sm font-medium text-green-800">Total Commits</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-green-900">
                      {authorData.reduce((sum, author) => sum + author.commits, 0)}
                    </div>
                    <div className="text-xs sm:text-sm text-green-600 mt-1">Code contributions</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 sm:p-6 border border-purple-100">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                      <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                      <span className="text-xs sm:text-sm font-medium text-purple-800">Average</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-purple-900">
                      {Math.round(authorData.reduce((sum, author) => sum + author.commits, 0) / authorData.length)}
                    </div>
                    <div className="text-xs sm:text-sm text-purple-600 mt-1">Commits per contributor</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="p-4 bg-slate-100 rounded-full mb-6">
                  <Trophy className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No contributors found</h3>
                <p className="text-slate-500 text-center max-w-md mb-6">
                  Fetch commits from your repositories to populate the leaderboard and celebrate your team's contributions
                </p>
                {filteredCommits.length > 0 && (
                  <div className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
                    Found {filteredCommits.length} commits but no valid author names
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

       
      
      </div>
    </div>
  );
};