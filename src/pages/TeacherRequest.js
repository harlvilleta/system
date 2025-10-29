import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  useTheme,
  Card,
  CardContent,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  InputAdornment,
  TablePagination
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  LocationOn,
  CheckCircle,
  Cancel,
  Visibility,
  School,
  AccessTime,
  Badge,
  Delete,
  Edit,
  Search,
  Refresh
} from '@mui/icons-material';
import { collection, getDocs, updateDoc, doc, addDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function TeacherRequest() {
  const theme = useTheme();
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  useEffect(() => {
    fetchTeacherRequests();
  }, []);

  const fetchTeacherRequests = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching teacher requests from Firestore...');
      
      // Try with orderBy first
      let q = query(collection(db, 'teacher_requests'), orderBy('createdAt', 'desc'));
      let querySnapshot;
      
      try {
        querySnapshot = await getDocs(q);
        console.log('✅ Fetched with orderBy, found:', querySnapshot.size, 'requests');
      } catch (orderError) {
        // If orderBy fails (missing index), fetch without ordering
        console.warn('⚠️ OrderBy failed, fetching without order:', orderError);
        q = query(collection(db, 'teacher_requests'));
        querySnapshot = await getDocs(q);
        console.log('✅ Fetched without orderBy, found:', querySnapshot.size, 'requests');
      }
      
      const requestsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Teacher request doc:', { id: doc.id, ...data });
        return { id: doc.id, ...data };
      });
      
      // Sort manually by date if we couldn't use orderBy
      requestsData.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.requestDate || 0);
        const dateB = new Date(b.createdAt || b.requestDate || 0);
        return dateB - dateA;
      });
      
      console.log('✅ Total teacher requests:', requestsData.length);
      setTeacherRequests(requestsData);
    } catch (error) {
      console.error('❌ Error fetching teacher requests:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      setSnackbar({ open: true, message: 'Error fetching teacher requests: ' + error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setViewDialog(true);
  };

  const handleApprovalAction = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setApprovalReason('');
    setApprovalDialog(true);
  };

  const handleDeleteRequest = (request) => {
    setSelectedRequest(request);
    setDeleteReason('');
    setDeleteDialog(true);
  };

  const handleCardClick = (filter) => {
    setSelectedFilter(filter);
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSubmitApproval = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const newStatus = approvalAction === 'approve' ? 'approved' : 'denied';
      const actionText = approvalAction === 'approve' ? 'approved' : 'denied';

      // Update teacher request status
      await updateDoc(doc(db, 'teacher_requests', selectedRequest.id), {
        status: newStatus,
        reviewedBy: 'admin',
        reviewDate: new Date().toISOString(),
        reviewReason: approvalReason.trim() || null,
        updatedAt: new Date().toISOString()
      });

      // Update user document with approval status
      await updateDoc(doc(db, 'users', selectedRequest.userId), {
        'teacherInfo.isApproved': approvalAction === 'approve',
        'teacherInfo.approvalStatus': newStatus,
        'teacherInfo.approvedBy': 'admin',
        'teacherInfo.approvedDate': new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create notification for the teacher
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedRequest.userId,
        recipientEmail: selectedRequest.email,
        recipientName: selectedRequest.fullName,
        title: `Teacher Account ${newStatus === 'approved' ? 'Approved' : 'Denied'}`,
        message: `Your teacher account has been ${newStatus}.${approvalReason ? ` Reason: ${approvalReason}` : ''}`,
        type: 'teacher_approval',
        requestId: selectedRequest.id,
        senderId: 'admin',
        senderEmail: 'admin@school.com',
        senderName: 'Administration',
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high'
      });

      setSnackbar({ 
        open: true, 
        message: `Teacher request ${actionText}! Notification sent to teacher.`, 
        severity: 'success' 
      });

      setApprovalDialog(false);
      setSelectedRequest(null);
      fetchTeacherRequests(); // Refresh the list

    } catch (error) {
      console.error('Error processing teacher request:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error processing request. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitDelete = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // Delete the teacher request
      await deleteDoc(doc(db, 'teacher_requests', selectedRequest.id));

      // Delete the user document
      await deleteDoc(doc(db, 'users', selectedRequest.userId));

      // Create notification for the teacher (optional - since account is deleted)
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: selectedRequest.userId,
          recipientEmail: selectedRequest.email,
          recipientName: selectedRequest.fullName,
          title: 'Teacher Account Deleted',
          message: `Your teacher account has been deleted by the administrator.${deleteReason ? ` Reason: ${deleteReason}` : ''}`,
          type: 'account_deleted',
          requestId: selectedRequest.id,
          senderId: 'admin',
          senderEmail: 'admin@school.com',
          senderName: 'Administration',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'high'
        });
      } catch (notificationError) {
        console.warn('Failed to send deletion notification:', notificationError);
      }

      setSnackbar({ 
        open: true, 
        message: 'Teacher account deleted successfully!', 
        severity: 'success' 
      });

      setDeleteDialog(false);
      setSelectedRequest(null);
      fetchTeacherRequests(); // Refresh the list

    } catch (error) {
      console.error('Error deleting teacher account:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error deleting teacher account. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'denied':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle color="success" />;
      case 'denied':
        return <Cancel color="error" />;
      case 'pending':
        return <AccessTime color="warning" />;
      default:
        return <Badge color="default" />;
    }
  };

  const pendingRequests = teacherRequests.filter(req => req.status === 'pending');
  const approvedRequests = teacherRequests.filter(req => req.status === 'approved');
  const deniedRequests = teacherRequests.filter(req => req.status === 'denied');
  
  const filteredRequests = teacherRequests.filter(request => {
    // Filter by status
    const statusMatch = selectedFilter === 'all' || request.status === selectedFilter;
    
    // Filter by search term (name or email)
    const searchMatch = !searchTerm || 
      (request.fullName && request.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.email && request.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return statusMatch && searchMatch;
  });

  // Get paginated requests
  const paginatedRequests = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredRequests.slice(startIndex, endIndex);
  }, [filteredRequests, page, rowsPerPage]);

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
          mt: 1
        }}>
          Teacher Request Management
        </Typography>
        <Button
          variant="outlined"
          onClick={fetchTeacherRequests}
          startIcon={<Refresh />}
          disabled={loading}
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
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Review and approve teacher registration requests. Teachers cannot log in until their accounts are approved.
      </Typography>

      <Box sx={{ p: 3 }}>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              onClick={() => handleCardClick('all')}
              sx={{ 
                p: 2, 
                textAlign: 'center', 
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
                border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
                borderLeft: '4px solid #800000',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
              }}
            >
              <Typography variant="h4" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                fontWeight: 'bold' 
              }}>
                {teacherRequests.length}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
              }}>
                All Requests
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              onClick={() => handleCardClick('pending')}
              sx={{ 
                p: 2, 
                textAlign: 'center', 
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
                border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
                borderLeft: '4px solid #800000',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
              }}
            >
              <Typography variant="h4" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                fontWeight: 'bold' 
              }}>
                {pendingRequests.length}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
              }}>
                Pending Requests
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              onClick={() => handleCardClick('approved')}
              sx={{ 
                p: 2, 
                textAlign: 'center', 
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
                border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
                borderLeft: '4px solid #800000',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
              }}
            >
              <Typography variant="h4" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                fontWeight: 'bold' 
              }}>
                {approvedRequests.length}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
              }}>
                Approved
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              onClick={() => handleCardClick('denied')}
              sx={{ 
                p: 2, 
                textAlign: 'center', 
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
                border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
                borderLeft: '4px solid #800000',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
              }}
            >
              <Typography variant="h4" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                fontWeight: 'bold' 
              }}>
                {deniedRequests.length}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
              }}>
                Denied
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, mt: 3 }}>
          <TextField
            placeholder="Search by teacher name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{
              maxWidth: 400,
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#800000',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#800000',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
          {searchTerm && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSearchTerm('')}
              sx={{
                minWidth: 'auto',
                px: 2,
                color: '#666',
                borderColor: '#ddd',
                '&:hover': {
                  bgcolor: '#800000',
                  color: '#fff',
                  borderColor: '#800000'
                }
              }}
            >
              Clear
            </Button>
          )}
        </Box>
        {searchTerm && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {filteredRequests.length} result(s) for "{searchTerm}"
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading teacher requests...
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer 
              component={Paper} 
              elevation={2}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '16px',
                      padding: '12px 16px',
                      minWidth: '140px',
                      maxWidth: '140px'
                    }}>
                      Teacher
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '16px',
                      padding: '12px 16px',
                      minWidth: '200px',
                      maxWidth: '200px'
                    }}>
                      Email
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '16px',
                      padding: '12px 16px',
                      minWidth: '120px',
                      maxWidth: '120px'
                    }}>
                      Request Date
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '16px',
                      padding: '12px 16px',
                      minWidth: '100px',
                      maxWidth: '100px'
                    }}>
                      Status
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '16px',
                      padding: '12px 16px',
                      minWidth: '120px',
                      maxWidth: '120px'
                    }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="h6" color="text.secondary">
                          {selectedFilter === 'all' 
                            ? 'No teacher requests found.' 
                            : `No ${selectedFilter} teacher requests found.`
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : paginatedRequests.map((request) => (
                    <TableRow key={request.id} hover sx={{ '& .MuiTableCell-root': { padding: '8px 16px' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            src={request.profilePic} 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              mr: 1.5,
                              bgcolor: '#1976d2'
                            }}
                          >
                            <Person />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.875rem', lineHeight: 1.2 }}>
                              {request.fullName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {request.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.875rem' }}>
                          {formatDate(request.requestDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getStatusIcon(request.status)}
                          {request.status === 'approved' ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#4caf50', 
                                fontWeight: 500,
                                textTransform: 'capitalize',
                                fontSize: '0.875rem'
                              }}
                            >
                              {request.status}
                            </Typography>
                          ) : request.status === 'denied' ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#f44336', 
                                fontWeight: 500,
                                textTransform: 'capitalize',
                                fontSize: '0.875rem'
                              }}
                            >
                              {request.status}
                            </Typography>
                          ) : (
                            <Chip 
                              label={request.status.charAt(0).toUpperCase() + request.status.slice(1)} 
                              color={getStatusColor(request.status)} 
                              size="small"
                              sx={{ height: 20, fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewDetails(request)}
                              sx={{ 
                                color: '#666',
                                '&:hover': { color: '#1976d2' }
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Edit Status">
                            <IconButton 
                              size="small" 
                              onClick={() => handleApprovalAction(request, request.status === 'approved' ? 'deny' : 'approve')}
                              sx={{ 
                                color: '#666',
                                '&:hover': { color: '#ff9800' }
                              }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          
                          {request.status === 'pending' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleApprovalAction(request, 'approve')}
                                  sx={{ 
                                    color: '#666',
                                    '&:hover': { color: '#4caf50' }
                                  }}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deny">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleApprovalAction(request, 'deny')}
                                  sx={{ 
                                    color: '#666',
                                    '&:hover': { color: '#f44336' }
                                  }}
                                >
                                  <Cancel />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Delete Account">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteRequest(request)}
                              sx={{ 
                                color: '#666',
                                '&:hover': { color: '#d32f2f' }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 8]}
              component="div"
              count={filteredRequests.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
                borderTop: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0'
              }}
            />
          </>
        )}

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <School sx={{ mr: 1, color: '#86B0BD' }} />
            <Typography variant="h6">
              Teacher Request Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Personal Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          src={selectedRequest.profilePic} 
                          sx={{ width: 60, height: 60, mr: 2, bgcolor: '#1976d2' }}
                        >
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight={600}>
                            {selectedRequest.fullName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Teacher Applicant
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Email sx={{ mr: 1, color: '#86B0BD' }} />
                        <Typography variant="body2">
                          {selectedRequest.email}
                        </Typography>
                      </Box>
                      {selectedRequest.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Phone sx={{ mr: 1, color: '#86B0BD' }} />
                          <Typography variant="body2">
                            {selectedRequest.phone}
                          </Typography>
                        </Box>
                      )}
                      {selectedRequest.address && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationOn sx={{ mr: 1, color: '#86B0BD' }} />
                          <Typography variant="body2">
                            {selectedRequest.address}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Request Information
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Request Date:</strong> {formatDate(selectedRequest.requestDate)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Status:</strong> 
                        <Chip 
                          label={selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)} 
                          color={getStatusColor(selectedRequest.status)} 
                          size="small" 
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      {selectedRequest.reviewDate && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Reviewed:</strong> {formatDate(selectedRequest.reviewDate)}
                        </Typography>
                      )}
                      {selectedRequest.reviewReason && (
                        <Typography variant="body2">
                          <strong>Review Reason:</strong> {selectedRequest.reviewReason}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog 
        open={approvalDialog} 
        onClose={() => setApprovalDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {approvalAction === 'approve' ? (
              <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
            ) : (
              <Cancel sx={{ mr: 1, color: 'error.main' }} />
            )}
            <Typography variant="h6">
              {approvalAction === 'approve' ? 'Approve' : 'Deny'} Teacher Request
              {selectedRequest && selectedRequest.status !== 'pending' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  (Changing from {selectedRequest.status})
                </Typography>
              )}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                You are about to <strong>{approvalAction}</strong> the teacher request for:
                {selectedRequest.status !== 'pending' && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Current status: <strong>{selectedRequest.status}</strong> → New status: <strong>{approvalAction === 'approve' ? 'approved' : 'denied'}</strong>
                  </Typography>
                )}
              </Typography>
              
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedRequest.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {selectedRequest.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Request Date: {formatDate(selectedRequest.requestDate)}
                </Typography>
              </Card>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason (Optional)"
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder={`Enter reason for ${approvalAction === 'approve' ? 'approval' : 'denial'}...`}
                helperText={`This reason will be included in the notification to the teacher`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setApprovalDialog(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            onClick={handleSubmitApproval}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : null}
          >
            {processing ? 'Processing...' : `${approvalAction === 'approve' ? 'Approve' : 'Deny'} & Notify`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog} 
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Delete sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="h6">
              Delete Teacher Account
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600}>
                  Warning: This action cannot be undone!
                </Typography>
                <Typography variant="body2">
                  This will permanently delete the teacher's account and all associated data.
                </Typography>
              </Alert>
              
              <Typography variant="body1" gutterBottom>
                You are about to delete the teacher account for:
              </Typography>
              
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedRequest.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {selectedRequest.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Request Date: {formatDate(selectedRequest.requestDate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                </Typography>
              </Card>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for Deletion (Optional)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for account deletion..."
                helperText="This reason will be included in the notification to the teacher"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitDelete}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <Delete />}
          >
            {processing ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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
