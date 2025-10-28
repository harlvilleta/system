import React, { useEffect, useState, useMemo } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Snackbar, Alert, useTheme, TablePagination, Grid } from '@mui/material';
import { Visibility, CheckCircle, Cancel, Schedule, Warning } from '@mui/icons-material';
import { collection, getDocs, updateDoc, addDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function ActivityRequestsAdmin() {
  const theme = useTheme();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const load = async () => {
    try {
      const q = query(collection(db, 'activity_bookings'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setRequests([]);
      setSnackbar({ open: true, message: 'Failed to load booking requests', severity: 'error' });
    }
  };

  useEffect(() => { load(); }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedRequests = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return requests.slice(startIndex, startIndex + rowsPerPage);
  }, [requests, page, rowsPerPage]);

  const updateStatus = async (req, status) => {
    try {
      await updateDoc(doc(db, 'activity_bookings', req.id), { 
        status, 
        adminNotes: remarks || '', 
        updatedAt: new Date().toISOString(),
        reviewedBy: auth.currentUser?.email || 'Admin' 
      });
      // notify teacher (store a notification)
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: req.teacherId || null,
          recipientEmail: req.teacherEmail || null,
          recipientName: req.teacherName || null,
          title: 'Activity Booking ' + (status === 'approved' ? 'Approved' : 'Rejected'),
          message: `Your activity booking "${req.activity}" for ${req.resource} on ${new Date(req.date).toLocaleDateString()} was ${status}. ${remarks ? `Remarks: ${remarks}` : ''}`,
          type: 'activity_booking',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'normal'
        });
      } catch {}
      setSnackbar({ open: true, message: `Booking request ${status}`, severity: 'success' });
      setSelected(null);
      setRemarks('');
      load();
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to update booking request', severity: 'error' });
    }
  };

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>All Booking Requests</Typography>
      <TableContainer component={Paper} sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
      }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Teacher</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Department</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Activity</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Resource</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Date</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Time Range</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Status</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRequests.map(r => (
              <TableRow key={r.id}>
                <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                  {r.teacherName}
                </TableCell>
                <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                  {r.department}
                </TableCell>
                <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                  {r.activity}
                </TableCell>
                <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                  {r.resource}
                </TableCell>
                <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                  {new Date(r.date).toLocaleDateString()}
                </TableCell>
                <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                  {r.startTime && r.endTime 
                    ? `${r.startTime} - ${r.endTime}`
                    : r.time || 'N/A'
                  }
                </TableCell>
                <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
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
                      {r.status === 'approved' ? (
                        <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />
                      ) : r.status === 'rejected' ? (
                        <Cancel sx={{ fontSize: 14, color: '#f44336' }} />
                      ) : r.status === 'pending' ? (
                        <Schedule sx={{ fontSize: 14, color: '#ff9800' }} />
                      ) : (
                        <Warning sx={{ fontSize: 14, color: '#9e9e9e' }} />
                      )}
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: r.status === 'pending' ? '#ff9800' : 
                              r.status === 'approved' ? '#4caf50' : 
                              r.status === 'rejected' ? '#f44336' : '#000',
                        fontWeight: 500,
                        textTransform: 'capitalize'
                      }}
                    >
                      {r.status}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                  <IconButton 
                    onClick={() => setSelected(r)} 
                    size="small"
                    sx={{
                      '&:hover': { 
                        color: '#1976d2',
                        bgcolor: 'rgba(25, 118, 210, 0.04)'
                      }
                    }}
                  >
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 8, 10, 25]}
        component="div"
        count={requests.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          borderTop: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
        }}
      />

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>Booking Request Details</DialogTitle>
        <DialogContent>
          {selected && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#800000' }}>
                {selected.activity}
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      👤 Teacher Name
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selected.teacherName}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      🏢 Department
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selected.department}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      📅 Date
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {new Date(selected.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      📊 Status
                    </Typography>
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
                        {selected.status === 'approved' ? (
                          <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                        ) : selected.status === 'rejected' ? (
                          <Cancel sx={{ fontSize: 16, color: '#f44336' }} />
                        ) : selected.status === 'pending' ? (
                          <Schedule sx={{ fontSize: 16, color: '#ff9800' }} />
                        ) : (
                          <Warning sx={{ fontSize: 16, color: '#9e9e9e' }} />
                        )}
                      </Box>
                      <Typography 
                        variant="body1" 
                        fontWeight={500}
                        sx={{ 
                          color: selected.status === 'pending' ? '#ff9800' : 
                                selected.status === 'approved' ? '#4caf50' : 
                                selected.status === 'rejected' ? '#f44336' : '#000',
                          textTransform: 'capitalize'
                        }}
                      >
                        {selected.status}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      🏢 Resource/Place
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selected.resource}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      ⏰ Time Range
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selected.startTime && selected.endTime 
                        ? `${selected.startTime} - ${selected.endTime}`
                        : selected.time || 'N/A'
                      }
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      📝 Notes
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selected.notes || 'No additional notes'}
                    </Typography>
                  </Box>
                  
                  {selected.adminNotes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        💬 Admin Notes
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {selected.adminNotes}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
              
              <TextField 
                label="Admin Remarks" 
                value={remarks} 
                onChange={e => setRemarks(e.target.value)} 
                fullWidth 
                multiline 
                minRows={2} 
                sx={{ mt: 3 }} 
                placeholder="Add your review notes here..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
          {selected && selected.status === 'pending' && (
            <>
              <Button variant="outlined" color="error" onClick={() => updateStatus(selected, 'rejected')}>Reject</Button>
              <Button variant="contained" color="success" onClick={() => updateStatus(selected, 'approved')}>Approve</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


