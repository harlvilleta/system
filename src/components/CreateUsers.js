import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem, 
  Typography, 
  Alert,
  Grid,
  CircularProgress
} from '@mui/material';
import { createSingleUser } from '../utils/createUsers';

const roles = ['Student', 'Admin', 'Teacher'];
const courses = ["BSIT", "BSBA", "BSCRIM", "BSHTM", "BEED", "BSED", "BSHM"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function CreateUsers({ open, onClose }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'Student',
    phone: '',
    address: '',
    studentId: '',
    firstName: '',
    lastName: '',
    course: '',
    year: '',
    section: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ show: false, text: '', severity: 'success' });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate full name for students
    if (field === 'firstName' || field === 'lastName') {
      const firstName = field === 'firstName' ? value : formData.firstName;
      const lastName = field === 'lastName' ? value : formData.lastName;
      setFormData(prev => ({ ...prev, fullName: `${firstName} ${lastName}`.trim() }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      setMessage({ show: true, text: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const result = await createSingleUser(formData);
      if (result.success) {
        setMessage({ show: true, text: `User created successfully: ${formData.email}`, severity: 'success' });
        setFormData({
          email: '',
          password: '',
          fullName: '',
          role: 'Student',
          phone: '',
          address: '',
          studentId: '',
          firstName: '',
          lastName: '',
          course: '',
          year: '',
          section: ''
        });
      } else {
        setMessage({ show: true, text: 'Failed to create user', severity: 'error' });
      }
    } catch (error) {
      setMessage({ show: true, text: 'Error creating user', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMessage({ show: false, text: '', severity: 'success' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New User</DialogTitle>
      <DialogContent>
        {message.show && (
          <Alert severity={message.severity} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              fullWidth
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              fullWidth
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Role"
              select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              fullWidth
              required
              margin="normal"
            >
              {roles.map(role => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              fullWidth
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              fullWidth
              margin="normal"
            />
          </Grid>

          {/* Student-specific fields */}
          {formData.role === 'Student' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Student ID"
                  value={formData.studentId}
                  onChange={(e) => handleInputChange('studentId', e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Course"
                  select
                  value={formData.course}
                  onChange={(e) => handleInputChange('course', e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                >
                  {courses.map(course => (
                    <MenuItem key={course} value={course}>{course}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Year Level"
                  select
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                >
                  {years.map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Section"
                  value={formData.section}
                  onChange={(e) => handleInputChange('section', e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                />
              </Grid>
            </>
          )}

          {/* Non-student full name field */}
          {formData.role !== 'Student' && (
            <Grid item xs={12}>
              <TextField
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                fullWidth
                required
                margin="normal"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 