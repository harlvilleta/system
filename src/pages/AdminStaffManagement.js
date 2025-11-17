import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
  useTheme,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  TablePagination,
  Grid
} from '@mui/material';
import { Search, Edit, Refresh, PersonAdd } from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import CreateUsers from '../components/CreateUsers';

export default function AdminStaffManagement() {
  const theme = useTheme();
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    filterStaff();
    setPage(0); // Reset to first page when filtering
  }, [searchTerm, staff]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      // Try with orderBy first, fallback to without if it fails (e.g., missing index or createdAt field)
      let snapshot;
      try {
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'Staff'), orderBy('createdAt', 'desc'));
        snapshot = await getDocs(usersQuery);
      } catch (orderByError) {
        // If orderBy fails, try without it
        console.warn('OrderBy failed, loading without sorting:', orderByError);
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'Staff'));
        snapshot = await getDocs(usersQuery);
        // Sort manually by createdAt if available
        const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        staffData.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        });
        setStaff(staffData);
        setFilteredStaff(staffData);
        return;
      }
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(staffData);
      setFilteredStaff(staffData);
    } catch (error) {
      console.error('Error loading staff:', error);
      setSnackbar({ open: true, message: `Error loading staff: ${error.message || 'Please check your connection and try again'}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staff];
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredStaff(filtered);
  };

  const handleEditStatus = (staffMember) => {
    setSelectedStaff(staffMember);
    setNewStatus(staffMember.staffInfo?.status || 'active');
    setEditDialogOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedStaff) return;
    try {
      await updateDoc(doc(db, 'users', selectedStaff.id), {
        'staffInfo.status': newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      });
      setSnackbar({ open: true, message: 'Staff status updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      loadStaff();
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({ open: true, message: 'Error updating status', severity: 'error' });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': '#2e7d32',
      'inactive': '#d32f2f',
      'suspended': '#ed6c02'
    };
    return colors[status] || '#9c27b0';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: '#8B0000' }}>
          Staff Management
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3, bgcolor: '#e3f2fd', border: '1px solid #1976d2' }}>
        Manage staff accounts, view status, and control access. Staff members handle day-to-day operations.
      </Alert>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ 
            p: 3, 
            bgcolor: 'transparent', 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a', 
            textAlign: 'center', 
            border: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`, 
            width: '100%',
            borderLeft: '4px solid',
            borderLeftColor: '#8B0000',
            transition: 'all 0.3s',
            '&:hover': {
              borderLeftColor: '#A52A2A'
            }
          }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>{staff.length}</Typography>
            <Typography variant="body2">Total Staff</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ 
            p: 3, 
            bgcolor: 'transparent', 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a', 
            textAlign: 'center', 
            border: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`, 
            width: '100%',
            borderLeft: '4px solid',
            borderLeftColor: '#8B0000',
            transition: 'all 0.3s',
            '&:hover': {
              borderLeftColor: '#A52A2A'
            }
          }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
              {staff.filter(s => s.staffInfo?.status === 'active').length}
            </Typography>
            <Typography variant="body2">Active</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ 
            p: 3, 
            bgcolor: 'transparent', 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a', 
            textAlign: 'center', 
            border: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`, 
            width: '100%',
            borderLeft: '4px solid',
            borderLeftColor: '#8B0000',
            transition: 'all 0.3s',
            '&:hover': {
              borderLeftColor: '#A52A2A'
            }
          }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
              {staff.filter(s => s.staffInfo?.status === 'inactive').length}
            </Typography>
            <Typography variant="body2">Inactive</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Buttons and Search above table */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search staff by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
          sx={{ maxWidth: 400, flexGrow: 0 }}
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ bgcolor: '#8B0000', '&:hover': { bgcolor: '#A52A2A' } }}
          >
            Add Staff
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadStaff}
            sx={{ borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1565c0', bgcolor: 'rgba(25, 118, 210, 0.04)' } }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Staff Table */}
      <TableContainer component={Paper} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No staff members found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((staffMember) => (
                <TableRow key={staffMember.id} hover>
                  <TableCell>{staffMember.fullName || 'N/A'}</TableCell>
                  <TableCell>{staffMember.email || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={staffMember.staffInfo?.status || 'active'} 
                      sx={{ 
                        bgcolor: getStatusColor(staffMember.staffInfo?.status || 'active'),
                        color: 'white',
                        fontWeight: 600
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{staffMember.staffInfo?.department || 'General'}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditStatus(staffMember)}
                      sx={{ color: '#1976d2' }}
                    >
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredStaff.length}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[8]}
        />
      </TableContainer>

      {/* Edit Status Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Staff Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Email"
              value={selectedStaff?.email || ''}
              disabled
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveStatus} variant="contained" sx={{ bgcolor: '#ed6c02' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <CreateUsers 
        open={createDialogOpen} 
        onClose={() => {
          setCreateDialogOpen(false);
        }}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadStaff();
        }}
        preserveAdminSession={true}
      />
    </Box>
  );
}

