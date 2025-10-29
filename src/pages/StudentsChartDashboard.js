import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Paper, IconButton, Grid, Card, CardContent, Chip,
  CircularProgress, Alert
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useTheme } from "../contexts/ThemeContext";

export default function StudentsChartDashboard() {
  const { isDark } = useTheme();
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchYearlyData();
  }, []);

  const fetchYearlyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      // Initialize monthly counts array
      const monthlyCounts = months.map((month, index) => ({
        month: month,
        count: 0,
        monthNumber: index + 1,
        year: currentYear
      }));

      // Fetch students from "students" collection only
      const studentsSnapshot = await getDocs(collection(db, "students"));

      // Process students from "students" collection
      studentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt;
        if (createdAt) {
          const createdDate = new Date(createdAt);
          const createdMonth = createdDate.getMonth();
          const createdYear = createdDate.getFullYear();
          
          // Only count if it's from the current year
          if (createdYear === currentYear) {
            const monthIndex = monthlyCounts.findIndex(m => m.monthNumber === createdMonth + 1);
            if (monthIndex !== -1) {
              monthlyCounts[monthIndex].count++;
            }
          }
        }
      });

      // Remove the extra properties we added for processing
      const finalData = monthlyCounts.map(({ month, count }) => ({ month, count }));
      setMonthlyData(finalData);
    } catch (err) {
      console.error("Error fetching yearly data:", err);
      setError("Failed to load student registration data");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/overview');
  };

  const totalStudents = monthlyData.reduce((sum, month) => sum + month.count, 0);
  const peakMonth = monthlyData.reduce((max, month) => month.count > max.count ? month : max, { count: 0, month: 'None' });
  const averagePerMonth = totalStudents / 12;


  if (error) {
    return (
      <Box sx={{ p: 3, pt: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2, 
            mt: 1 
          }}>
            Students Registration Dashboard
          </Typography>
        </Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2, 
          mt: 1
        }}>
          Students Registration Dashboard
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'transparent',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#800000' }}>
                {totalStudents}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Students ({new Date().getFullYear()})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'transparent',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#800000' }}>
                {Math.round(averagePerMonth)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Average per Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'transparent',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#800000' }}>
                {peakMonth.count}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Peak Month: {peakMonth.month}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'transparent',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#800000' }}>
                {new Date().getFullYear()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Current Year
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Monthly Chart */}
      <Paper sx={{ 
        p: 2, 
        mb: 1,
        background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.05) 0%, rgba(128, 0, 0, 0.02) 100%)',
        border: '1px solid rgba(128, 0, 0, 0.2)',
        borderLeft: '4px solid #800000'
      }}>
        <Typography variant="h6" gutterBottom sx={{ 
          fontWeight: 700, 
          color: isDark ? '#ffffff' : '#800000',
          textShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
        }}>
          Student Registration Trends - {new Date().getFullYear()}
        </Typography>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
              domain={[0, 'dataMax + 1']}
            />
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1a1a1a' : '#fff', 
                border: isDark ? '1px solid #D84040' : '1px solid #800000',
                borderRadius: '8px',
                color: isDark ? '#ffffff' : '#000000'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke={isDark ? '#D84040' : '#800000'} 
              strokeWidth={3}
              name="Students Registered"
              dot={{ fill: isDark ? '#D84040' : '#800000', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8, stroke: isDark ? '#D84040' : '#800000', strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Monthly Breakdown */}
      <Paper sx={{ 
        p: 3,
        background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.05) 0%, rgba(128, 0, 0, 0.02) 100%)',
        border: '1px solid rgba(128, 0, 0, 0.2)',
        borderLeft: '4px solid #800000'
      }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#800000' }}>
          Monthly Breakdown
        </Typography>
        <Grid container spacing={2}>
          {monthlyData.map((month) => (
            <Grid item xs={6} sm={4} md={2} key={month.month}>
              <Card sx={{ 
                textAlign: 'center', 
                background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.1) 0%, rgba(128, 0, 0, 0.05) 100%)',
                border: '1px solid rgba(128, 0, 0, 0.2)',
                borderLeft: '4px solid #800000',
                boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? '#ffffff' : (month.count > averagePerMonth ? '#800000' : 'text.primary') }}>
                    {month.count}
                  </Typography>
                  <Typography variant="caption" sx={{ color: isDark ? '#ffffff' : 'text.secondary' }}>
                    {month.month}
                  </Typography>
                  {month.count > averagePerMonth && !isDark && (
                    <Chip 
                      label="Above Average" 
                      size="small" 
                      sx={{ 
                        mt: 1, 
                        bgcolor: '#800000', 
                        color: 'white',
                        fontSize: '0.7rem'
                      }} 
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
