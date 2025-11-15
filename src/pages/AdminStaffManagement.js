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
  Alert
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

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [searchTerm, staff]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'Staff'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(staffData);
      setFilteredStaff(staffData);
    } catch (error) {
      console.error('Error loading staff:', error);
      setSnackbar({ open: true, message: 'Error loading staff', severity: 'error' });
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
        <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }}>
          Staff Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ bgcolor: '#ed6c02', '&:hover': { bgcolor: '#f57c00' } }}
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

      <Alert severity="info" sx={{ mb: 3, bgcolor: '#e3f2fd', border: '1px solid #1976d2' }}>
        Manage staff accounts, view status, and control access. Staff members handle day-to-day operations.
      </Alert>

      {/* Statistics */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, minWidth: 150, bgcolor: '#1976d2', color: 'white', textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700}>{staff.length}</Typography>
          <Typography variant="body2">Total Staff</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 150, bgcolor: '#2e7d32', color: 'white', textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700}>
            {staff.filter(s => s.staffInfo?.status === 'active').length}
          </Typography>
          <Typography variant="body2">Active</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 150, bgcolor: '#ed6c02', color: 'white', textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700}>
            {staff.filter(s => s.staffInfo?.status === 'inactive').length}
          </Typography>
          <Typography variant="body2">Inactive</Typography>
        </Paper>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
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
        sx={{ mb: 3 }}
      />

      {/* Staff Table */}
      <TableContainer component={Paper} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #1976d2' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#e3f2fd' }}>
              <TableCell sx={{ fontWeight: 700, color: '#1976d2' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#2e7d32' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ed6c02' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#9c27b0' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#d32f2f' }}>Actions</TableCell>
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
              filteredStaff.map((staffMember) => (
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
          loadStaff();
        }} 
      />
    </Box>
  );
}

