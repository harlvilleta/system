import React, { useState } from 'react';
import { Button, Box, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { updateUserToAdmin } from '../utils/updateUserRole';
import { auth } from '../firebase';
import { clearAuthState } from '../utils/authPersistence';

export default function UpdateAdminRole() {
  const [email, setEmail] = useState('admin+10@school.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpdate = async () => {
    if (!email) {
      setResult({ success: false, message: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Get current user UID if logged in
      const currentUser = auth.currentUser;
      const uid = currentUser && currentUser.email === email ? currentUser.uid : null;
      
      const success = await updateUserToAdmin(email, uid);
      if (success) {
        // Clear cached auth state so role is refreshed on next login
        clearAuthState();
        
        setResult({ 
          success: true, 
          message: `Successfully updated ${email} to Admin role! Please LOG OUT and log back in for changes to take effect.` 
        });
        
        // If user is currently logged in, suggest logging out
        if (currentUser && currentUser.email === email) {
          setTimeout(() => {
            if (window.confirm('Your role has been updated! Would you like to log out now to apply the changes?')) {
              auth.signOut().then(() => {
                window.location.href = '/';
              });
            }
          }, 500);
        }
      } else {
        setResult({ 
          success: false, 
          message: `Failed to update ${email}. User may not exist in the database. If you just logged in, try refreshing the page first.` 
        });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: `Error: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Update User to Admin Role
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the email address of the user you want to make an admin.
      </Typography>
      
      <TextField
        fullWidth
        label="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
        disabled={loading}
      />
      
      <Button
        variant="contained"
        onClick={handleUpdate}
        disabled={loading || !email}
        fullWidth
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Update to Admin'}
      </Button>

      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
          {result.message}
        </Alert>
      )}
    </Box>
  );
}

