import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Chip,
  Divider,
  useTheme
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Receipt,
  School,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// Function to convert file to base64
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const receiptTypes = [
  { value: 'student_id', label: 'Sling ID', icon: '🆔' },
  { value: 'handbook', label: 'Handbook', icon: '📘' },
  { value: 'membership', label: 'Membership Fee', icon: '🏛️' },
  { value: 'other', label: 'Other', icon: '📄' }
];

// Note: We will store the image directly as a data URL in Firestore per requirements

export default function ReceiptSubmission() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [receiptType, setReceiptType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptBase64, setReceiptBase64] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }
      
      setReceiptImage(file);
      setUploading(true);
      setError('');
      
      try {
        // Convert to base64 for preview only
        const base64String = await convertToBase64(file);
        setReceiptBase64(base64String);
        setSuccess('Receipt image uploaded successfully!');
      } catch (error) {
        console.error('Error processing image:', error);
        setError('Failed to process image. Please try again.');
        setReceiptImage(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = () => {
    setReceiptImage(null);
    setReceiptBase64('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!receiptType) {
      setError('Please select a receipt type');
      return;
    }
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (!receiptBase64) {
      setError('Please upload a receipt image');
      return;
    }
    
    // Description is optional
    
    setLoading(true);
    setError('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userData = {};
      if (userDoc.exists()) {
        userData = userDoc.data();
      }
      
      // Per requirement: store the image directly (data URL) in Firestore, not Storage
      const imageURL = receiptBase64 || '';
      
      const submissionData = {
        userId: user.uid,
        userEmail: user.email,
        userName: userData.fullName || user.displayName || 'Unknown',
        userRole: userData.role || 'Student',
        receiptType: receiptType,
        amount: parseFloat(amount),
        description: description.trim() || '',
        receiptImage: imageURL, // Store data URL directly
        status: 'pending', // pending, approved, rejected
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminNotes: '',
        reviewedBy: '',
        reviewedAt: null
      };
      
      // Add student-specific info if available
      if (userData.studentInfo) {
        submissionData.studentInfo = {
          studentId: userData.studentInfo.studentId,
          course: userData.studentInfo.course,
          year: userData.studentInfo.year,
          section: userData.studentInfo.section
        };
      }
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'receipt_submissions'), submissionData);
      
      console.log('✅ Receipt submission saved:', docRef.id);
      
      // Log activity
      try {
        await addDoc(collection(db, 'activity_log'), {
          message: `Receipt submission: ${receiptType} - ₱${amount}`,
          type: 'receipt_submission',
          user: user.uid,
          userEmail: user.email,
          userRole: userData.role || 'Student',
          timestamp: new Date().toISOString(),
          details: {
            submissionId: docRef.id,
            receiptType,
            amount: parseFloat(amount),
            hasImage: !!imageURL, // Check if imageURL is not empty
            imageSize: receiptImage ? `${(receiptImage.size / 1024).toFixed(2)} KB` : 'N/A'
          }
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }
      
      setSuccess('Receipt submitted successfully! Admin will review and update the status.');
      setSubmitted(true);
      
      // Reset form
      setReceiptType('');
      setAmount('');
      setDescription('');
      setReceiptImage(null);
      setReceiptBase64('');
      
    } catch (error) {
      console.error('Error submitting receipt:', error);
      setError('Failed to submit receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setReceiptType('');
    setAmount('');
    setDescription('');
    setReceiptImage(null);
    setReceiptBase64('');
    setError('');
    setSuccess('');
  };

  if (submitted) {
    return (
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        p: { xs: 2, sm: 3 },
        bgcolor: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 50% 50%, rgba(139, 0, 0, 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle at 50% 50%, rgba(139, 0, 0, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none'
        }
      }}>
        <Paper sx={{ 
          p: { xs: 3, sm: 4, md: 5 }, 
          textAlign: 'center',
          maxWidth: 500,
          width: '100%',
          bgcolor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(255, 255, 255, 0.9)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 3,
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
            : '0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeInUp 0.6s ease-out',
          '@keyframes fadeInUp': {
            '0%': {
              opacity: 0,
              transform: 'translateY(30px)'
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0)'
            }
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '4px',
            background: 'linear-gradient(180deg, #8B0000, #A52A2A, #8B0000)',
            borderRadius: '0 4px 4px 0'
          }
        }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{
              display: 'inline-flex',
              p: 2,
              borderRadius: '50%',
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(76, 175, 80, 0.1)' 
                : 'rgba(76, 175, 80, 0.05)',
              mb: 3,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.4)'
                },
                '70%': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 0 0 15px rgba(76, 175, 80, 0)'
                },
                '100%': {
                  transform: 'scale(1)',
                  boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)'
                }
              }
            }}>
              <CheckCircle sx={{ 
                fontSize: 48, 
                color: 'success.main',
                filter: 'drop-shadow(0 2px 8px rgba(76, 175, 80, 0.4))'
              }} />
            </Box>
            
            <Typography variant="h4" sx={{ 
              color: 'success.main',
              fontWeight: 700,
              mb: 2,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #4caf50, #81c784)'
                : 'linear-gradient(135deg, #2e7d32, #4caf50)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px'
            }}>
              Receipt Submitted Successfully!
            </Typography>
            
            <Typography variant="body1" sx={{ 
              mb: 4,
              color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#666666',
              lineHeight: 1.6,
              fontWeight: 400,
              maxWidth: 400,
              mx: 'auto'
            }}>
              Your receipt has been submitted and is pending admin review. 
              You will be notified once the admin reviews your submission.
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'center',
              flexWrap: 'wrap',
              mt: 4
            }}>
              <Button
                variant="outlined"
                onClick={() => window.history.back()}
                size="small"
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  minWidth: 100,
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  '&:hover': {
                    bgcolor: '#800000',
                    color: '#ffffff',
                    borderColor: '#800000'
                  }
                }}
              >
                Go Back
              </Button>
              <Button
                variant="contained"
                onClick={resetForm}
                size="small"
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  minWidth: 140,
                  bgcolor: '#800000',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#6b0000'
                  }
                }}
              >
                Submit Another Receipt
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 4 }, 
      maxWidth: 1200,
      width: '100%',
      mx: 'auto',
      minHeight: '100vh',
      bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f8fafc'
    }}>
      {/* Header Section */}
      <Box sx={{ 
        mb: 4,
        textAlign: 'center'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 2,
          gap: 1.5
        }}>
          <Receipt sx={{ 
            fontSize: 32, 
            color: theme.palette.mode === 'dark' ? '#ffffff' : 'primary.main'
          }} />
          <Typography variant="h4" sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : 'primary.main',
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}>
            Receipt Submission
          </Typography>
        </Box>
        
        <Typography variant="body1" sx={{ 
          color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#666666',
          fontWeight: 400,
          maxWidth: 500,
          mx: 'auto',
          lineHeight: 1.5,
          mb: 2
        }}>
          Submit receipt images for membership fees, student ID, or other school-related payments. 
          Admins will review and approve your submissions.
        </Typography>

        <Button 
          variant="outlined" 
          onClick={() => window.location.assign('/receipt-history')}
          size="small"
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: 1,
            textTransform: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            '&:hover': {
              bgcolor: '#800000',
              color: '#ffffff',
              borderColor: '#800000'
            }
          }}
        >
          View Receipt History
        </Button>
      </Box>

      {/* Main Form Card */}
      <Paper sx={{ 
        p: { xs: 3, sm: 4, md: 5 },
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.95)',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: 4,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
          : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '4px',
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(180deg, #8B0000, #A52A2A, #8B0000)' 
            : 'linear-gradient(180deg, #8B0000, #A52A2A, #8B0000)',
          borderRadius: '0 4px 4px 0'
        }
      }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 3,
              '& .MuiAlert-message': {
                fontSize: '0.95rem',
                fontWeight: 500
              }
            }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3,
              borderRadius: 3,
              '& .MuiAlert-message': {
                fontSize: '0.95rem',
                fontWeight: 500
              }
            }}
          >
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            {/* Receipt Type and Amount Row */}
            <Grid item xs={12} md={6}>
              <FormControl 
                fullWidth 
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'primary.main'
                    }
                  }
                }}
              >
                <InputLabel sx={{ 
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#333333'
                }}>
                  Receipt Type
                </InputLabel>
                <Select
                  value={receiptType}
                  onChange={(e) => setReceiptType(e.target.value)}
                  label="Receipt Type"
                  sx={{
                    '& .MuiSelect-select': {
                      py: 1.5
                    }
                  }}
                >
                  {receiptTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value} sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 12, fontSize: '1.2rem' }}>{type.icon}</span>
                        <Typography sx={{ fontWeight: 500 }}>{type.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Amount (₱)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="0.00"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'primary.main'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#333333'
                  }
                }}
              />
            </Grid>

            {/* Description Field */}
            <Grid item xs={12}>
              <TextField
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={1}
                placeholder="Describe what this receipt is for..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'primary.main'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#333333'
                  }
                }}
              />
            </Grid>

            {/* Image Upload Section */}
            <Grid item xs={12}>
              <Box sx={{ 
                border: `0.5px dashed ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(25, 118, 210, 0.3)'}`, 
                borderRadius: 0.5, 
                p: 1, 
                textAlign: 'center',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(25, 118, 210, 0.02)',
                transition: 'all 0.3s ease-in-out',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'primary.main',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.05)',
                  transform: 'translateY(-0.1px)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 1px 6px rgba(255, 255, 255, 0.1)' 
                    : '0 1px 6px rgba(25, 118, 210, 0.15)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' 
                    : 'linear-gradient(90deg, transparent, rgba(25, 118, 210, 0.1), transparent)',
                  transition: 'left 0.5s ease-in-out'
                },
                '&:hover::before': {
                  left: '100%'
                }
              }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="receipt-upload"
                  type="file"
                  onChange={handleImageUpload}
                />
                <label htmlFor="receipt-upload" style={{ cursor: 'pointer' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <Box sx={{
                      p: 2,
                      borderRadius: '50%',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                      mb: 1
                    }}>
                      <CloudUpload sx={{ 
                        fontSize: 32, 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'primary.main'
                      }} />
                    </Box>
                    <Button
                      variant="outlined"
                      component="span"
                      disabled={uploading}
                      size="large"
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'primary.main',
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'primary.main',
                        '&:hover': {
                          borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'primary.dark',
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'primary.light'
                        }
                      }}
                    >
                      {uploading ? 'Processing...' : 'Upload Receipt Image'}
                    </Button>
                    <Typography variant="body2" sx={{ 
                      color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#666666',
                      fontWeight: 500
                    }}>
                      Supported formats: JPG, PNG, GIF • Max size: 10MB
                    </Typography>
                  </Box>
                </label>
              </Box>
            </Grid>

            {/* Form Actions - Moved below upload section */}
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                justifyContent: 'center',
                flexWrap: 'wrap',
                mt: 2
              }}>
                <Button
                  variant="outlined"
                  onClick={resetForm}
                  disabled={loading}
                  size="small"
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    minWidth: 100,
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                    borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                    '&:hover': {
                      bgcolor: '#800000',
                      color: '#ffffff',
                      borderColor: '#800000'
                    },
                    '&:disabled': {
                      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                      borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !receiptType || !amount || !receiptBase64}
                  startIcon={loading ? <CircularProgress size={16} /> : <School />}
                  size="small"
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    minWidth: 140,
                    bgcolor: '#800000',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#6b0000'
                    },
                    '&:disabled': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                    }
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Receipt'}
                </Button>
              </Box>
            </Grid>

            {/* Receipt Preview */}
            {receiptBase64 && (
              <Grid item xs={12}>
                <Card sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.8)',
                  border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 16px rgba(0, 0, 0, 0.3)' 
                    : '0 4px 16px rgba(0, 0, 0, 0.1)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      mb: 3
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                        Receipt Preview
                      </Typography>
                      <IconButton 
                        onClick={removeImage} 
                        color="error"
                        sx={{
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)',
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)'
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                    <CardMedia
                      component="img"
                      image={receiptBase64}
                      alt="Receipt"
                      sx={{ 
                        height: 300, 
                        objectFit: 'contain',
                        borderRadius: 2,
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                      }}
                    />
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                      <Chip 
                        label={receiptImage ? `${receiptImage.name} (${(receiptImage.size / 1024).toFixed(2)} KB)` : 'Receipt image'}
                        size="medium"
                        color="primary"
                        sx={{
                          fontWeight: 500,
                          '& .MuiChip-label': {
                            fontSize: '0.9rem'
                          }
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

          </Grid>
        </form>
      </Paper>
    </Box>
  );
} 