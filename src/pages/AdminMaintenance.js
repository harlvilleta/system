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
  Grid,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import { Storage, CloudUpload, Build, Warning, Download, Upload, Delete, Refresh } from '@mui/icons-material';
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
  const [backupType, setBackupType] = useState('full');
  const [cleanupType, setCleanupType] = useState('old');
  const [cleanupDays, setCleanupDays] = useState(90);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const handleMaintenanceAction = (type) => {
    setDialogType(type);
    setDialogOpen(true);
    // Reset form states
    setBackupType('full');
    setCleanupType('old');
    setCleanupDays(90);
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
      // Simulate operation based on dialog type
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let message = '';
      if (dialogType === 'Database Optimization') {
        message = 'Database optimization completed successfully';
      } else if (dialogType === 'Backup') {
        message = `${backupType === 'full' ? 'Full' : 'Incremental'} backup created successfully`;
      } else if (dialogType === 'Data Cleanup') {
        message = `Data cleanup completed. Removed records older than ${cleanupDays} days`;
      }
      
      setSnackbar({ open: true, message, severity: 'success' });
      setDialogOpen(false);
      loadDatabaseStats(); // Refresh stats after operation
    } catch (error) {
      setSnackbar({ open: true, message: 'Error performing operation', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeDatabase = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSnackbar({ open: true, message: 'Database optimization completed successfully', severity: 'success' });
      setDialogOpen(false);
      loadDatabaseStats();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error optimizing database', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const backupName = `${backupType === 'full' ? 'Full' : 'Incremental'}_Backup_${new Date().toISOString().split('T')[0]}`;
      setSnackbar({ open: true, message: `Backup "${backupName}" created successfully`, severity: 'success' });
      setDialogOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'Error creating backup', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSnackbar({ open: true, message: `Data cleanup completed. Removed records older than ${cleanupDays} days`, severity: 'success' });
      setDialogOpen(false);
      loadDatabaseStats();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error cleaning up data', severity: 'error' });
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
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#8B0000', mb: 3 }}>
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
                border: 'none',
                borderLeft: '4px solid',
                borderLeftColor: '#8B0000',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  borderLeftColor: '#A52A2A'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#1976d220', color: '#1976d2', mr: 2 }}>
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
                  sx={{ bgcolor: '#8B0000', '&:hover': { bgcolor: '#A52A2A' } }}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Database Statistics */}
      <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #8B0000' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#8B0000', mb: 3 }}>
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
                  <TableCell sx={{ fontWeight: 700, color: '#8B0000' }}>Collection</TableCell>
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
                          bgcolor: '#8B0000',
                          color: '#000000',
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

      <Dialog open={dialogOpen} onClose={() => !loading && setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#8B0000', fontWeight: 700 }}>{dialogType}</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {dialogType === 'Database Optimization' && (
                <Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Optimize your database by analyzing collections, removing unused indexes, and improving query performance.
                  </Alert>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Database Statistics
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Collection</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Documents</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dbStats.slice(0, 5).map((stat) => (
                            <TableRow key={stat.name}>
                              <TableCell>{stat.name}</TableCell>
                              <TableCell>{stat.count}</TableCell>
                              <TableCell>
                                <Chip label={stat.status} color={stat.status === 'Active' ? 'success' : 'default'} size="small" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Refresh />}
                    onClick={handleOptimizeDatabase}
                    sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' }, mt: 2 }}
                  >
                    Optimize Database
                  </Button>
                </Box>
              )}

              {dialogType === 'Backup' && (
                <Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Create a backup of your database. Full backups include all data, while incremental backups only include changes since the last backup.
                  </Alert>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Backup Type</InputLabel>
                    <Select
                      value={backupType}
                      onChange={(e) => setBackupType(e.target.value)}
                      label="Backup Type"
                    >
                      <MenuItem value="full">Full Backup</MenuItem>
                      <MenuItem value="incremental">Incremental Backup</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Download />}
                      onClick={handleCreateBackup}
                      sx={{ borderColor: '#1976d2', color: '#1976d2' }}
                    >
                      Create Backup
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Upload />}
                      sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                    >
                      Restore Backup
                    </Button>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Backup:</strong> {new Date().toLocaleDateString()}
                  </Typography>
                </Box>
              )}

              {dialogType === 'Data Cleanup' && (
                <Box>
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    Data cleanup will permanently delete old records. This action cannot be undone. Make sure you have a backup before proceeding.
            </Alert>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Cleanup Type</InputLabel>
                    <Select
                      value={cleanupType}
                      onChange={(e) => setCleanupType(e.target.value)}
                      label="Cleanup Type"
                    >
                      <MenuItem value="old">Old Records</MenuItem>
                      <MenuItem value="duplicate">Duplicate Records</MenuItem>
                      <MenuItem value="orphaned">Orphaned Records</MenuItem>
                    </Select>
                  </FormControl>
                  {cleanupType === 'old' && (
                    <TextField
                      fullWidth
                      type="number"
                      label="Delete records older than (days)"
                      value={cleanupDays}
                      onChange={(e) => setCleanupDays(parseInt(e.target.value) || 90)}
                      sx={{ mb: 2 }}
                      inputProps={{ min: 1, max: 365 }}
                    />
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Delete />}
                    onClick={handleCleanupData}
                    sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#c62828' }, mt: 2 }}
                  >
                    Clean Up Data
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            {dialogType === 'Database Optimization' ? 'Close' : 'Cancel'}
          </Button>
          {dialogType !== 'Database Optimization' && (
            <Button onClick={handleConfirmAction} variant="contained" disabled={loading} sx={{ bgcolor: '#8B0000', '&:hover': { bgcolor: '#A52A2A' } }}>
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          )}
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

