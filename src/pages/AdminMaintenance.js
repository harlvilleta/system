import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  useTheme,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid
} from '@mui/material';
import { Storage, CloudUpload, Build, Warning } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminMaintenance() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [dbStats, setDbStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const handleMaintenanceAction = (type) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const loadDatabaseStats = async () => {
    try {
      setLoadingStats(true);
      const collections = ['users', 'students', 'violations', 'activities', 'announcements', 'notifications', 'activity_log'];
      const stats = [];
      
      for (const colName of collections) {
        try {
          const snapshot = await getDocs(collection(db, colName));
          stats.push({
            name: colName,
            count: snapshot.size,
            status: snapshot.size > 0 ? 'Active' : 'Empty'
          });
        } catch (error) {
          console.error(`Error loading ${colName}:`, error);
        }
      }
      
      setDbStats(stats);
    } catch (error) {
      console.error('Error loading database stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleConfirmAction = async () => {
    setLoading(true);
    try {
      // Placeholder for maintenance actions
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSnackbar({ open: true, message: `${dialogType} operation completed`, severity: 'success' });
      setDialogOpen(false);
      loadDatabaseStats(); // Refresh stats after operation
    } catch (error) {
      setSnackbar({ open: true, message: 'Error performing operation', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const maintenanceActions = [
    {
      title: 'Database Management',
      description: 'View database statistics, optimize collections, and manage indexes',
      icon: <Storage />,
      color: '#1976d2',
      action: () => handleMaintenanceAction('Database Optimization')
    },
    {
      title: 'Backup & Restore',
      description: 'Create system backups, restore from backups, and manage backup schedules',
      icon: <CloudUpload />,
      color: '#2e7d32',
      action: () => handleMaintenanceAction('Backup')
    },
    {
      title: 'Data Cleanup',
      description: 'Remove old data, archive records, and optimize storage usage',
      icon: <Build />,
      color: '#ed6c02',
      action: () => handleMaintenanceAction('Data Cleanup')
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a', mb: 3 }}>
        System Maintenance
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography fontWeight={600}>Warning:</Typography> Maintenance operations can affect system performance. Perform these actions during low-usage periods.
      </Alert>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {maintenanceActions.map((action, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card
              sx={{
                height: '100%',
                bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
                border: `2px solid ${action.color}`,
                borderLeft: `6px solid ${action.color}`,
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${action.color}20`, color: action.color, mr: 2 }}>
                    {action.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {action.description}
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={action.action}
                  sx={{ bgcolor: action.color, '&:hover': { bgcolor: action.color, opacity: 0.9 } }}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Database Statistics */}
      <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #1976d2' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#1976d2', mb: 3 }}>
          Database Statistics
        </Typography>
        {loadingStats ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#1976d2' }}>Collection</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#2e7d32' }}>Document Count</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#ed6c02' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dbStats.map((stat, index) => (
                  <TableRow key={stat.name} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{stat.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={stat.count} 
                        sx={{ 
                          bgcolor: '#1976d2',
                          color: 'white',
                          fontWeight: 700
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={stat.status} 
                        color={stat.status === 'Active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !loading && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogType}</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Alert severity="info">
              This feature will be fully implemented in the next update. Maintenance operations will be available through Firebase Admin SDK or Cloud Functions.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirmAction} variant="contained" disabled={loading} sx={{ bgcolor: '#800000' }}>
            {loading ? 'Processing...' : 'Confirm'}
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

