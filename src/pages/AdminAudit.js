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
  TextField,
  InputAdornment,
  useTheme,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  TablePagination
} from '@mui/material';
import { Search, History, FilterList } from '@mui/icons-material';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminAudit() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(0);
  const rowsPerPage = 8;

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, filterType, auditLogs]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Load from activity_log collection
      const activityLogQuery = query(collection(db, 'activity_log'), orderBy('timestamp', 'desc'), limit(100));
      const activitySnapshot = await getDocs(activityLogQuery);
      
      // Also check for user updates
      const usersQuery = query(collection(db, 'users'), orderBy('updatedAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const logs = [];
      
      // Process activity logs
      activitySnapshot.docs.forEach(doc => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp || data.createdAt),
          action: data.action || data.type || 'Activity',
          user: data.user || data.userEmail || 'System',
          details: data.message || data.description || 'No details',
          type: 'activity',
          status: 'success'
        });
      });

      // Process user updates
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.updatedAt) {
          logs.push({
            id: doc.id + '_update',
            timestamp: new Date(data.updatedAt),
            action: 'User Updated',
            user: data.email || data.fullName || 'Unknown',
            details: `Role: ${data.role || 'N/A'}`,
            type: 'user_update',
            status: 'success'
          });
        }
      });

      // Sort by timestamp
      logs.sort((a, b) => b.timestamp - a.timestamp);
      
      setAuditLogs(logs);
      setFilteredLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...auditLogs];

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    setFilteredLogs(filtered);
    setPage(0);
  };

  const getTypeColor = (type) => {
    const colors = {
      'activity': '#1976d2',
      'user_update': '#2e7d32',
      'security': '#d32f2f',
      'system': '#ed6c02'
    };
    return colors[type] || '#9c27b0';
  };

  const paginatedLogs = filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ 
        color: '#8B0000',
        mb: 3
      }}>
        Audit Logs
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter Type</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label="Filter Type"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="activity">Activity</MenuItem>
            <MenuItem value="user_update">User Updates</MenuItem>
            <MenuItem value="security">Security</MenuItem>
            <MenuItem value="system">System</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            bgcolor: 'transparent',
            border: 'none',
            borderLeft: '4px solid',
            borderLeftColor: '#8B0000',
            transition: 'all 0.3s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6,
              borderLeftColor: '#A52A2A'
            }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {auditLogs.length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }}>
                Total Logs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            bgcolor: 'transparent',
            border: 'none',
            borderLeft: '4px solid',
            borderLeftColor: '#8B0000',
            transition: 'all 0.3s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6,
              borderLeftColor: '#A52A2A'
            }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {filteredLogs.length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }}>
                Filtered Results
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            bgcolor: 'transparent',
            border: 'none',
            borderLeft: '4px solid',
            borderLeftColor: '#8B0000',
            transition: 'all 0.3s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6,
              borderLeftColor: '#A52A2A'
            }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {auditLogs.filter(l => l.type === 'activity').length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }}>
                Activities
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Audit Logs Table */}
      <TableContainer component={Paper} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#8B0000', color: '#ffffff' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#8B0000', color: '#ffffff' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#8B0000', color: '#ffffff' }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#8B0000', color: '#ffffff' }}>Details</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#8B0000', color: '#ffffff' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#8B0000', color: '#ffffff' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No audit logs found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    {log.timestamp.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{log.action}</Typography>
                  </TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>{log.details}</TableCell>
                  <TableCell>
                    <Chip 
                      label={log.type} 
                      size="small"
                      sx={{ 
                        bgcolor: `${getTypeColor(log.type)}20`,
                        color: getTypeColor(log.type),
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.status} 
                      color={log.status === 'success' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredLogs.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[8]}
        />
      </TableContainer>
    </Box>
  );
}

