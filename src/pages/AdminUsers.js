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
  Snackbar
} from '@mui/material';
import { Edit, Delete, PersonAdd, Refresh } from '@mui/icons-material';
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

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      setSnackbar({ open: true, message: 'Error loading users', severity: 'error' });
    } finally {
      setLoading(false);
    }
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

  const roleCounts = users.reduce((acc, user) => {
    const role = user.role || 'Unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }}>
          User Management
        </Typography>
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

      <Alert severity="info" sx={{ mb: 3 }}>
        Manage user accounts and assign roles. Only Admin can access this page.
      </Alert>

      {/* Role Statistics */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(roleCounts).map(([role, count]) => (
          <Paper key={role} sx={{ p: 2, minWidth: 150, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color={getRoleColor(role)}>
              {count}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {role}
            </Typography>
          </Paper>
        ))}
      </Box>

      <TableContainer component={Paper} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Current Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
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
            ))}
          </TableBody>
        </Table>
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
          loadUsers(); // Refresh the list after creating a user
        }} 
      />
    </Box>
  );
}

