import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  useTheme,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  TablePagination,
  InputAdornment
} from '@mui/material';
import { People, Settings, Refresh, Edit, Search } from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ROLES } from '../utils/roles';

export default function AdminRoleAssignment() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [roleStats, setRoleStats] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
    setPage(0); // Reset to first page when filtering
    // Recalculate role stats from all users (not filtered)
    const stats = {};
    users.forEach(user => {
      const role = user.role || 'Unknown';
      stats[role] = (stats[role] || 0) + 1;
    });
    setRoleStats(stats);
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setFilteredUsers(usersData);

      // Calculate role statistics
      const stats = {};
      usersData.forEach(user => {
        const role = user.role || 'Unknown';
        stats[role] = (stats[role] || 0) + 1;
      });
      setRoleStats(stats);
    } catch (error) {
      console.error('Error loading users:', error);
      setSnackbar({ open: true, message: 'Error loading users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.firstName + ' ' + user.lastName)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredUsers(filtered);
  };

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setNewRole(user.role || 'Student');
    setEditDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser || !newRole) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        role: newRole,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      });
      setSnackbar({ open: true, message: 'Role updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      setSnackbar({ open: true, message: 'Error updating role', severity: 'error' });
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': '#d32f2f',
      'Staff': '#ed6c02',
      'Teacher': '#1976d2',
      'Student': '#2e7d32'
    };
    return colors[role] || '#9c27b0';
  };

  const roleCards = [
    { role: 'Admin', color: '#8B0000', description: 'System administrators' },
    { role: 'Staff', color: '#A52A2A', description: 'Day-to-day operations' },
    { role: 'Teacher', color: '#800000', description: 'Teaching staff' },
    { role: 'Student', color: '#722F37', description: 'Student accounts' }
  ];

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
          Role Assignment
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3, bgcolor: '#e3f2fd', border: '1px solid #1976d2' }}>
        Assign and manage user roles. Changes take effect immediately.
      </Alert>

      {/* Role Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {roleCards.map((roleCard, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ 
              height: '100%',
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
              border: `2px solid ${roleCard.color}`,
              borderLeft: '4px solid',
              borderLeftColor: '#8B0000',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                borderLeftColor: '#A52A2A'
              }
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#000000', mb: 1 }}>
                  {roleStats[roleCard.role] || 0}
                </Typography>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                  {roleCard.role}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {roleCard.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search and Refresh Button above table */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search users by name, email, or role..."
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
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadUsers}
          sx={{ borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1565c0', bgcolor: 'rgba(25, 118, 210, 0.04)' } }}
        >
          Refresh
        </Button>
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Current Role</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No users found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.email || 'N/A'}</TableCell>
                  <TableCell>{user.fullName || user.firstName + ' ' + user.lastName || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role || 'Unknown'} 
                      sx={{ 
                        bgcolor: getRoleColor(user.role),
                        color: 'white',
                        fontWeight: 600
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEditRole(user)}
                      sx={{ color: '#1976d2' }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredUsers.length}
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

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Email"
              value={selectedUser?.email || ''}
              disabled
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                label="Role"
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Staff">Staff</MenuItem>
                <MenuItem value="Teacher">Teacher</MenuItem>
                <MenuItem value="Student">Student</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRole} variant="contained" sx={{ bgcolor: '#9c27b0' }}>
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
    </Box>
  );
}

