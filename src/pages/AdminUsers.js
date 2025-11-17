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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  useTheme,
  Alert,
  Snackbar,
  TablePagination,
  Grid,
  InputAdornment
} from '@mui/material';
import { Edit, Delete, PersonAdd, Refresh, Search } from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ROLES } from '../utils/roles';
import CreateUsers from '../components/CreateUsers';

export default function AdminUsers() {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
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
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setFilteredUsers(usersData);
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
      setSnackbar({ open: true, message: 'User role updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      setSnackbar({ open: true, message: 'Error updating role', severity: 'error' });
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'error',
      'Staff': 'warning',
      'Teacher': 'info',
      'Student': 'success'
    };
    return colors[role] || 'default';
  };

  const roleCounts = filteredUsers.reduce((acc, user) => {
    const role = user.role || 'Unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: '#8B0000' }}>
          User Management
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Manage user accounts and assign roles. Only Admin can access this page.
      </Alert>

      {/* Role Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(roleCounts).map(([role, count]) => (
          <Grid item xs={12} sm={6} md={3} key={role}>
            <Paper sx={{ 
              p: 3, 
              textAlign: 'center', 
              width: '100%',
              borderLeft: '4px solid',
              borderLeftColor: '#8B0000',
              transition: 'all 0.3s',
              '&:hover': {
                borderLeftColor: '#A52A2A'
              }
            }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {role}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Buttons and Search above table */}
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
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCreateUserDialogOpen(true)}
            sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#a00000' } }}
          >
            Create User
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadUsers}
            sx={{ borderColor: '#800000', color: '#800000', '&:hover': { borderColor: '#a00000', bgcolor: 'rgba(128, 0, 0, 0.04)' } }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

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
                <TableRow key={user.id}>
                  <TableCell>{user.email || 'N/A'}</TableCell>
                  <TableCell>{user.fullName || user.firstName + ' ' + user.lastName || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role || 'Unknown'} 
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditRole(user)}
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
                <MenuItem value="Staff">Staff</MenuItem>
                <MenuItem value="Teacher">Teacher</MenuItem>
                <MenuItem value="Student">Student</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRole} variant="contained" sx={{ bgcolor: '#800000' }}>
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

      {/* Create User Dialog */}
      <CreateUsers 
        open={createUserDialogOpen} 
        onClose={() => {
          setCreateUserDialogOpen(false);
        }}
        onSuccess={() => {
          setCreateUserDialogOpen(false);
          loadUsers(); // Refresh the list after creating a user
        }}
        preserveAdminSession={true}
      />
    </Box>
  );
}

