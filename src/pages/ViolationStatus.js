import React, { useState, useEffect } from "react";
import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, InputAdornment, Card, CardContent, CardHeader, Grid, Chip, Avatar, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tabs, Tab, LinearProgress, CircularProgress, Button, MenuItem, Stack, useTheme } from "@mui/material";
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
  const [filterType, setFilterType] = useState(null); // 'classification' or 'severity'
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all violations (same as ViolationRecord.js)
        const violationsSnap = await getDocs(collection(db, "violations"));
        const violationsData = violationsSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          // Normalize field names for consistent display
          violation: doc.data().violation || doc.data().violationType || 'N/A',
          studentName: doc.data().studentName || 'N/A',
          studentId: doc.data().studentId || doc.data().studentIdNumber || 'N/A',
          reportedBy: doc.data().reportedBy || doc.data().reportedByName || 'N/A',
          classification: doc.data().classification || 'N/A',
          severity: doc.data().severity || 'N/A',
          date: doc.data().date || 'N/A',
          time: doc.data().time || 'N/A',
          location: doc.data().location || 'N/A',
          description: doc.data().description || 'N/A',
          witnesses: doc.data().witnesses || 'N/A',
          actionTaken: doc.data().actionTaken || 'N/A',
          status: doc.data().status || 'Pending',
          timestamp: doc.data().timestamp || doc.data().createdAt || new Date().toISOString()
        }));
        // Sort by timestamp/createdAt in memory (newest first)
        violationsData.sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return dateB - dateA;
        });
        setViolations(violationsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setViolations([]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredViolations = violations.filter(v => {
    // Search filter
    const matchesSearch = 
      v.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      v.violation?.toLowerCase().includes(search.toLowerCase()) ||
      v.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      v.classification?.toLowerCase().includes(search.toLowerCase());
    
    // Classification filter
    const matchesClassification = !filterType || filterType !== 'classification' || !filterValue || v.classification === filterValue;
    
    // Severity filter
    const matchesSeverity = !filterType || filterType !== 'severity' || !filterValue || v.severity === filterValue;
    
    return matchesSearch && matchesClassification && matchesSeverity;
  });

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

  // Calculate statistics (matching ViolationRecord.js status options)
  const stats = {
    totalViolations: violations.length,
    pendingViolations: violations.filter(v => v.status === 'Pending').length,
    openViolations: violations.filter(v => v.status === 'Open').length,
    inProgressViolations: violations.filter(v => v.status === 'In Progress').length,
    resolvedViolations: violations.filter(v => v.status === 'Resolved').length,
    solvedViolations: violations.filter(v => v.status === 'Solved' || v.status === 'Resolved').length // Keep for backward compatibility
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
      <Box sx={{ mb: 3 }}>
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
      </Box>

      {/* Filter Chips and Dropdowns */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
          Filter by:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label="Classification"
            onClick={() => {
              setFilterType('classification');
              setFilterValue('');
            }}
            variant="outlined"
            sx={{
              cursor: 'pointer',
              bgcolor: '#ffffff',
              color: '#000000',
              borderColor: '#000000',
              '&:hover': {
                bgcolor: 'rgba(128, 0, 0, 0.1)',
                color: '#000000',
                borderColor: '#000000'
              }
            }}
          />
          <Chip
            label="Severity"
            onClick={() => {
              setFilterType('severity');
              setFilterValue('');
            }}
            variant="outlined"
            sx={{
              cursor: 'pointer',
              bgcolor: '#ffffff',
              color: '#000000',
              borderColor: '#000000',
              '&:hover': {
                bgcolor: 'rgba(128, 0, 0, 0.1)',
                color: '#000000',
                borderColor: '#000000'
              }
            }}
          />
          {filterType && (
            <Chip
              label="Clear Filter"
              onClick={() => {
                setFilterType(null);
                setFilterValue('');
              }}
              variant="outlined"
              sx={{ 
                cursor: 'pointer',
                bgcolor: '#ffffff',
                color: '#000000',
                borderColor: '#000000',
                '&:hover': {
                  bgcolor: 'rgba(128, 0, 0, 0.1)',
                  color: '#000000',
                  borderColor: '#000000'
                }
              }}
            />
          )}
        </Stack>
        {filterType === 'classification' && (
          <TextField
            select
            label="Select Classification"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Classifications</MenuItem>
            <MenuItem value="Academic">Academic</MenuItem>
            <MenuItem value="Behavioral">Behavioral</MenuItem>
            <MenuItem value="Policy/Rules">Policy/Rules</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
        )}
        {filterType === 'severity' && (
          <TextField
            select
            label="Select Severity Level"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Severity Levels</MenuItem>
            <MenuItem value="Level 1">Level 1</MenuItem>
            <MenuItem value="Level 2">Level 2</MenuItem>
            <MenuItem value="Level 3">Level 3</MenuItem>
            <MenuItem value="Level 4">Level 4</MenuItem>
          </TextField>
        )}
      </Box>

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
            ) : filteredViolations.map((violation, idx) => (
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