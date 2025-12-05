// src/pages/MerchantAnalyticsPage.jsx
import React, { useState, useMemo } from 'react';
import {
  Container, Typography, Box, Paper, Grid, CircularProgress,
  ToggleButton, ToggleButtonGroup, Card, CardContent, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PrintIcon from '@mui/icons-material/Print';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DescriptionIcon from '@mui/icons-material/Description';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import ArticleIcon from '@mui/icons-material/Article';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useFirestore';

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4', '#e91e63', '#3f51b5'];

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, trend, trendValue, color = 'primary', secondaryValue }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            {value}
          </Typography>
          {secondaryValue && (
            <Typography variant="body2" color="text.secondary">
              {secondaryValue}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {trend === 'up' ? (
                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 18 }} />
              ) : (
                <TrendingDownIcon sx={{ color: 'error.main', fontSize: 18 }} />
              )}
              <Typography
                variant="caption"
                sx={{ color: trend === 'up' ? 'success.main' : 'error.main', ml: 0.5, fontWeight: 600 }}
              >
                {trendValue}
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar
          sx={{
            bgcolor: `${color}.lighter`,
            color: `${color}.main`,
            width: 56,
            height: 56,
          }}
        >
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// Section Header Component
const SectionHeader = ({ title, subtitle }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="h6" fontWeight="bold">{title}</Typography>
    {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
  </Box>
);

export default function MerchantAnalyticsPage() {
  const { user, userData, loading } = useAuth();
  const [timeRange, setTimeRange] = useState('week');

  const { documents: jobs } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: user?.uid,
  });

  // Process data for charts
  const analyticsData = useMemo(() => {
    if (!jobs) return null;

    const completedJobs = jobs.filter(j => ['completed', 'paid'].includes(j.status));
    const now = new Date();

    // Last 7 days data
    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayJobs = completedJobs.filter(j => {
        const jobDate = j.createdAt?.toDate?.()?.toISOString().split('T')[0];
        return jobDate === dateStr;
      });

      last7DaysData.push({
        name: dayName,
        date: dateStr,
        prints: dayJobs.length,
        earnings: dayJobs.reduce((sum, j) => sum + (j.cost || 0), 0),
        files: dayJobs.reduce((sum, j) => sum + (j.files?.length || 0), 0),
      });
    }

    // Hourly distribution (for today)
    const todayStr = now.toISOString().split('T')[0];
    const hourlyData = Array(24).fill(0).map((_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      jobs: 0,
    }));
    
    jobs.filter(j => {
      const jobDate = j.createdAt?.toDate?.()?.toISOString().split('T')[0];
      return jobDate === todayStr;
    }).forEach(job => {
      const hour = job.createdAt?.toDate?.()?.getHours() || 0;
      hourlyData[hour].jobs++;
    });

    // Color vs BW distribution
    let colorCount = 0, bwCount = 0;
    completedJobs.forEach(job => {
      job.files?.forEach(file => {
        if (file.specs?.color === 'color') colorCount++;
        else bwCount++;
      });
    });
    const colorDistribution = [
      { name: 'Black & White', value: bwCount || 1, fill: '#424242' },
      { name: 'Color', value: colorCount || 0, fill: '#2196f3' },
    ];

    // File type distribution
    const fileTypes = {};
    completedJobs.forEach(job => {
      job.files?.forEach(file => {
        const ext = file.name?.split('.').pop()?.toLowerCase() || 'other';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
      });
    });
    const fileTypeData = Object.entries(fileTypes)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Paper size distribution
    const paperSizes = {};
    completedJobs.forEach(job => {
      job.files?.forEach(file => {
        const size = file.specs?.paperSize?.toUpperCase() || 'A4';
        paperSizes[size] = (paperSizes[size] || 0) + 1;
      });
    });
    const paperSizeData = Object.entries(paperSizes).map(([name, value]) => ({ name, value }));

    // Copies distribution
    const copiesData = [
      { name: '1 copy', value: 0 },
      { name: '2-5 copies', value: 0 },
      { name: '6-10 copies', value: 0 },
      { name: '10+ copies', value: 0 },
    ];
    completedJobs.forEach(job => {
      job.files?.forEach(file => {
        const copies = file.specs?.copies || 1;
        if (copies === 1) copiesData[0].value++;
        else if (copies <= 5) copiesData[1].value++;
        else if (copies <= 10) copiesData[2].value++;
        else copiesData[3].value++;
      });
    });

    // Recent jobs for activity feed
    const recentJobs = [...jobs]
      .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))
      .slice(0, 5);

    // Calculate averages
    const totalDays = 7;
    const avgDailyPrints = Math.round(completedJobs.length / totalDays);
    const avgDailyEarnings = Math.round(completedJobs.reduce((sum, j) => sum + (j.cost || 0), 0) / totalDays);
    const avgJobValue = completedJobs.length > 0
      ? Math.round(completedJobs.reduce((sum, j) => sum + (j.cost || 0), 0) / completedJobs.length)
      : 0;

    return {
      last7DaysData,
      hourlyData: hourlyData.filter((_, i) => i >= 6 && i <= 22), // 6 AM to 10 PM
      colorDistribution,
      fileTypeData,
      paperSizeData,
      copiesData,
      recentJobs,
      avgDailyPrints,
      avgDailyEarnings,
      avgJobValue,
      totalJobs: completedJobs.length,
      totalFiles: completedJobs.reduce((sum, j) => sum + (j.files?.length || 0), 0),
    };
  }, [jobs]);

  if (loading || !userData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const stats = userData?.stats || {};

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your business performance and insights
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(e, v) => v && setTimeRange(v)}
          size="small"
        >
          <ToggleButton value="week">7 Days</ToggleButton>
          <ToggleButton value="month">30 Days</ToggleButton>
          <ToggleButton value="year">Year</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Revenue"
            value={`₹${stats.todayEarnings || 0}`}
            secondaryValue={`${stats.todayPrints || 0} prints`}
            icon={<AttachMoneyIcon />}
            trend={stats.todayEarnings >= (analyticsData?.avgDailyEarnings || 0) ? 'up' : 'down'}
            trendValue={stats.todayEarnings >= (analyticsData?.avgDailyEarnings || 0) ? 'Above average' : 'Below average'}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="This Month"
            value={`₹${stats.monthEarnings || 0}`}
            secondaryValue={`${stats.monthPrints || 0} prints`}
            icon={<CalendarTodayIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`₹${stats.totalEarnings || 0}`}
            secondaryValue={`${stats.totalPrints || 0} total prints`}
            icon={<TrendingUpIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg. Job Value"
            value={`₹${analyticsData?.avgJobValue || 0}`}
            secondaryValue={`${analyticsData?.avgDailyPrints || 0} prints/day avg`}
            icon={<PrintIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1: Revenue & Prints Trends */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <SectionHeader title="Revenue & Prints Overview" subtitle="Last 7 days performance" />
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={analyticsData?.last7DaysData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#2196f3" />
                <YAxis yAxisId="right" orientation="right" stroke="#4caf50" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="prints" fill="#2196f3" name="Prints" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="earnings" stroke="#4caf50" name="Earnings (₹)" strokeWidth={3} dot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <SectionHeader title="Print Type Distribution" subtitle="Color vs Black & White" />
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analyticsData?.colorDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analyticsData?.colorDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2: Detailed Analytics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader title="Peak Hours" subtitle="Job distribution throughout the day" />
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analyticsData?.hourlyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="jobs" stroke="#9c27b0" fill="#9c27b0" fillOpacity={0.3} name="Jobs" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader title="File Types Received" subtitle="Distribution by document type" />
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analyticsData?.fileTypeData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={60} />
                <Tooltip />
                <Bar dataKey="value" fill="#ff9800" radius={[0, 4, 4, 0]} name="Files">
                  {analyticsData?.fileTypeData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 3: Additional Insights */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader title="Paper Sizes" subtitle="Most used sizes" />
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analyticsData?.paperSizeData || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData?.paperSizeData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader title="Copies per Job" subtitle="Copy quantity distribution" />
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData?.copiesData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#00bcd4" radius={[4, 4, 0, 0]} name="Jobs" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader title="Recent Activity" subtitle="Latest print jobs" />
            <List dense sx={{ maxHeight: 250, overflow: 'auto' }}>
              {analyticsData?.recentJobs?.map((job, index) => (
                <ListItem key={job.id} divider={index < analyticsData.recentJobs.length - 1}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: job.status === 'completed' ? 'success.light' : 'warning.light', width: 36, height: 36 }}>
                      <PrintIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={job.userName || 'Customer'}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 12 }} />
                        {job.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'N/A'}
                        {job.cost && ` • ₹${job.cost}`}
                      </Box>
                    }
                  />
                  <Chip
                    label={job.status}
                    size="small"
                    color={job.status === 'completed' ? 'success' : job.status === 'paid' ? 'info' : 'warning'}
                    variant="outlined"
                  />
                </ListItem>
              ))}
              {(!analyticsData?.recentJobs || analyticsData.recentJobs.length === 0) && (
                <ListItem>
                  <ListItemText primary="No recent activity" secondary="Jobs will appear here" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
