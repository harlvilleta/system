import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  TablePagination
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Person,
  School,
  Email,
  Warning,
  Schedule,
  CheckCircleOutline,
  CancelOutlined,
  Help
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

const statusColors = {
  'Open': 'info',
  'In Progress': 'warning',
  'Pending': 'warning',
  'Resolved': 'success'
};

// Penalty mapping based on severity level
const getPenalty = (severity) => {
  switch(severity) {
    case 'Level 1': return 'Warning';
    case 'Level 2': return 'Suspension';
    case 'Level 3': return 'Dropping/Dismissal';
    case 'Level 4': return 'Expulsion';
    default: return 'N/A';
  }
};

// Severity colors for Level 1-4
const severityColors = {
  'Level 1': 'success',
  'Level 2': 'warning',
  'Level 3': 'error',
  'Level 4': 'error'
};

export default function ViolationReview() {
  const theme = useTheme();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  useEffect(() => {
    fetchViolations();
  }, []);

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'violations'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const violationsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setViolations(violationsData);
    } catch (error) {
      console.error('Error fetching violations:', error);
      setSnackbar({ open: true, message: 'Error fetching violations', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (violation) => {
    setSelectedViolation(violation);
    setViewDialog(true);
  };


  const handleApprovalAction = (violation, action) => {
    setSelectedViolation(violation);
    setApprovalAction(action);
    setApprovalReason('');
    setApprovalDialog(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedViolation) return;

    setProcessing(true);
    try {
      const newStatus = approvalAction === 'approve' ? 'Resolved' : 'Pending';
      const actionText = approvalAction === 'approve' ? 'resolved' : 'kept pending';

      // Update violation status
      await updateDoc(doc(db, 'violations', selectedViolation.id), {
        status: newStatus,
        adminReviewed: true,
        adminDecision: approvalAction === 'approve' ? 'Resolved' : 'Pending',
        adminReviewDate: new Date().toISOString(),
        adminReviewReason: approvalReason.trim() || null,
        updatedAt: new Date().toISOString()
      });

      // Create notification for the student
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedViolation.studentId,
        recipientEmail: selectedViolation.studentEmail,
        recipientName: selectedViolation.studentName,
        title: `Violation Case ${newStatus}`,
        message: `Your violation case (${selectedViolation.violationType}) has been ${newStatus.toLowerCase()}.${approvalReason ? ` Reason: ${approvalReason}` : ''}`,
        type: 'violation_decision',
        violationId: selectedViolation.id,
        senderId: 'admin',
        senderEmail: 'admin@school.com',
        senderName: 'Administration',
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high'
      });

      // Create comprehensive notification for the teacher
      const teacherNotificationMessage = `
✅ VIOLATION REPORT DECISION

Dear ${selectedViolation.reportedByName || 'Teacher'},

Your violation report has been reviewed and ${newStatus.toLowerCase()} by the administration.

📋 REPORT DETAILS:
• Student: ${selectedViolation.studentName || 'N/A'}
• Student ID: ${selectedViolation.studentId || 'N/A'}
• Violation Type: ${selectedViolation.violationType || selectedViolation.violation || 'N/A'}
• Severity: ${selectedViolation.severity || 'N/A'}
• Date Reported: ${selectedViolation.date || 'N/A'}
• Location: ${selectedViolation.location || 'N/A'}

📝 ADMIN DECISION: ${newStatus}
${approvalReason ? `Reason: ${approvalReason}` : ''}

${newStatus === 'Approved' ? 
  '✅ The violation has been approved and appropriate action will be taken.' : 
  '❌ The violation report has been denied. Please review the reason provided above.'}

For any questions or concerns, please contact the administration office.

Best regards,
School Administration
      `.trim();

      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedViolation.reportedBy,
        recipientEmail: selectedViolation.reportedByEmail,
        recipientName: selectedViolation.reportedByName,
        title: `🎯 Violation Report ${newStatus}: ${selectedViolation.studentName}`,
        message: teacherNotificationMessage,
        type: 'violation_decision',
        violationId: selectedViolation.id,
        senderId: 'admin',
        senderEmail: 'admin@school.com',
        senderName: 'Administration',
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high',
        violationDetails: {
          studentName: selectedViolation.studentName,
          studentId: selectedViolation.studentId,
          violationType: selectedViolation.violationType || selectedViolation.violation,
          severity: selectedViolation.severity,
          date: selectedViolation.date,
          location: selectedViolation.location,
          decision: newStatus,
          reason: approvalReason
        }
      });

      // Log the admin decision
      await addDoc(collection(db, 'violation_reviews'), {
        violationId: selectedViolation.id,
        violationType: selectedViolation.violationType,
        studentName: selectedViolation.studentName,
        teacherName: selectedViolation.reportedByName,
        action: newStatus,
        reason: approvalReason.trim() || null,
        reviewedBy: 'Admin',
        reviewedAt: new Date().toISOString()
      });

      setSnackbar({ 
        open: true, 
        message: `Violation case ${actionText}! Notifications sent to student and teacher.`, 
        severity: 'success' 
      });

      setApprovalDialog(false);
      setSelectedViolation(null);
      fetchViolations(); // Refresh the list

    } catch (error) {
      console.error('Error updating violation:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error processing approval. Please try again.', 
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleOutline color="success" />;
      case 'Denied':
        return <CancelOutlined color="error" />;
      case 'Pending':
        return <Schedule color="warning" />;
      default:
        return <Warning color="default" />;
    }
  };

  // Paginated data
  const paginatedViolations = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return violations.slice(startIndex, endIndex);
  }, [violations, page, rowsPerPage]);

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Violation Review & Approval
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Review teacher-reported violations and approve or deny cases. Both students and teachers will be notified of your decision.
      </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading violations...
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  bgcolor: '#800000' 
                }}>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                    color: '#ffffff', 
                    fontWeight: 600 
                  }}>Date Reported</TableCell>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                    color: '#ffffff', 
                    fontWeight: 600 
                  }}>Student</TableCell>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                    color: '#ffffff', 
                    fontWeight: 600 
                  }}>Teacher</TableCell>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                    color: '#ffffff', 
                    fontWeight: 600 
                  }}>Violation Type</TableCell>
                    <TableCell sx={{ 
                    bgcolor: '#800000',
                    color: '#ffffff', 
                    fontWeight: 600 
                  }}>Severity</TableCell>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                    color: '#ffffff', 
                    fontWeight: 600 
                  }}>Penalty</TableCell>
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
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="h6" color="text.secondary">
                        No violations found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedViolations.map((violation) => (
                  <TableRow key={violation.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDate(violation.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            mr: 1,
                            bgcolor: '#1976d2'
                          }}
                        >
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {violation.studentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {violation.studentIdNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {violation.reportedByName || violation.reportedBy || 'Unknown Teacher'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {violation.violationType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={violation.severity || 'N/A'} 
                        size="small" 
                        color={severityColors[violation.severity] || 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={violation.penalty || getPenalty(violation.severity) || 'N/A'} 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          bgcolor: 'transparent', 
                          borderRadius: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {violation.status === 'Resolved' ? (
                            <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />
                          ) : violation.status === 'In Progress' ? (
                            <Schedule sx={{ fontSize: 14, color: '#ff9800' }} />
                          ) : violation.status === 'Pending' ? (
                            <Schedule sx={{ fontSize: 14, color: '#ff9800' }} />
                          ) : violation.status === 'Open' ? (
                            <Help sx={{ fontSize: 14, color: '#2196f3' }} />
                          ) : (
                            <Help sx={{ fontSize: 14, color: '#9e9e9e' }} />
                          )}
                        </Box>
                        <Chip 
                          label={violation.status || 'N/A'} 
                          size="small" 
                          color={statusColors[violation.status] || 'default'}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDetails(violation)}
                          sx={{ 
                            color: '#666',
                            '&:hover': { color: '#1976d2' }
                          }}
                        >
                          <Visibility sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 8, 10, 25]}
              component="div"
              count={violations.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
                borderTop: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0'
              }}
            />
          </TableContainer>
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
            <Visibility sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Violation Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedViolation && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    {selectedViolation.violationType}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Student Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: '#1976d2' }} />
                        <Typography variant="body1" fontWeight={500}>
                          {selectedViolation.studentName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <School sx={{ mr: 1, color: '#1976d2' }} />
                        <Typography variant="body2" color="text.secondary">
                          ID: {selectedViolation.studentIdNumber}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ mr: 1, color: '#1976d2' }} />
                        <Typography variant="body2" color="text.secondary">
                          {selectedViolation.studentEmail}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Teacher Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: '#86B0BD' }} />
                        <Typography variant="body1" fontWeight={500}>
                          {selectedViolation.reportedByName || selectedViolation.reportedBy || 'Unknown Teacher'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Violation Details
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Type:</strong> {selectedViolation.violationType}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Severity:</strong> 
                          <Chip 
                            label={selectedViolation.severity || 'N/A'} 
                            size="small" 
                            color={severityColors[selectedViolation.severity] || 'default'}
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Penalty:</strong> 
                          <Chip 
                            label={selectedViolation.penalty || getPenalty(selectedViolation.severity) || 'N/A'} 
                            size="small" 
                            color="secondary"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Status:</strong> 
                          <Chip 
                            label={selectedViolation.status || 'N/A'} 
                            size="small" 
                            color={statusColors[selectedViolation.status] || 'default'}
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Date:</strong> {selectedViolation.date}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Time:</strong> {selectedViolation.time}
                        </Typography>
                      </Grid>
                      {selectedViolation.location && (
                        <Grid item xs={12}>
                          <Typography variant="body2">
                            <strong>Location:</strong> {selectedViolation.location}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          <strong>Description:</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                          {selectedViolation.description}
                        </Typography>
                      </Grid>
                      {selectedViolation.resolution && (
                        <Grid item xs={12}>
                          <Typography variant="body2">
                            <strong>Resolution:</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                            {selectedViolation.resolution}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>
                
                {selectedViolation.adminReviewed && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Admin Review
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e8f5e8' }}>
                      <Typography variant="body2">
                        <strong>Decision:</strong> {selectedViolation.adminDecision}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Reviewed:</strong> {formatDate(selectedViolation.adminReviewDate)}
                      </Typography>
                      {selectedViolation.adminReviewReason && (
                        <Typography variant="body2">
                          <strong>Reason:</strong> {selectedViolation.adminReviewReason}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            size="small"
            onClick={() => setViewDialog(false)}
            sx={{
              color: '#000000',
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                borderColor: '#800000'
              }
            }}
          >
            Close
          </Button>
          {selectedViolation && (selectedViolation.status === 'Pending' || selectedViolation.status === 'Open' || selectedViolation.status === 'In Progress') && (
            <>
              <Button
                size="small"
                startIcon={<CheckCircle />}
                onClick={() => {
                  setViewDialog(false);
                  handleApprovalAction(selectedViolation, 'approve');
                }}
                sx={{
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  border: '1px solid #000000',
                  '&:hover': {
                    backgroundColor: '#800000',
                    color: '#ffffff',
                    borderColor: '#800000'
                  }
                }}
              >
                Resolve
              </Button>
              <Button
                size="small"
                startIcon={<Cancel />}
                onClick={() => {
                  setViewDialog(false);
                  handleApprovalAction(selectedViolation, 'deny');
                }}
                sx={{
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  border: '1px solid #000000',
                  '&:hover': {
                    backgroundColor: '#800000',
                    color: '#ffffff',
                    borderColor: '#800000'
                  }
                }}
              >
                Keep Pending
              </Button>
            </>
          )}
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
              {approvalAction === 'approve' ? 'Resolve' : 'Keep Pending'} Violation Case
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedViolation && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                You are about to <strong>{approvalAction === 'approve' ? 'resolve' : 'keep pending'}</strong> the following violation case:
              </Typography>
              
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedViolation.violationType}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Student: {selectedViolation.studentName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reported by: {selectedViolation.reportedByName || selectedViolation.reportedBy || 'Unknown Teacher'}
                </Typography>
              </Card>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason (Optional)"
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder={`Enter reason for ${approvalAction === 'approve' ? 'resolution' : 'keeping pending'}...`}
                helperText={`This reason will be included in notifications to both the student and teacher`}
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
            {processing ? 'Processing...' : `${approvalAction === 'approve' ? 'Resolve' : 'Keep Pending'} & Notify`}
          </Button>
        </DialogActions>
      </Dialog>

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