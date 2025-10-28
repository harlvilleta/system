import { 
  collection, 
  getDocs, 
  orderBy, 
  query, 
  updateDoc, 
  doc, 
  addDoc,
  deleteDoc 
} from "firebase/firestore";
import { db } from "../firebase";
import React, { useEffect, useState } from "react";
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
  CircularProgress,
  Snackbar,
  Alert,
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
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  TablePagination,
  InputAdornment,
  Stack
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Visibility,
  Email,
  Person,
  Schedule,
  Warning,
  CheckCircleOutline,
  CancelOutlined,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search,
  Print,
  Download,
  Refresh
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";




const priorityColors = {
  'Normal': 'default',
  'High': 'warning',
  
  'Urgent': 'error'
};

export default function AnnouncementReport() {
  const theme = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', message: '', category: '', priority: 'Normal' });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Reset page when search term changes
  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {

      const qSnap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
      const announcementsData = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(announcementsData);
    } catch (e) {
      console.error('Error fetching announcements:', e);
      setAnnouncements([]);
      setSnackbar({ open: true, message: 'Failed to fetch announcements.', severity: 'error' });
    }
    setLoading(false);
  };


  const handleViewDetails = (announcement) => {
    setSelectedAnnouncement(announcement);
    setViewDialog(true);
  };

  const handleEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setEditForm({
      title: announcement.title || '',
      message: announcement.message || '',
      category: announcement.category || 'General',
      priority: announcement.priority || 'Normal'
    });
    setEditDialog(true);
  };

  const handleDelete = async (announcement) => {
    if (window.confirm(`Are you sure you want to delete "${announcement.title}"?`)) {
      try {
        await deleteDoc(doc(db, "announcements", announcement.id));
        setSnackbar({ 
          open: true, 
          message: 'Announcement deleted successfully.', 
          severity: 'success' 
        });
        fetchAnnouncements(); // Refresh the list
      } catch (error) {
        console.error('Error deleting announcement:', error);
        setSnackbar({ 
          open: true, 
          message: 'Error deleting announcement. Please try again.', 
          severity: 'error' 
        });
      }
    }
  };

  const handleApprovalAction = (announcement, action) => {
    setSelectedAnnouncement(announcement);
    setApprovalAction(action);
    setApprovalReason('');
    setApprovalDialog(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedAnnouncement) return;

    setProcessing(true);
    try {
      const newStatus = approvalAction === 'approve' ? 'Approved' : 'Denied';
      const actionText = approvalAction === 'approve' ? 'approved' : 'denied';

      // Update announcement status
      await updateDoc(doc(db, "announcements", selectedAnnouncement.id), {
        status: newStatus,
        reviewedBy: 'Admin',
        reviewedAt: new Date().toISOString(),
        reviewReason: approvalReason.trim() || null,
        reviewedByEmail: 'admin@school.com' // You can get this from current user
      });

      // Log the approval action
      await addDoc(collection(db, "announcement_reviews"), {
        announcementId: selectedAnnouncement.id,
        announcementTitle: selectedAnnouncement.title,
        action: newStatus,
        reason: approvalReason.trim() || null,
        reviewedBy: 'Admin',
        reviewedAt: new Date().toISOString(),
        teacherEmail: selectedAnnouncement.postedByEmail || selectedAnnouncement.postedBy,
        teacherName: selectedAnnouncement.postedByName || selectedAnnouncement.postedBy
      });

      // Send email notification (mock implementation)
      await sendEmailNotification(selectedAnnouncement, newStatus, approvalReason);

      setSnackbar({ 
        open: true, 
        message: `Announcement ${actionText} successfully! Email notification sent.`, 
        severity: 'success' 
      });

      setApprovalDialog(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements(); // Refresh the list

    } catch (error) {
      console.error('Error updating announcement:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error processing approval. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const sendEmailNotification = async (announcement, status, reason) => {
    // This is a mock implementation
    // In a real application, you would integrate with an email service
    console.log('Sending email notification:', {
      to: announcement.postedByEmail || announcement.postedBy,
      subject: `Announcement ${status}: ${announcement.title}`,
      body: `Your announcement "${announcement.title}" has been ${status.toLowerCase()}.${reason ? ` Reason: ${reason}` : ''}`
    });

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const getTeacherInfo = (announcement) => {
    const postedBy = announcement.postedBy || announcement.postedByName || 'Unknown';
    const email = announcement.postedByEmail || announcement.postedBy || 'No email';
    return { name: postedBy, email };
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
        return <CheckCircleOutline />;
      case 'Denied':
        return <CancelOutlined />;
      case 'Pending':
        return <Schedule />;
      default:
        return <Warning />;
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSaveEdit = async () => {
    if (!selectedAnnouncement) return;

    setProcessing(true);
    try {
      await updateDoc(doc(db, "announcements", selectedAnnouncement.id), {
        title: editForm.title,
        message: editForm.message,
        category: editForm.category,
        priority: editForm.priority,
        updatedAt: new Date().toISOString()
      });

      setSnackbar({ 
        open: true, 
        message: 'Announcement updated successfully.', 
        severity: 'success' 
      });

      setEditDialog(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements(); // Refresh the list

    } catch (error) {
      console.error('Error updating announcement:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error updating announcement. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = (announcement) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${announcement.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #800000; padding-bottom: 10px; margin-bottom: 20px; }
            .content { line-height: 1.6; }
            .meta { color: #666; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${announcement.title}</h1>
          </div>
          <div class="content">
            <p>${announcement.message}</p>
          </div>
          <div class="meta">
            <p><strong>Category:</strong> ${announcement.category || 'General'}</p>
            <p><strong>Priority:</strong> ${announcement.priority || 'Normal'}</p>
            <p><strong>Date:</strong> ${formatDate(announcement.createdAt)}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = (announcement) => {
    const data = {
      title: announcement.title,
      message: announcement.message,
      category: announcement.category || 'General',
      priority: announcement.priority || 'Normal',
      createdAt: formatDate(announcement.createdAt),
      teacher: getTeacherInfo(announcement).name
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${announcement.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    fetchAnnouncements();
    setSnackbar({ 
      open: true, 
      message: 'Data refreshed successfully.', 
      severity: 'success' 
    });
  };

  // Filter announcements based on search term
  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTeacherInfo(announcement).name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Announcement History
      </Typography>

      {/* Search Bar and Actions */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search announcements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            minWidth: 300,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          sx={{
            borderColor: '#800000',
            color: '#800000',
            '&:hover': {
              backgroundColor: '#800000',
              color: '#ffffff',
              borderColor: '#800000'
            }
          }}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
            Loading announcements...
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow >
                <TableCell sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>Date Submitted</TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAnnouncements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                      {searchTerm ? 'No announcements match your search.' : 'No announcements found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredAnnouncements
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((announcement) => {
                const teacherInfo = getTeacherInfo(announcement);
                const status = announcement.status || 'Pending';
                
                return (
                  <TableRow key={announcement.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                        {formatDate(announcement.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight={600} sx={{ maxWidth: 200, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                        {announcement.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                          {teacherInfo.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : 'text.secondary' }}>
                          {teacherInfo.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                        {announcement.category || 'General'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={announcement.priority || 'Normal'} 
                        size="small" 
                        color={priorityColors[announcement.priority || 'Normal']}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Tooltip title="View">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewDetails(announcement)}
                            sx={{
                              '&:hover': {
                                color: '#1976d2',
                                bgcolor: 'rgba(25, 118, 210, 0.04)'
                              }
                            }}
                          >
                            <Visibility sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEdit(announcement)}
                            sx={{
                              '&:hover': {
                                color: '#f57c00',
                                bgcolor: 'rgba(245, 124, 0, 0.04)'
                              }
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Print">
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrint(announcement)}
                            sx={{
                              '&:hover': {
                                color: '#666666',
                                bgcolor: 'rgba(102, 102, 102, 0.04)'
                              }
                            }}
                          >
                            <Print sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Download">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownload(announcement)}
                            sx={{
                              '&:hover': {
                                color: '#4caf50',
                                bgcolor: 'rgba(76, 175, 80, 0.04)'
                              }
                            }}
                          >
                            <Download sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDelete(announcement)}
                            sx={{
                              '&:hover': {
                                color: '#f44336',
                                bgcolor: 'rgba(244, 67, 54, 0.04)'
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 8, 10, 25]}
            component="div"
            count={filteredAnnouncements.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              '& .MuiTablePagination-toolbar': {
                paddingLeft: 2,
                paddingRight: 2,
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              }
            }}
          />
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog} 
        onClose={() => setEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EditIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Edit Announcement
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  value={editForm.message}
                  onChange={(e) => setEditForm({...editForm, message: e.target.value})}
                  variant="outlined"
                  multiline
                  rows={4}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={editForm.category}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    label="Category"
                  >
                    <MenuItem value="General">General</MenuItem>
                    <MenuItem value="Academic">Academic</MenuItem>
                    <MenuItem value="Event">Event</MenuItem>
                    <MenuItem value="Emergency">Emergency</MenuItem>
                    <MenuItem value="Administrative">Administrative</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                    label="Priority"
                  >
                    <MenuItem value="Normal">Normal</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={processing}
            sx={{
              backgroundColor: '#800000',
              '&:hover': {
                backgroundColor: '#600000'
              }
            }}
          >
            {processing ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

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
              Announcement Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAnnouncement && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    {selectedAnnouncement.title}
                  </Typography>
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
                          {getTeacherInfo(selectedAnnouncement).name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ mr: 1, color: '#86B0BD' }} />
                        <Typography variant="body2" color="text.secondary">
                          {getTeacherInfo(selectedAnnouncement).email}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Announcement Details
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Category:</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedAnnouncement.category || 'General'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Priority:</Typography>
                        <Chip 
                          label={selectedAnnouncement.priority || 'Normal'} 
                          size="small" 
                          color={priorityColors[selectedAnnouncement.priority || 'Normal']}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Status:</Typography>
                        <Chip 
                          label={selectedAnnouncement.status || 'Pending'} 
                          size="small" 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Message Content
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body1">
                      {selectedAnnouncement.message}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Additional Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Submitted:</strong> {formatDate(selectedAnnouncement.createdAt)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Audience:</strong> {selectedAnnouncement.audience || 'All'}
                      </Typography>
                    </Grid>
                    {selectedAnnouncement.reviewedAt && (
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          <strong>Reviewed:</strong> {formatDate(selectedAnnouncement.reviewedAt)} by {selectedAnnouncement.reviewedBy}
                        </Typography>
                        {selectedAnnouncement.reviewReason && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Reason:</strong> {selectedAnnouncement.reviewReason}
                          </Typography>
                        )}
                      </Grid>
                    )}
                  </Grid>
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
              <CheckCircle sx={{ mr: 1 }} />
            ) : (
              <Cancel sx={{ mr: 1 }} />
            )}
            <Typography variant="h6">
              {approvalAction === 'approve' ? 'Approve' : 'Deny'} Announcement
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAnnouncement && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                You are about to <strong>{approvalAction}</strong> the following announcement:
              </Typography>
              
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedAnnouncement.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  By: {getTeacherInfo(selectedAnnouncement).name}
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
                helperText={`This reason will be included in the email notification to ${getTeacherInfo(selectedAnnouncement).name}`}
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