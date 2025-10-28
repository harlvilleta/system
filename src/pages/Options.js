import React, { useState } from "react";
import { Typography, Box, Grid, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, TextField, useTheme } from "@mui/material";
import EmailIcon from '@mui/icons-material/Email';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';
import ListAlt from '@mui/icons-material/ListAlt';
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from 'firebase/auth';
import RecycleBin from './RecycleBin';
import History from './History';
import emailjs from 'emailjs-com';

const EMAILJS_SERVICE_ID = 'service_7pgle82';
const EMAILJS_TEMPLATE_ID = 'template_f5q7j6q';
const EMAILJS_USER_ID = 'L77JuF4PF3ZtGkwHm';

export default function Options() {
  const theme = useTheme();
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;
  const [openEmail, setOpenEmail] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', message: '' });
  const [emailLoading, setEmailLoading] = useState(false);

  
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setSnackbar({ open: false, message: '', severity: 'success' });
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message,
        },
        EMAILJS_USER_ID
      );
      setSnackbar({ open: true, message: 'Email sent successfully!', severity: 'success' });
      setOpenEmail(false);
      setEmailForm({ to: '', subject: '', message: '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to send email: ' + (err.text || err.message), severity: 'error' });
    }
    setEmailLoading(false);
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };
  
  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Options
      </Typography>
      
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          startIcon={<EmailIcon />} 
          onClick={() => setOpenEmail(true)} 
          sx={{ 
            color: 'black',
            borderColor: 'black',
            fontWeight: 600,
            '&:hover': {
              bgcolor: '#800000',
              color: 'white',
              borderColor: '#800000'
            }
          }}
        >
          Send Email
        </Button>
      </Box>
      
      {/* Options Grid */}
      <Grid container spacing={4} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            height: '100%',
            minHeight: '280px',
            cursor: 'pointer',
            transition: 'all 0.3s ease-in-out',
            borderLeft: '4px solid #800000',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6,
              borderLeft: '4px solid #a00000'
            }
          }} onClick={() => navigate('/profile')}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <SecurityIcon sx={{ fontSize: 64, mb: 3, color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }} />
              <Typography variant="h5" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'black' }}>
                Security Settings
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mt: 2 }}>
                Change password, email, and security preferences
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            height: '100%',
            minHeight: '280px',
            cursor: 'pointer',
            transition: 'all 0.3s ease-in-out',
            borderLeft: '4px solid #800000',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6,
              borderLeft: '4px solid #a00000'
            }
          }} onClick={() => setOpenSecurity(true)}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <DeleteIcon sx={{ fontSize: 64, mb: 3, color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }} />
              <Typography variant="h5" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'black' }}>
                Recycle Bin
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mt: 2 }}>
                View and restore deleted items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            height: '100%',
            minHeight: '280px',
            cursor: 'pointer',
            transition: 'all 0.3s ease-in-out',
            borderLeft: '4px solid #800000',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6,
              borderLeft: '4px solid #a00000'
            }
          }} onClick={() => setOpenAccount(true)}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <ListAlt sx={{ fontSize: 64, mb: 3, color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }} />
              <Typography variant="h5" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'black' }}>
                History
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mt: 2 }}>
                View system activity and history logs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Recycle Bin Modal */}
      <Dialog open={openSecurity} onClose={() => setOpenSecurity(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#800000' }}>Recycle Bin</DialogTitle>
        <DialogContent>
        <RecycleBin />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSecurity(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* History Modal */}
      <Dialog open={openAccount} onClose={() => setOpenAccount(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#800000' }}>History</DialogTitle>
        <DialogContent>
          <History />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAccount(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Send Email Modal */}
      <Dialog open={openEmail} onClose={() => setOpenEmail(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#800000' }}>Send Email</DialogTitle>
        <DialogContent>
          <form id="send-email-form" onSubmit={handleSendEmail}>
            <TextField 
              label="To" 
              value={emailForm.to} 
              onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))} 
              fullWidth 
              sx={{ mb: 2, mt: 1 }} 
            />
            <TextField 
              label="Subject" 
              value={emailForm.subject} 
              onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} 
              fullWidth 
              sx={{ mb: 2 }} 
            />
            <TextField 
              label="Message" 
              value={emailForm.message} 
              onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))} 
              fullWidth 
              multiline 
              minRows={3} 
              sx={{ mb: 2 }} 
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEmail(false)} variant="outlined">Cancel</Button>
          <Button 
            type="submit" 
            form="send-email-form" 
            variant="contained" 
            disabled={emailLoading}
            sx={{
              bgcolor: '#800000',
              '&:hover': {
                bgcolor: '#a00000'
              }
            }}
          >
            {emailLoading ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 