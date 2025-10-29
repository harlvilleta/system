import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  useTheme,
  Grid,
  Avatar,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  Cancel,
  Pending,
  Visibility,
  Assignment,
  AccessTime,
  LocationOn,
  Person,
  CalendarToday
} from '@mui/icons-material';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function TeacherActivityRequests() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentUser, setCurrentUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        fetchRequests(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  // Also try fetching by email as fallback
  useEffect(() => {
    if (currentUser?.email && requests.length === 0) {
      console.log('Trying fallback query by email:', currentUser.email);
      const fallbackQuery = query(
        collection(db, 'activity_bookings'),
        where('teacherEmail', '==', currentUser.email)
      );

      const unsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
        console.log('Fallback query result:', snapshot.docs.length, 'documents');
        if (snapshot.docs.length > 0) {
          const requestsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort by createdAt in descending order (most recent first)
          requestsData.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0);
            const dateB = new Date(b.createdAt || b.created_at || 0);
            return dateB - dateA;
          });
          
          setRequests(requestsData);
        }
      }, (error) => {
        console.error('Fallback query error:', error);
      });

      return () => unsubscribe();
    }
  }, [currentUser?.email, requests.length]);

  const fetchRequests = (teacherId) => {
    setLoading(true);
    console.log('Fetching requests for teacherId:', teacherId);
    
    try {
      const requestsQuery = query(
        collection(db, 'activity_bookings'),
        where('teacherId', '==', teacherId)
      );

      const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        console.log('Requests snapshot received:', snapshot.docs.length, 'documents');
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by createdAt in descending order (most recent first)
        requestsData.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateB - dateA;
        });
        
        console.log('Processed requests data:', requestsData);
        setRequests(requestsData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching requests:', error);
        setSnackbar({ open: true, message: `Failed to load activity requests: ${error.message}`, severity: 'error' });
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up requests query:', error);
      setSnackbar({ open: true, message: `Failed to load activity requests: ${error.message}`, severity: 'error' });
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'denied':
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'pending':
        return <Pending sx={{ fontSize: 16 }} />;
      case 'denied':
      case 'rejected':
        return <Cancel sx={{ fontSize: 16 }} />;
      default:
        return <Schedule sx={{ fontSize: 16 }} />;
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setViewDialog(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRequestStats = () => {
    const total = requests.length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const denied = requests.filter(r => r.status === 'denied' || r.status === 'rejected').length;

    return { total, approved, pending, denied };
  };

  const getFilteredRequests = () => {
    if (filterStatus === 'all') {
      return requests;
    }
    return requests.filter(request => {
      if (filterStatus === 'denied') {
        return request.status === 'denied' || request.status === 'rejected';
      }
      return request.status === filterStatus;
    });
  };

  const handleFilterClick = (status) => {
    setFilterStatus(status);
  };

  const stats = getRequestStats();

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading activity requests...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', mb: 1 }}>
          Activity Requests
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your activity booking requests
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            onClick={() => handleFilterClick('all')}
            sx={{ 
              border: 'none',
              boxShadow: 3,
              bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              border: '2px solid transparent',
              borderLeft: '4px solid #800000'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            onClick={() => handleFilterClick('approved')}
            sx={{ 
              border: 'none',
              boxShadow: 3,
              bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              border: '2px solid transparent',
              borderLeft: '4px solid #800000'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {stats.approved}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            onClick={() => handleFilterClick('pending')}
            sx={{ 
              border: 'none',
              boxShadow: 3,
              bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              border: '2px solid transparent',
              borderLeft: '4px solid #800000'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            onClick={() => handleFilterClick('denied')}
            sx={{ 
              border: 'none',
              boxShadow: 3,
              bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              border: '2px solid transparent',
              borderLeft: '4px solid #800000'
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {stats.denied}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Denied
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Requests Table */}
      <Card sx={{ 
        border: 'none',
        boxShadow: 3,
        bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
        borderRadius: 2
      }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
            Request History
          </Typography>
          
          {getFilteredRequests().length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#ffffff', backgroundColor: '#800000' }}>
                      Activity
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#ffffff', backgroundColor: '#800000' }}>
                      Resource
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#ffffff', backgroundColor: '#800000' }}>
                      Date & Time
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#ffffff', backgroundColor: '#800000' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#ffffff', backgroundColor: '#800000' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredRequests().map((request) => (
                    <TableRow 
                      key={request.id} 
                      hover 
                      onClick={() => handleViewRequest(request)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: '#2196f3', width: 32, height: 32 }}>
                            <Assignment sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {request.activity}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {request.department}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {request.resource}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarToday sx={{ fontSize: 14 }} />
                            {formatDate(request.date)}
                          </Typography>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                            <AccessTime sx={{ fontSize: 14 }} />
                            {formatTime(request.startTime)} - {formatTime(request.endTime)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(request.status)}
                          label={request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                          color={getStatusColor(request.status)}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click when clicking the button
                              handleViewRequest(request);
                            }}
                            size="small"
                            sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                {filterStatus === 'all' ? 'No Activity Requests' : `No ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Requests`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filterStatus === 'all' 
                  ? "You haven't submitted any activity requests yet."
                  : `You don't have any ${filterStatus} activity requests.`
                }
              </Typography>
              {filterStatus === 'all' && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/teacher-activity-scheduler')}
                  sx={{ mt: 2, bgcolor: '#800000', '&:hover': { bgcolor: '#600000' } }}
                >
                  Create Request
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* View Request Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600,
          color: '#800000',
          borderBottom: '1px solid #e0e0e0'
        }}>
          Activity Request Details
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedRequest && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                    Activity
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.activity}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                    Department
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.department}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                    Resource
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.resource}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedRequest.date)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                    Time
                  </Typography>
                  <Typography variant="body1">
                    {formatTime(selectedRequest.startTime)} - {formatTime(selectedRequest.endTime)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                    Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(selectedRequest.status)}
                    label={selectedRequest.status?.charAt(0).toUpperCase() + selectedRequest.status?.slice(1)}
                    color={getStatusColor(selectedRequest.status)}
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                </Box>
              </Grid>
              {selectedRequest.notes && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedRequest.notes}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {selectedRequest.adminNotes && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                      Admin Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedRequest.adminNotes}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button
            onClick={() => setViewDialog(false)}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
