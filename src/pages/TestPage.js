import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Alert, Tabs, Tab } from '@mui/material';
import { createSampleUsers } from '../utils/createUsers';
import FirebaseDataViewer from '../components/FirebaseDataViewer';
import LoginDiagnostic from '../components/LoginDiagnostic';
import FirestoreTest from '../components/FirestoreTest';
import FirebaseRulesChecker from '../components/FirebaseRulesChecker';
import UpdateAdminRole from '../components/UpdateAdminRole';

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const handleCreateUsers = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      console.log('Starting user creation...');
      await createSampleUsers();
      setMessage('✅ Sample users created successfully! Check console for details.');
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error creating users. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="🧪 Create Users" />
          <Tab label="🔥 View Firebase Data" />
          <Tab label="🔧 Login Diagnostics" />
          <Tab label="📝 Firestore Test" />
          <Tab label="🔒 Rules Checker" />
          <Tab label="👑 Update Admin Role" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 'calc(100vh - 48px)',
          p: 3
        }}>
          <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom color="primary">
              🧪 User Creation Test
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              Click the button below to create sample users for testing.
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              onClick={handleCreateUsers}
              disabled={loading}
              sx={{ mb: 3 }}
            >
              {loading ? 'Creating Users...' : '🚀 Create Sample Users'}
            </Button>
            
            {message && (
              <Alert severity={message.includes('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>
                {message}
              </Alert>
            )}
            
            <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Test Credentials:
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'left' }}>
                👑 <strong>Admin:</strong> admin@school.com / admin123<br/>
                👨‍🏫 <strong>Teacher:</strong> teacher@school.com / teacher123<br/>
                👨‍🎓 <strong>Student:</strong> student@school.com / student123
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              After creating users, go to <strong>/login</strong> to test the login system.
            </Typography>
          </Paper>
        </Box>
      )}

      {activeTab === 1 && (
        <FirebaseDataViewer />
      )}

      {activeTab === 2 && (
        <LoginDiagnostic />
      )}

      {activeTab === 3 && (
        <FirestoreTest />
      )}

      {activeTab === 4 && (
        <FirebaseRulesChecker />
      )}

      {activeTab === 5 && (
        <UpdateAdminRole />
      )}
    </Box>
  );
} 