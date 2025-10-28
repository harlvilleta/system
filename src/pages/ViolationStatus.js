import React, { useState, useEffect } from "react";
import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, InputAdornment, Card, CardContent, CardHeader, Grid, Chip, Avatar, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tabs, Tab, LinearProgress, CircularProgress, Button, useTheme } from "@mui/material";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format } from 'date-fns';

export default function ViolationStatus() {
  const theme = useTheme();
  const [violations, setViolations] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const [viewViolation, setViewViolation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch violations
        const violationsSnap = await getDocs(query(collection(db, "violations"), orderBy("timestamp", "desc")));
        const violationsData = violationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setViolations(violationsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredViolations = violations.filter(v =>
    v.studentId?.toLowerCase().includes(search.toLowerCase()) ||
    v.violation?.toLowerCase().includes(search.toLowerCase()) ||
    v.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    v.classification?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    return 'primary';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Low': return 'success';
      case 'Medium': return 'warning';
      case 'High': return 'error';
      case 'Critical': return 'error';
      default: return 'primary';
    }
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'Minor': return 'success';
      case 'Major': return 'warning';
      case 'Serious': return 'info';
      case 'Grave': return 'error';
      default: return 'primary';
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString || 'N/A';
    }
  };

  // Calculate statistics
  const stats = {
    totalViolations: violations.length,
    pendingViolations: violations.filter(v => v.status === 'Pending').length,
    solvedViolations: violations.filter(v => v.status === 'Solved').length
  };

  // Calculate percentages
  const pendingPercentage = stats.totalViolations > 0 ? (stats.pendingViolations / stats.totalViolations) * 100 : 0;
  const solvedPercentage = stats.totalViolations > 0 ? (stats.solvedViolations / stats.totalViolations) * 100 : 0;

  // Group violations by classification
  const classificationStats = violations.reduce((acc, violation) => {
    const classification = violation.classification || 'Unknown';
    acc[classification] = (acc[classification] || 0) + 1;
    return acc;
  }, {});

  // Group violations by severity
  const severityStats = violations.reduce((acc, violation) => {
    const severity = violation.severity || 'Unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});


  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Loading placeholder removed per requirement

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Violation Status & Analytics
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }} fontWeight={700}>{stats.totalViolations}</Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>Total Violations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }} fontWeight={700}>{stats.pendingViolations}</Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }} fontWeight={700}>{stats.solvedViolations}</Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>Solved</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analytics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 2 }}>
            <CardHeader title="Violations by Classification" />
            <CardContent>
              {Object.entries(classificationStats).map(([classification, count]) => (
                <Box key={classification} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      label={classification} 
                      color={getClassificationColor(classification)} 
                      size="small" 
                    />
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>{count} violations</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(count / stats.totalViolations) * 100} 
                    color={getClassificationColor(classification)} 
                    sx={{ height: 8, borderRadius: 4 }} 
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 2 }}>
            <CardHeader title="Violations by Severity" />
            <CardContent>
              {Object.entries(severityStats).map(([severity, count]) => (
                <Box key={severity} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      label={severity} 
                      color={getSeverityColor(severity)} 
                      size="small" 
                    />
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>{count} violations</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(count / stats.totalViolations) * 100} 
                    color={getSeverityColor(severity)} 
                    sx={{ height: 8, borderRadius: 4 }} 
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search violations..."
          size="small"
          sx={{ width: '400px' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`All Violations (${filteredViolations.length})`} />
          <Tab label={`Pending (${filteredViolations.filter(v => v.status === 'Pending').length})`} />
          <Tab label={`Solved (${filteredViolations.filter(v => v.status === 'Solved').length})`} />
          <Tab label={`Critical (${filteredViolations.filter(v => v.severity === 'Critical').length})`} />
        </Tabs>
      </Paper>

      {/* Violations Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 600, mr: 3 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ 
              bgcolor: '#800000' 
            }}>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600 
              }}>Date</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600 
              }}>Student ID</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600 
              }}>Name</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600 
              }}>Violation</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600 
              }}>Status</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600 
              }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredViolations.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No violations found.</TableCell></TableRow>
            ) : filteredViolations
                .filter(v => {
                  if (selectedTab === 1) return v.status === 'Pending';
                  if (selectedTab === 2) return v.status === 'Solved';
                  if (selectedTab === 3) return v.severity === 'Critical';
                  return true;
                })
                .map((violation, idx) => (
                  <TableRow key={violation.id || idx} hover>
                    <TableCell>{formatDate(violation.timestamp)}</TableCell>
                    <TableCell>{violation.studentId}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {violation.studentName || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{violation.violation}</Typography>
                      {violation.description && (
                        <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }} display="block">
                          {violation.description.substring(0, 50)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: violation.status === 'Pending' ? '#ff9800' :
                                violation.status === 'Solved' || violation.status === 'Completed' ? '#4caf50' : '#800000',
                          fontWeight: 500
                        }}
                      >
                        {violation.status}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => setViewViolation(violation)}
                          sx={{
                            '&:hover': { 
                              color: '#1976d2',
                              bgcolor: 'rgba(25, 118, 210, 0.04)'
                            }
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>


      {/* View Violation Details Dialog */}
      <Dialog open={!!viewViolation} onClose={() => setViewViolation(null)} maxWidth="md" fullWidth>
        <DialogTitle>Violation Status Details</DialogTitle>
        <DialogContent dividers>
          {viewViolation && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" color="primary">{viewViolation.violation}</Typography>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Student ID:</strong> {viewViolation.studentId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Student Name:</strong> {viewViolation.studentName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Date:</strong> {viewViolation.date}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Time:</strong> {viewViolation.time}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Classification:</strong> 
                    <Chip 
                      label={viewViolation.classification} 
                      color={getClassificationColor(viewViolation.classification)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Severity:</strong> 
                    <Chip 
                      label={viewViolation.severity} 
                      color={getSeverityColor(viewViolation.severity)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={viewViolation.status} 
                      color={getStatusColor(viewViolation.status)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Location:</strong> {viewViolation.location}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Reported By:</strong> {viewViolation.reportedBy}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Witnesses:</strong> {viewViolation.witnesses || 'None'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Description:</strong></Typography>
                  <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {viewViolation.description || 'No description provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Action Taken:</strong></Typography>
                  <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {viewViolation.actionTaken || 'No action taken yet'}
                  </Typography>
                </Grid>
                {viewViolation.image && (
                  <Grid item xs={12}>
                    <Typography><strong>Evidence:</strong></Typography>
                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                      <Avatar 
                        src={viewViolation.image} 
                        sx={{ width: 200, height: 200, mx: 'auto' }} 
                        variant="rounded"
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewViolation(null)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 