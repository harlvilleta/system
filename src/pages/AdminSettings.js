import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  useTheme,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Snackbar,
  Paper
} from '@mui/material';
import { Settings, Email, Notifications } from '@mui/icons-material';

export default function AdminSettings() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [settings, setSettings] = useState({
    systemName: 'Student Affairs Management System',
    systemEmail: 'admin@school.com',
    notificationsEnabled: true,
    emailNotifications: true
  });

  const handleSave = () => {
    // Placeholder for saving settings
    setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#8B0000', mb: 3 }}>
        System Settings
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure system-wide settings. Changes here affect all users.
      </Alert>

      <Paper sx={{ mb: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #8B0000' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Settings />} label="General Settings" sx={{ color: '#1976d2', '&.Mui-selected': { color: '#1976d2' } }} />
          <Tab icon={<Email />} label="Email Configuration" sx={{ color: '#1976d2', '&.Mui-selected': { color: '#1976d2' } }} />
          <Tab icon={<Notifications />} label="Notifications" sx={{ color: '#1976d2', '&.Mui-selected': { color: '#1976d2' } }} />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #8B0000' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#000000', fontWeight: 700 }}>General Settings</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="System Name"
                value={settings.systemName}
                onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                fullWidth
              />
              <TextField
                label="System Email"
                type="email"
                value={settings.systemEmail}
                onChange={(e) => setSettings({ ...settings, systemEmail: e.target.value })}
                fullWidth
              />
              <Button 
                variant="contained" 
                size="small"
                onClick={handleSave} 
                sx={{ bgcolor: '#8B0000', mt: 2, width: 'fit-content', '&:hover': { bgcolor: '#A52A2A' } }}
              >
                Save Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #8B0000' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 700 }}>Email Configuration</Typography>
            <Alert severity="info" sx={{ mt: 2, bgcolor: '#e8f5e9', border: '1px solid #2e7d32' }}>
              Email configuration will be implemented in the next update. This will allow you to configure SMTP settings and email templates.
            </Alert>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #8B0000' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 700 }}>Notification Settings</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notificationsEnabled}
                    onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                  />
                }
                label="Enable System Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  />
                }
                label="Enable Email Notifications"
              />
              <Button 
                variant="contained" 
                size="small"
                onClick={handleSave} 
                sx={{ bgcolor: '#8B0000', mt: 2, width: 'fit-content', '&:hover': { bgcolor: '#A52A2A' } }}
              >
                Save Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

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

