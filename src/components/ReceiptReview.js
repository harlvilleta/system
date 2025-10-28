import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  InputAdornment,
  useTheme
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  ExpandMore,
  Receipt,
  Person,
  School,
  AttachMoney,
  Schedule,
  Done,
  Close
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  addDoc,
  where 
} from 'firebase/firestore';

const statusColors = {
  pending: 'primary',
  approved: 'primary',
  rejected: 'primary'
};

const statusIcons = {
  pending: <Schedule sx={{ fontSize: 14, color: '#ff9800' }} />,
  approved: <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />,
  rejected: <Cancel sx={{ fontSize: 14, color: '#f44336' }} />
};

const receiptTypeLabels = {
  membership: 'Membership Fee',
  student_id: 'Sling ID',
  handbook: 'Handbook',
  other: 'Other'
};

export default function ReceiptReview() {
  const theme = useTheme();
  const [submissions, setSubmissions] = useState([]); // full dataset
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setError('');
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const q = query(collection(db, 'receipt_submissions'), orderBy('submittedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const raw = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.() || new Date(doc.data().submittedAt)
      }));
      setSubmissions(raw);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setError('Failed to load submissions');
    }
  };

  const handleReview = (submission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.adminNotes || '');
    setReviewDialog(true);
  };

  const handleViewImage = (imageUrl) => {
    if (!imageUrl) {
      setError('No receipt image available for this submission');
      return;
    }
    setSelectedImage(imageUrl);
    setImageDialog(true);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedSubmission) return;
    
    setProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Admin not authenticated');
      }
      
      const submissionRef = doc(db, 'receipt_submissions', selectedSubmission.id);
      await updateDoc(submissionRef, {
        status: newStatus,
        adminNotes: adminNotes.trim(),
        reviewedBy: user.email,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Log activity
      try {
        await addDoc(collection(db, 'activity_log'), {
          message: `Receipt ${newStatus}: ${selectedSubmission.receiptType} - ₱${selectedSubmission.amount}`,
          type: 'receipt_review',
          user: selectedSubmission.userId,
          userEmail: selectedSubmission.userEmail,
          userRole: selectedSubmission.userRole,
          adminEmail: user.email,
          timestamp: new Date().toISOString(),
          details: {
            submissionId: selectedSubmission.id,
            receiptType: selectedSubmission.receiptType,
            amount: selectedSubmission.amount,
            status: newStatus,
            adminNotes: adminNotes.trim()
          }
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }
      
      setSuccess(`Receipt ${newStatus} successfully!`);
      setReviewDialog(false);
      fetchSubmissions(); // Refresh the list
      
    } catch (error) {
      console.error('Error updating submission:', error);
      setError('Failed to update submission status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusCount = (status) => {
    return submissions.filter(sub => sub.status === status).length;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const filteredSubmissions = useMemo(() => {
    // start from full dataset, then filter by selected status for display only
    const byStatus = statusFilter === 'all' ? submissions : submissions.filter(s => s.status === statusFilter);
    const byType = typeFilter === 'all' ? byStatus : byStatus.filter(s => s.receiptType === typeFilter);
    const bySearch = !searchTerm.trim() ? byType : byType.filter(s => {
      const term = searchTerm.toLowerCase();
      const name = (s.userName || '').toLowerCase();
      const sid = (s.studentInfo?.studentId || '').toLowerCase();
      return name.includes(term) || sid.includes(term);
    });
    // Ensure newest first
    return [...bySearch].sort((a, b) => (b.submittedAt?.getTime?.() || 0) - (a.submittedAt?.getTime?.() || 0));
  }, [submissions, statusFilter, typeFilter, searchTerm]);


  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Receipt Review
      </Typography>
      
      <Box sx={{ p: 3 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Status Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card sx={{ borderLeft: '4px solid #800000', minHeight: '80px' }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Button onClick={() => { setError(''); setStatusFilter('pending'); setPage(0); }} sx={{ color: 'inherit', textTransform: 'none' }}>
                  <Box>
                    <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>{getStatusCount('pending')}</Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>Pending Review</Typography>
                  </Box>
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ borderLeft: '4px solid #800000', minHeight: '80px' }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Button onClick={() => { setError(''); setStatusFilter('approved'); setPage(0); }} sx={{ color: 'inherit', textTransform: 'none' }}>
                  <Box>
                    <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>{getStatusCount('approved')}</Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>Approved</Typography>
                  </Box>
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ borderLeft: '4px solid #800000', minHeight: '80px' }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Button onClick={() => { setError(''); setStatusFilter('rejected'); setPage(0); }} sx={{ color: 'inherit', textTransform: 'none' }}>
                  <Box>
                    <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>{getStatusCount('rejected')}</Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>Rejected</Typography>
                  </Box>
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ borderLeft: '4px solid #800000', minHeight: '80px' }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Button onClick={() => { setError(''); setStatusFilter('all'); setPage(0); }} sx={{ color: 'inherit', textTransform: 'none' }}>
                  <Box>
                    <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>{submissions.length}</Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>Total Submissions</Typography>
                  </Box>
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Filter by Receipt Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Filter by Receipt Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="student_id">Sling ID</MenuItem>
              <MenuItem value="handbook">Handbook</MenuItem>
              <MenuItem value="membership">Membership Fee</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Search by Student ID or Name"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ minWidth: 200, maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No receipt submissions found
            </Typography>
          </Paper>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    bgcolor: '#800000' 
                  }}>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      color: '#ffffff', 
                      fontWeight: 600,
                      borderBottom: '2px solid #e0e0e0'
                    }}>
                      Student
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      color: '#ffffff', 
                      fontWeight: 600,
                      borderBottom: '2px solid #e0e0e0'
                    }}>
                      Receipt Type
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      color: '#ffffff', 
                      fontWeight: 600,
                      borderBottom: '2px solid #e0e0e0'
                    }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      color: '#ffffff', 
                      fontWeight: 600,
                      borderBottom: '2px solid #e0e0e0'
                    }}>
                      Status
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      color: '#ffffff', 
                      fontWeight: 600,
                      borderBottom: '2px solid #e0e0e0'
                    }}>
                      Submitted
                    </TableCell>
                    <TableCell sx={{
                      bgcolor: '#800000',
                      color: '#ffffff', 
                      fontWeight: 600,
                      borderBottom: '2px solid #e0e0e0'
                    }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSubmissions
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {submission.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {submission.userEmail}
                          </Typography>
                          {submission.studentInfo && (
                            <Typography variant="caption" display="block">
                              {submission.studentInfo.studentId} - {submission.studentInfo.course}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {receiptTypeLabels[submission.receiptType] || submission.receiptType}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {submission.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatAmount(submission.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {statusIcons[submission.status]}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: submission.status === 'pending' ? '#ff9800' : 
                                    submission.status === 'approved' ? '#4caf50' : 
                                    submission.status === 'rejected' ? '#800000' : '#000',
                              fontWeight: 500
                            }}
                          >
                            {submission.status === 'pending' ? 'Pending' :
                             submission.status === 'approved' ? 'Approval' :
                             submission.status === 'rejected' ? 'Rejected' : submission.status}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(submission.submittedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewImage(submission.receiptImage)}
                            color="primary"
                            sx={{
                              '&:hover': { 
                                color: '#1976d2',
                                bgcolor: 'rgba(25, 118, 210, 0.04)'
                              }
                            }}
                          >
                            <Visibility />
                          </IconButton>
                          {submission.status === 'pending' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleReview(submission)}
                            >
                              Review
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredSubmissions.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </>
        )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Review Receipt Submission
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Student Information</Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {selectedSubmission.userName}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {selectedSubmission.userEmail}
                </Typography>
                {selectedSubmission.studentInfo && (
                  <>
                    <Typography variant="body2">
                      <strong>Student ID:</strong> {selectedSubmission.studentInfo.studentId}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Course:</strong> {selectedSubmission.studentInfo.course}
                    </Typography>
                  </>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Receipt Details</Typography>
                <Typography variant="body2">
                  <strong>Type:</strong> {receiptTypeLabels[selectedSubmission.receiptType]}
                </Typography>
                <Typography variant="body2">
                  <strong>Amount:</strong> {formatAmount(selectedSubmission.amount)}
                </Typography>
                <Typography variant="body2">
                  <strong>Description:</strong> {selectedSubmission.description}
                </Typography>
                <Typography variant="body2">
                  <strong>Submitted:</strong> {formatDate(selectedSubmission.submittedAt)}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Receipt Image</Typography>
                <CardMedia
                  component="img"
                  image={selectedSubmission.receiptImage}
                  alt="Receipt"
                  sx={{ 
                    height: 300, 
                    objectFit: 'contain',
                    borderRadius: 1,
                    border: '1px solid #ddd'
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Admin Notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Add notes about this submission..."
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={() => handleStatusUpdate('rejected')}
            color="primary"
            variant="outlined"
            disabled={processing}
            startIcon={<Cancel />}
          >
            Reject
          </Button>
          <Button
            onClick={() => handleStatusUpdate('approved')}
            color="primary"
            variant="contained"
            disabled={processing}
            startIcon={<CheckCircle />}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
      </Box>

      {/* Image Dialog */}
      <Dialog open={imageDialog} onClose={() => setImageDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Receipt Image
          <IconButton
            onClick={() => setImageDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <CardMedia
            component="img"
            image={selectedImage}
            alt="Receipt"
            sx={{ 
              width: '100%',
              objectFit: 'contain',
              borderRadius: 1
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
} 