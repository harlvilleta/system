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
  useTheme,
  Alert,
  Tabs,
  Tab,
  TextField,
  Button,
  TablePagination
} from '@mui/material';
import { Security, History, Shield } from '@mui/icons-material';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { CircularProgress } from '@mui/material';

export default function AdminSecurity() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  useEffect(() => {
    loadSecurityData();
    setPage(0); // Reset to first page when switching tabs
  }, [activeTab]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      if (activeTab === 0) {
        // Load security logs from activity_log
        const activityLogQuery = query(collection(db, 'activity_log'), orderBy('timestamp', 'desc'), limit(50));
        const activitySnapshot = await getDocs(activityLogQuery);
        
        const logs = activitySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp || data.createdAt),
            eventType: data.action || data.type || 'Security Event',
            user: data.user || data.userEmail || 'System',
            ipAddress: data.ipAddress || 'N/A',
            status: data.status || 'Success',
            details: data.message || data.description || 'No details'
          };
        });
        
        setSecurityLogs(logs);
      } else if (activeTab === 1) {
        // Load login history from users collection (last login times)
        const usersQuery = query(collection(db, 'users'), orderBy('updatedAt', 'desc'), limit(50));
        const usersSnapshot = await getDocs(usersQuery);
        
        const history = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            timestamp: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            email: data.email || 'N/A',
            ipAddress: data.lastLoginIP || 'N/A',
            status: 'Success',
            device: data.lastLoginDevice || 'Unknown'
          };
        });
        
        setLoginHistory(history);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#8B0000', mb: 3 }}>
        Security Center
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        This section monitors system security, login attempts, and access control. All security events are logged here.
      </Alert>

      <Paper sx={{ mb: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Security />} label="Security Logs" />
          <Tab icon={<History />} label="Login History" />
          <Tab icon={<Shield />} label="Access Control" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <TableContainer component={Paper} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Event Type</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>IP Address</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : securityLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No security logs available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                securityLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{log.timestamp.toLocaleString()}</TableCell>
                    <TableCell>{log.eventType}</TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                    <TableCell>
                      <Chip label={log.status} color={log.status === 'Success' ? 'success' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>{log.details}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={securityLogs.length}
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
      )}

      {activeTab === 1 && (
        <TableContainer component={Paper} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>User Email</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>IP Address</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#8B0000' }}>Device</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : loginHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No login history available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                loginHistory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((login, index) => (
                  <TableRow key={index}>
                    <TableCell>{login.timestamp.toLocaleString()}</TableCell>
                    <TableCell>{login.email}</TableCell>
                    <TableCell>{login.ipAddress}</TableCell>
                    <TableCell>
                      <Chip label={login.status} color={login.status === 'Success' ? 'success' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>{login.device}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={loginHistory.length}
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
      )}

      {activeTab === 2 && (
        <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
          <Typography variant="h6" gutterBottom>
            Access Control Settings
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Access control configuration will be available in the next update. This will allow you to manage permissions, role-based access, and security policies.
          </Alert>
        </Paper>
      )}
    </Box>
  );
}

