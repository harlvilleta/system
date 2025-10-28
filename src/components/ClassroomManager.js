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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
  useTheme,
  Divider,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  School,
  Add,
  Edit,
  Delete,
  Group,
  Person,
  Class,
  Book,
  Visibility,
  DeleteOutline
} from '@mui/icons-material';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { getStudentById } from '../utils/studentValidation';

const courses = ["BSIT", "BSBA", "BSCRIM", "BSHTM", "BEED", "BSED", "BSHM"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function ClassroomManager({ currentUser }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddStudentDialog, setOpenAddStudentDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  
  // Filter states
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  // View mode state
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Student Form State - Now includes course, year, section
  const [studentForm, setStudentForm] = useState({
    name: '',
    studentId: '',
    course: '',
    yearLevel: '',
    section: ''
  });

  // Function to fetch and process student data (optimized - no validation on load)
  const fetchAndProcessStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch all students for this teacher (no validation on load for performance)
      const studentsQuery = query(
        collection(db, "students"),
        where("teacherId", "==", currentUser.uid)
      );
      
      const studentsSnapshot = await getDocs(studentsQuery);
      const allStudentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Loaded ${allStudentsData.length} students for teacher`);
      
      setStudents(allStudentsData);
      
      // Generate classroom boxes from all students (validation happens only when adding new students)
      generateClassroomBoxes(allStudentsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({ open: true, message: 'Error loading data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh classroom data without page reload
  const refreshClassroomData = async () => {
    console.log('🔄 Refreshing classroom data...');
    await fetchAndProcessStudentData();
    console.log('✅ Classroom data refreshed successfully');
  };

  // Fetch students and generate classroom boxes
  useEffect(() => {
    if (!currentUser?.uid) return;
    fetchAndProcessStudentData();
  }, [currentUser]);

  // Filter students based on selected course and year
  const filteredStudents = students.filter(student => {
    const courseMatch = !selectedCourse || student.course === selectedCourse;
    const yearMatch = !selectedYear || student.yearLevel === selectedYear;
    return courseMatch && yearMatch;
  });

  // Group filtered students by course-year-section for display
  const groupedStudents = filteredStudents.reduce((groups, student) => {
    const key = `${student.course}-${student.yearLevel}-${student.section}`;
    if (!groups[key]) {
      groups[key] = {
        course: student.course,
        yearLevel: student.yearLevel,
        section: student.section,
        students: []
      };
    }
    groups[key].students.push(student);
    return groups;
  }, {});

  const classroomBoxes = Object.values(groupedStudents).map((classroom, index) => ({
    id: `${classroom.course}-${classroom.yearLevel}-${classroom.section}`,
    ...classroom,
    studentCount: classroom.students.length
  }));

  const generateClassroomBoxes = (studentsData) => {
    // This function is now handled by the filtering logic above
    setClassrooms([]);
  };


  const removeInvalidStudents = async (invalidStudents) => {
    try {
      const deletePromises = invalidStudents.map(student => 
        deleteDoc(doc(db, "students", student.id))
      );
      
      await Promise.all(deletePromises);
      console.log(`Successfully removed ${invalidStudents.length} invalid students from database`);
      
      setSnackbar({ 
        open: true, 
        message: `${invalidStudents.length} invalid student(s) have been permanently removed from the system.`, 
        severity: 'info' 
      });
    } catch (error) {
      console.error('Error removing invalid students:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error removing invalid students from database', 
        severity: 'error' 
      });
    }
  };

  const handleAddStudent = async () => {
    if (!studentForm.name.trim() || !studentForm.studentId.trim() || 
        !studentForm.course || !studentForm.yearLevel || !studentForm.section.trim()) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    setIsAddingStudent(true);
    try {
      console.log('🔍 Validating student ID:', studentForm.studentId);
      
      // Admin can freely add students without ID validation
      console.log('✅ Adding student to classroom (no validation required for admin)...');

      const newStudent = {
        name: studentForm.name.trim(),
        studentId: studentForm.studentId.trim(),
        course: studentForm.course,
        yearLevel: studentForm.yearLevel,
        section: studentForm.section.trim(),
        teacherId: currentUser.uid,
        createdAt: new Date().toISOString()
      };

      console.log('📝 Adding student to database:', newStudent);
      const studentDocRef = await addDoc(collection(db, "students"), newStudent);
      console.log('✅ Student added to database successfully with ID:', studentDocRef.id);
      
      // Update student's profile in users collection if they are registered
      // and send notification
      let studentInfo = null;
      let profileUpdated = false;
      let notificationSent = false;
      
      try {
        console.log('🔍 Looking up student info for profile update and notification...');
        studentInfo = await getStudentById(studentForm.studentId.trim());
        console.log('📊 Student info result:', studentInfo);
        
        if (studentInfo.student && studentInfo.student.isRegisteredUser) {
          // Update the student's profile in users collection with classroom information
          console.log('📝 Updating student profile in users collection...');
          await updateDoc(doc(db, "users", studentInfo.student.id), {
            course: studentForm.course,
            year: studentForm.yearLevel, // Map yearLevel to year for users collection
            section: studentForm.section.trim(),
            teacherId: currentUser.uid,
            classroomUpdatedAt: new Date().toISOString(),
            classroomUpdatedBy: currentUser.uid
          });
          console.log('✅ Student profile updated in users collection');
          profileUpdated = true;
        }
        
        if (studentInfo.student && studentInfo.student.email) {
          // Generate classroom link
          const classroomLink = `${window.location.origin}/classroom/${encodeURIComponent(studentForm.course)}/${encodeURIComponent(studentForm.yearLevel)}/${encodeURIComponent(studentForm.section)}`;
          
          const notificationData = {
            recipientEmail: studentInfo.student.email,
            recipientName: studentInfo.student.fullName || studentInfo.student.firstName + ' ' + studentInfo.student.lastName,
            recipientStudentId: studentForm.studentId.trim(), // Include Student ID for better tracking
            title: `🎓 You've been added to a classroom!`,
            message: `You have been added to the classroom: ${studentForm.course} - ${studentForm.yearLevel} - ${studentForm.section}. Click the link below to access your classroom dashboard and see your classmates.`,
            type: "classroom_addition",
            read: false,
            createdAt: new Date().toISOString(),
            classroomInfo: {
              course: studentForm.course,
              yearLevel: studentForm.yearLevel,
              section: studentForm.section,
              teacherId: currentUser.uid,
              studentId: studentForm.studentId.trim() // Include Student ID in classroom info
            },
            classroomLink: classroomLink,
            priority: "medium",
            autoRedirect: true // Flag to indicate this notification should trigger auto-redirect
          };
          
          console.log('📝 Creating notification:', notificationData);
          const notificationRef = await addDoc(collection(db, "notifications"), notificationData);
          console.log('✅ Classroom addition notification sent to student:', studentInfo.student.email, 'with ID:', notificationRef.id);
          notificationSent = true;
        } else {
          console.log('ℹ️ Student found but no email available for notification');
          console.log('Student info:', studentInfo);
        }
      } catch (notificationError) {
        console.error('❌ Error in profile update or notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }
      
      // Update local state immediately
      const newStudentWithId = { id: studentDocRef.id, ...newStudent };
      setStudents(prev => [...prev, newStudentWithId]);
      
      // Regenerate classroom boxes with the new student
      const updatedStudents = [...students, newStudentWithId];
      generateClassroomBoxes(updatedStudents);
      
      // Determine success message based on what was accomplished
      let successMessage = 'Student added to classroom successfully!';
      
      if (profileUpdated && notificationSent) {
        successMessage += ' Profile updated and notification sent.';
      } else if (profileUpdated && !notificationSent) {
        successMessage += ' Profile updated. (No email available for notification)';
      } else if (!profileUpdated && notificationSent) {
        successMessage += ' Notification sent.';
      } else {
        successMessage += ' (Student not registered in system - no profile update or notification sent)';
      }
      
      setSnackbar({ open: true, message: successMessage, severity: 'success' });
      setStudentForm({ name: '', studentId: '', course: '', yearLevel: '', section: '' });
      setOpenAddStudentDialog(false);
      
    } catch (error) {
      console.error('❌ Error adding student:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Error adding student';
      if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please check your access rights.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('validation')) {
        errorMessage = 'Student validation failed. Please verify the Student ID is correct.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setIsAddingStudent(false);
    }
  };


  const openClassroomView = (classroom) => {
    // Navigate to the classroom dashboard with URL parameters
    const course = encodeURIComponent(classroom.course);
    const yearLevel = encodeURIComponent(classroom.yearLevel);
    const section = encodeURIComponent(classroom.section);
    navigate(`/classroom/${course}/${yearLevel}/${section}`);
  };

  // Handle course filter selection - navigate to course dashboard
  const handleCourseFilter = (course) => {
    setSelectedCourse(course);
    if (course) {
      // Navigate to the course dashboard
      navigate(`/classroom/${encodeURIComponent(course)}`);
    }
  };

  const handleDeleteClassroom = async (classroom, event) => {
    // Prevent the card click event from firing
    event.stopPropagation();
    
    const classroomStudents = getStudentsForClassroom(classroom);
    const studentCount = classroomStudents.length;
    
    const confirmMessage = studentCount > 0 
      ? `Are you sure you want to delete the classroom "${classroom.course} - ${classroom.yearLevel} - ${classroom.section}"? This will permanently remove all ${studentCount} student(s) in this classroom.`
      : `Are you sure you want to delete the classroom "${classroom.course} - ${classroom.yearLevel} - ${classroom.section}"?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        // Delete all students in this classroom
        const deletePromises = classroomStudents.map(student => 
          deleteDoc(doc(db, "students", student.id))
        );
        
        await Promise.all(deletePromises);
        
        setSnackbar({ 
          open: true, 
          message: `Classroom "${classroom.course} - ${classroom.yearLevel} - ${classroom.section}" and all its students have been deleted successfully.`, 
          severity: 'success' 
        });
        
        // Refresh the classroom data
        await refreshClassroomData();
        
      } catch (error) {
        console.error('Error deleting classroom:', error);
        setSnackbar({ 
          open: true, 
          message: 'Error deleting classroom. Please try again.', 
          severity: 'error' 
        });
      }
    }
  };

  const getStudentsForClassroom = (classroom) => {
    return classroom.students || [];
  };

  // Handle edit student
  const handleEditStudent = (student) => {
    console.log('Editing student:', student);
    // TODO: Implement edit functionality
    setSnackbar({ open: true, message: 'Edit functionality coming soon!', severity: 'info' });
  };

  // Handle delete student
  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      try {
        await deleteDoc(doc(db, "students", student.id));
        setSnackbar({ 
          open: true, 
          message: `Student ${student.name} deleted successfully!`, 
          severity: 'success' 
        });
        // Refresh the data
        await refreshClassroomData();
      } catch (error) {
        console.error('Error deleting student:', error);
        setSnackbar({ 
          open: true, 
          message: 'Error deleting student. Please try again.', 
          severity: 'error' 
        });
      }
    }
  };

  if (loading || !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Typography>Loading classrooms...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          Student Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenAddStudentDialog(true)}
          sx={{
            bgcolor: '#424242',
            color: 'white'
          }}
        >
          Add Student
        </Button>
      </Box>

      {/* Filter Section */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Course</InputLabel>
          <Select
            value={selectedCourse}
            onChange={(e) => handleCourseFilter(e.target.value)}
            label="Filter by Course"
          >
            <MenuItem value="">
              <em>All Courses</em>
            </MenuItem>
            {courses.map((course) => (
              <MenuItem key={course} value={course}>
                {course}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Year</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            label="Filter by Year"
          >
            <MenuItem value="">
              <em>All Years</em>
            </MenuItem>
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(selectedCourse || selectedYear) && (
          <Button
            variant="outlined"
            onClick={() => {
              setSelectedCourse('');
              setSelectedYear('');
            }}
            sx={{ alignSelf: 'flex-end' }}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      {/* View Toggle */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, justifyContent: 'flex-end' }}>
        <Button
          variant={viewMode === 'cards' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setViewMode('cards')}
          sx={{
            bgcolor: viewMode === 'cards' ? '#800000' : 'transparent',
            color: viewMode === 'cards' ? '#ffffff' : '#000000',
            borderColor: '#000000',
            '&:hover': {
              bgcolor: viewMode === 'cards' ? '#6b0000' : '#800000',
              color: '#ffffff',
              borderColor: '#800000'
            }
          }}
        >
          Cards
        </Button>
        <Button
          variant={viewMode === 'table' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setViewMode('table')}
          sx={{
            bgcolor: viewMode === 'table' ? '#800000' : 'transparent',
            color: viewMode === 'table' ? '#ffffff' : '#000000',
            borderColor: '#000000',
            '&:hover': {
              bgcolor: viewMode === 'table' ? '#6b0000' : '#800000',
              color: '#ffffff',
              borderColor: '#800000'
            }
          }}
        >
          Table
        </Button>
      </Box>

      {/* Summary Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {selectedCourse || selectedYear ? 
            `Showing ${filteredStudents.length} student(s) from ${classroomBoxes.length} classroom(s)` :
            `Total: ${students.length} student(s) in ${classroomBoxes.length} classroom(s)`
          }
        </Typography>
        {(selectedCourse || selectedYear) && (
          <Typography variant="body2" color="text.secondary">
            Filtered by: {selectedCourse && `Course: ${selectedCourse}`} {selectedCourse && selectedYear && ' • '} {selectedYear && `Year: ${selectedYear}`}
          </Typography>
        )}
      </Box>

      {/* Content Display */}
      {filteredStudents.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {selectedCourse || selectedYear ? 
              `No students found for the selected filters.` : 
              `👉 No students added yet.`
            }
          </Typography>
        </Box>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <Grid container spacing={3}>
          {classroomBoxes.map((classroom) => {
            const classroomStudents = classroom.students;
            return (
              <Grid item xs={12} sm={6} md={4} key={classroom.id}>
                <Card
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderLeft: '4px solid',
                    borderImage: 'linear-gradient(135deg, #800000, #A00000, #C00000) 1',
                    borderRadius: 1.5,
                    bgcolor: '#B6CEB4',
                    cursor: 'pointer',
                    minHeight: '80px',
                    '&:hover': {
                      bgcolor: '#B6CEB4',
                      transform: 'none',
                      boxShadow: 'none',
                      borderLeft: '4px solid',
                      borderImage: 'linear-gradient(135deg, #A00000, #C00000, #E00000) 1'
                    }
                  }}
                  onClick={() => openClassroomView(classroom)}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Avatar sx={{ bgcolor: '#800000', width: 24, height: 24 }}>
                          <Class sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600} color="#2c3e2c" sx={{ fontSize: '0.8rem' }}>
                            {classroom.course}
                          </Typography>
                          <Typography variant="caption" color="#3d4f3d" sx={{ fontSize: '0.65rem' }}>
                            {classroom.yearLevel} - {classroom.section}
                          </Typography>
                        </Box>
                      </Box>
                      <Tooltip title="Delete Classroom">
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteClassroom(classroom, e)}
                          sx={{
                            color: '#d32f2f',
                            width: 20,
                            height: 20
                          }}
                        >
                          <DeleteOutline sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="h6" fontWeight={700} color="#000000" sx={{ fontSize: '1.1rem' }}>
                        {classroomStudents.length}
                      </Typography>
                      <Typography variant="caption" color="#3d4f3d" sx={{ fontSize: '0.65rem' }}>
                        {classroomStudents.length === 1 ? 'Student' : 'Students'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        /* Table View */
        <TableContainer component={Paper} sx={{ 
          maxHeight: 600, 
          width: '100%', 
          bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : 'inherit'
        }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ 
                bgcolor: '#800000' 
              }}>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Name</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Student ID</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Email</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Course</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Year Level</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Section</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell sx={{ fontSize: 14, fontWeight: 400 }}>
                    {student.name}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, fontWeight: 400 }}>
                    {student.studentId}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, fontWeight: 400 }}>
                    {student.email || 'N/A'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, fontWeight: 400 }}>
                    {student.course}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, fontWeight: 400 }}>
                    {student.yearLevel}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, fontWeight: 400 }}>
                    {student.section}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Edit Student">
                        <IconButton 
                          size="small"
                          sx={{ color: 'grey.600', '&:hover': { color: '#000000' } }}
                          onClick={() => handleEditStudent(student)}
                        >
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Student">
                        <IconButton 
                          size="small"
                          sx={{ color: 'grey.600', '&:hover': { color: '#d32f2f' } }}
                          onClick={() => handleDeleteStudent(student)}
                        >
                          <Delete sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Student Dialog */}
      <Dialog open={openAddStudentDialog} onClose={() => setOpenAddStudentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Student</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Student Name"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Student ID"
              value={studentForm.studentId}
              onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Course</InputLabel>
              <Select
                value={studentForm.course}
                onChange={(e) => setStudentForm({ ...studentForm, course: e.target.value })}
                label="Course"
              >
                {courses.map((course) => (
                  <MenuItem key={course} value={course}>
                    {course}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Year Level</InputLabel>
              <Select
                value={studentForm.yearLevel}
                onChange={(e) => setStudentForm({ ...studentForm, yearLevel: e.target.value })}
                label="Year Level"
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Section</InputLabel>
              <Select
                value={studentForm.section}
                onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
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
          <Button onClick={() => setOpenAddStudentDialog(false)} disabled={isAddingStudent}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddStudent} 
            variant="contained" 
            disabled={isAddingStudent}
            sx={{ bgcolor: '#424242' }}
          >
            {isAddingStudent ? 'Adding...' : 'Add Student'}
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