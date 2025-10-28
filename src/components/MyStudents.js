import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
  useTheme,
  Collapse,
  Divider
} from '@mui/material';
import {
  People,
  Add,
  Edit,
  Delete,
  ExpandMore,
  ExpandLess,
  School,
  Person,
  Group,
  Settings
} from '@mui/icons-material';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { validateStudentId } from '../utils/studentValidation';

const courses = ["BSIT", "BSBA", "BSCRIM", "BSHTM", "BEED", "BSED", "BSHM"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function MyStudents() {
  const theme = useTheme();
  const [students, setStudents] = useState([]);
  const [groupedStudents, setGroupedStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Add Student Form State
  const [addForm, setAddForm] = useState({
    name: '',
    studentId: ''
  });

  // Edit Student Form State
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    studentId: '',
    course: '',
    year: '',
    section: ''
  });

  // Fetch students from Firebase
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      // Fetch from 'students' collection (manually added students)
      const studentsQuerySnapshot = await getDocs(collection(db, "students"));
      const studentsData = studentsQuerySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        isManual: true
      }));
      
      // Fetch from 'users' collection (registered students)
      const usersQuerySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "Student")));
      const registeredStudentsData = usersQuerySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          studentId: data.studentId || '',
          course: data.course || '',
          year: data.year || '',
          section: data.section || '',
          email: data.email || '',
          isRegisteredUser: true,
          isManual: false
        };
      });
      
      // Combine both collections
      const allStudents = [...studentsData, ...registeredStudentsData];
      
      // Process manual students to match the expected format
      const processedStudents = allStudents.map(student => ({
        ...student,
        name: student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        studentId: student.studentId || student.id || ''
      }));
      
      // Filter out invalid students (only validate manually added students, registered users are already valid)
      const validStudents = [];
      const invalidStudents = [];
      
      for (const student of processedStudents) {
        if (student.isRegisteredUser) {
          // Registered users are always valid
          validStudents.push(student);
        } else {
          // Validate manually added students
          try {
            const validation = await validateStudentId(student.studentId);
            if (validation.isValid) {
              validStudents.push(student);
            } else {
              invalidStudents.push(student);
              console.log(`Invalid manually added student found: ${student.name} (ID: ${student.studentId})`);
            }
          } catch (error) {
            console.error(`Error validating student ${student.studentId}:`, error);
            // If validation fails, consider the student invalid
            invalidStudents.push(student);
          }
        }
      }
      
      // Log summary of validation results
      console.log(`Student validation complete: ${validStudents.length} valid, ${invalidStudents.length} invalid`);
      if (invalidStudents.length > 0) {
        console.log('Invalid students that will be filtered out:', invalidStudents.map(s => `${s.name} (${s.studentId})`));
      }
      
      setStudents(validStudents);
      groupStudents(validStudents);
      
      // Show notification if invalid students were found
      if (invalidStudents.length > 0) {
        setSnackbar({ 
          open: true, 
          message: `${invalidStudents.length} invalid student(s) were removed from the list. Only verified students are now displayed.`, 
          severity: 'warning' 
        });
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setSnackbar({ open: true, message: 'Error fetching students', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const groupStudents = (studentsList) => {
    const grouped = {};
    
    studentsList.forEach(student => {
      const key = `${student.course || 'No Course'}-${student.year || 'No Year'}-${student.section || 'No Section'}`;
      if (!grouped[key]) {
        grouped[key] = {
          course: student.course || 'No Course',
          year: student.year || 'No Year',
          section: student.section || 'No Section',
          students: []
        };
      }
      grouped[key].students.push(student);
    });
    
    setGroupedStudents(grouped);
  };

  const handleAddStudent = async () => {
    if (!addForm.name.trim() || !addForm.studentId.trim()) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    try {
      const newStudent = {
        firstName: addForm.name.split(' ')[0] || '',
        lastName: addForm.name.split(' ').slice(1).join(' ') || '',
        studentId: addForm.studentId,
        course: '',
        year: '',
        section: '',
        createdAt: new Date().toISOString(),
        isManual: true
      };

      await addDoc(collection(db, "students"), newStudent);
      
      setSnackbar({ open: true, message: 'Student added successfully', severity: 'success' });
      setAddForm({ name: '', studentId: '' });
      setOpenAddDialog(false);
      fetchStudents();
    } catch (error) {
      console.error('Error adding student:', error);
      setSnackbar({ open: true, message: 'Error adding student', severity: 'error' });
    }
  };

  const handleEditStudent = async () => {
    if (!editForm.name.trim() || !editForm.studentId.trim()) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    try {
      const updateData = {
        firstName: editForm.name.split(' ')[0] || '',
        lastName: editForm.name.split(' ').slice(1).join(' ') || '',
        studentId: editForm.studentId,
        course: editForm.course,
        year: editForm.year,
        section: editForm.section,
        updatedAt: new Date().toISOString()
      };

      if (selectedStudent.isRegisteredUser) {
        // Update in users collection
        await updateDoc(doc(db, "users", selectedStudent.id), updateData);
      } else {
        // Update in students collection
        await updateDoc(doc(db, "students", selectedStudent.id), updateData);
      }

      setSnackbar({ open: true, message: 'Student updated successfully', severity: 'success' });
      setOpenEditDialog(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error) {
      console.error('Error updating student:', error);
      setSnackbar({ open: true, message: 'Error updating student', severity: 'error' });
    }
  };

  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      try {
        if (student.isRegisteredUser) {
          // Don't delete registered users, just remove their course/year/section info
          await updateDoc(doc(db, "users", student.id), {
            course: '',
            year: '',
            section: '',
            updatedAt: new Date().toISOString()
          });
        } else {
          // Delete from students collection
          await deleteDoc(doc(db, "students", student.id));
        }

        setSnackbar({ open: true, message: 'Student removed successfully', severity: 'success' });
        fetchStudents();
      } catch (error) {
        console.error('Error deleting student:', error);
        setSnackbar({ open: true, message: 'Error removing student', severity: 'error' });
      }
    }
  };

  const openEditStudentDialog = (student) => {
    setSelectedStudent(student);
    setEditForm({
      id: student.id,
      name: student.name,
      studentId: student.studentId,
      course: student.course || '',
      year: student.year || '',
      section: student.section || ''
    });
    setOpenEditDialog(true);
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const getGroupColor = (index) => {
    const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2', '#00695c', '#f57c00'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Typography>Loading students...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary">
          My Students
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenAddDialog(true)}
          sx={{
            bgcolor: '#1976d2',
            '&:hover': { bgcolor: '#1565c0' }
          }}
        >
          Add Student
        </Button>
      </Box>

      {/* Student Groups */}
      <Grid container spacing={3}>
        {Object.entries(groupedStudents).map(([groupKey, group], index) => (
          <Grid item xs={12} sm={6} md={4} key={groupKey}>
            <Card
              sx={{
                border: `2px solid ${getGroupColor(index)}`,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  borderColor: getGroupColor(index),
                  '& .group-header': {
                    bgcolor: `${getGroupColor(index)}15`
                  }
                }
              }}
              onClick={() => toggleGroup(groupKey)}
            >
              <CardContent className="group-header" sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: getGroupColor(index), width: 40, height: 40 }}>
                      <Group />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600} color={getGroupColor(index)}>
                        {group.course}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {group.year} - {group.section}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small">
                    {expandedGroups[groupKey] ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <Typography variant="h4" fontWeight={700} color={getGroupColor(index)} sx={{ mt: 1 }}>
                  {group.students.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {group.students.length === 1 ? 'Student' : 'Students'}
                </Typography>
              </CardContent>

              <Collapse in={expandedGroups[groupKey]}>
                <Divider />
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {group.students.map((student, studentIndex) => (
                    <ListItem
                      key={student.id}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getGroupColor(index) }}>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight={600}>
                            {student.name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              ID: {student.studentId}
                            </Typography>
                            {student.email && (
                              <Typography variant="caption" color="text.secondary">
                                {student.email}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Edit Student">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditStudentDialog(student);
                            }}
                            sx={{ color: getGroupColor(index) }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove Student">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(student);
                            }}
                            sx={{ color: 'error.main' }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Student Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Student</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Student Name"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Student ID"
              value={addForm.studentId}
              onChange={(e) => setAddForm({ ...addForm, studentId: e.target.value })}
              margin="normal"
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddStudent} variant="contained">
            Add Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Student</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Student Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Student ID"
              value={editForm.studentId}
              onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Course</InputLabel>
              <Select
                value={editForm.course}
                label="Course"
                disabled
                sx={{
                  '& .MuiInputBase-input': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    cursor: 'default'
                  }
                }}
              >
                <MenuItem value="">Select Course</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course} value={course}>
                    {course}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Course cannot be changed</FormHelperText>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Year Level</InputLabel>
              <Select
                value={editForm.year}
                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                label="Year Level"
              >
                <MenuItem value="">Select Year</MenuItem>
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Section</InputLabel>
              <Select
                value={editForm.section}
                onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                label="Section"
              >
                <MenuItem value="A">A</MenuItem>
                <MenuItem value="B">B</MenuItem>
                <MenuItem value="C">C</MenuItem>
                <MenuItem value="D">D</MenuItem>
                <MenuItem value="E">E</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditStudent} variant="contained">
            Update Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
