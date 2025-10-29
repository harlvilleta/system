import React, { useState, useEffect, useMemo } from "react";
import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, Grid, Chip, Avatar, InputAdornment, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, CardHeader, Divider, Tooltip, CircularProgress, Snackbar, Alert, Stack, Autocomplete, useTheme, TablePagination } from "@mui/material";
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { validateStudentId } from "../utils/studentValidation";
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { MenuItem } from "@mui/material";
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { logActivity } from '../firebase';
import emailjs from 'emailjs-com';

const statusColors = { Pending: 'warning', Solved: 'success' };
const EMAILJS_SERVICE_ID = 'service_7pgle82';
const EMAILJS_TEMPLATE_ID = 'template_f5q7j6q';
const EMAILJS_USER_ID = 'L77JuF4PF3ZtGkwHm';

export default function ViolationRecord() {
  const theme = useTheme();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({
    studentId: "",
    violation: "",
    classification: "",
    severity: "",
    date: "",
    time: "",
    location: "",
    description: "",
    witnesses: "",
    actionTaken: "",
    reportedBy: "",
    status: "Pending",
    image: null,
    studentName: ""
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewViolation, setViewViolation] = useState(null);
  const [editViolation, setEditViolation] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [dataRefresh, setDataRefresh] = useState(0);
  const [studentName, setStudentName] = useState("");
  const [students, setStudents] = useState([]);
  const [openMeetingModal, setOpenMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ studentId: '', studentName: '', location: '', purpose: '', date: '', time: '', description: '' });
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingSnackbar, setMeetingSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openMeetingsModal, setOpenMeetingsModal] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [editMeeting, setEditMeeting] = useState(null);
  const [printMode, setPrintMode] = useState(false);
  const [meetingStats, setMeetingStats] = useState({
    total: 0,
    pending: 0,
    scheduled: 0,
    completed: 0
  });
  const [studentInputValue, setStudentInputValue] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedMeetingStudent, setSelectedMeetingStudent] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({
    name: '',
    id: '',
    violation: '',
    location: ''
  });
  
  // Teacher-specific state
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [teacherViolations, setTeacherViolations] = useState([]);
  const [teacherViolationsLoading, setTeacherViolationsLoading] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);


  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate meeting statistics for selected student
  const calculateMeetingStats = (studentId) => {
    console.log('🔍 Calculating meeting stats for studentId:', studentId);
    console.log('📊 Total meetings available:', meetings.length);
    console.log('📋 All meetings:', meetings);
    
    if (!studentId || !meetings.length) {
      console.log('❌ No studentId or no meetings, setting stats to 0');
      setMeetingStats({ total: 0, pending: 0, scheduled: 0, completed: 0 });
      return;
    }

    const studentMeetings = meetings.filter(meeting => meeting.studentId === studentId);
    console.log('👤 Student meetings:', studentMeetings);
    
    const total = studentMeetings.length;
    const pending = studentMeetings.filter(meeting => meeting.status === 'Pending').length;
    const scheduled = studentMeetings.filter(meeting => meeting.status === 'Scheduled').length;
    const completed = studentMeetings.filter(meeting => meeting.status === 'Completed').length;

    console.log('📈 Calculated stats:', { total, pending, scheduled, completed });
    setMeetingStats({ total, pending, scheduled, completed });
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch user profile
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
          if (!userDoc.empty) {
            setUserProfile(userDoc.docs[0].data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        // Fetch all violations from the violations collection
        const snap = await getDocs(collection(db, "violations"));
        const violationsData = snap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          // Normalize field names for consistent display
          violation: doc.data().violation || doc.data().violationType || 'N/A',
          studentName: doc.data().studentName || 'N/A',
          studentId: doc.data().studentId || doc.data().studentIdNumber || 'N/A',
          reportedBy: doc.data().reportedBy || doc.data().reportedByName || 'N/A',
          // Ensure we have all necessary fields
          classification: doc.data().classification || 'N/A',
          severity: doc.data().severity || 'N/A',
          date: doc.data().date || 'N/A',
          time: doc.data().time || 'N/A',
          location: doc.data().location || 'N/A',
          description: doc.data().description || 'N/A',
          witnesses: doc.data().witnesses || 'N/A',
          actionTaken: doc.data().actionTaken || 'N/A',
          status: doc.data().status || 'Pending',
          createdAt: doc.data().createdAt || doc.data().timestamp || new Date().toISOString()
        }));
        
        console.log('📊 Fetched violations:', violationsData.length);
        console.log('📋 Sample violation:', violationsData[0]);
        
        setRecords(violationsData);
      } catch (e) {
        console.error('Error fetching violations:', e);
        setRecords([]);
      }
    };
    fetchViolations();
    // Fetch all students for ID lookup
    const fetchStudents = async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        const studentsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort students by creation date (newest first)
        const sortedStudents = studentsData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        setStudents(sortedStudents);
      } catch (e) {
        setStudents([]);
      }
    };
    fetchStudents();
  }, [dataRefresh]);

  // Fetch teacher violations when user is authenticated
  useEffect(() => {
    if (currentUser?.uid) {
      fetchTeacherViolations();
    }
  }, [currentUser, dataRefresh]);

  const fetchTeacherViolations = async () => {
    if (!currentUser?.uid && !currentUser?.email) {
      console.log('No current user available for fetching teacher violations');
      setTeacherViolations([]);
      return;
    }

    setTeacherViolationsLoading(true);
    try {
      console.log('Fetching teacher violations for user:', { uid: currentUser.uid, email: currentUser.email });
      
      // Use the same approach as TeacherDashboard - try reportedBy first, then email
      const violationsQuery = query(
        collection(db, 'violations'),
        where('reportedBy', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(violationsQuery);
      let violationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('Fetched teacher violations by UID:', violationsData.length);
      
      // If no results by UID, try by email
      if (violationsData.length === 0 && currentUser?.email) {
        console.log('No violations found by UID, trying by email...');
        const violationsByEmailQuery = query(
          collection(db, 'violations'),
          where('reportedByEmail', '==', currentUser.email),
          orderBy('createdAt', 'desc')
        );
        const emailSnapshot = await getDocs(violationsByEmailQuery);
        violationsData = emailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Fetched teacher violations by email:', violationsData.length);
      }
      
      // If still no results, try by reportedByName
      if (violationsData.length === 0 && userProfile?.fullName) {
        console.log('No violations found by email, trying by name...');
        const violationsByNameQuery = query(
          collection(db, 'violations'),
          where('reportedByName', '==', userProfile.fullName),
          orderBy('createdAt', 'desc')
        );
        const nameSnapshot = await getDocs(violationsByNameQuery);
        violationsData = nameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Fetched teacher violations by name:', violationsData.length);
      }
      
      console.log('Final teacher violations data:', violationsData);
      setTeacherViolations(violationsData);
      
    } catch (error) {
      console.error('Error fetching teacher violations:', error);
      setTeacherViolations([]);
    } finally {
      setTeacherViolationsLoading(false);
    }
  };

  // Fetch meetings when modal opens
  useEffect(() => {
    if (openMeetingsModal || openMeetingModal) {
      const fetchMeetings = async () => {
        try {
          const snap = await getDocs(collection(db, 'meetings'));
          setMeetings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
          setMeetings([]);
        }
      };
      fetchMeetings();
    }
  }, [openMeetingsModal, openMeetingModal, meetingSnackbar]);

  const baseByStatus = statusFilter === 'all' ? records : records.filter(v => (statusFilter === 'pending' ? v.status === 'Pending' : statusFilter === 'solved' ? v.status === 'Solved' : true));
  // Sort newest first using createdAt if available
  const sortedByDate = [...baseByStatus].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });
  const filtered = (() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return sortedByDate;
    }
    return sortedByDate.filter(v => {
      const name = (v.studentName || '').toLowerCase();
      const id = (v.studentId || '').toLowerCase();
      const violation = (v.violation || v.violationType || '').toLowerCase();
      const classification = (v.classification || '').toLowerCase();
      const reporter = (v.reportedBy || v.reportedByName || '').toLowerCase();
      const location = (v.location || '').toLowerCase();
      const description = (v.description || '').toLowerCase();
      const witnesses = (v.witnesses || '').toLowerCase();
      const actionTaken = (v.actionTaken || '').toLowerCase();
      const severity = (v.severity || '').toLowerCase();
      const status = (v.status || '').toLowerCase();
      
      return name.includes(term) || 
             id.includes(term) || 
             violation.includes(term) || 
             classification.includes(term) || 
             reporter.includes(term) ||
             location.includes(term) ||
             description.includes(term) ||
             witnesses.includes(term) ||
             actionTaken.includes(term) ||
             severity.includes(term) ||
             status.includes(term);
    });
  })();

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, page, rowsPerPage]);

  // Summary stats
  const total = records.length;
  const pending = records.filter(v => v.status === 'Pending').length;
  const solved = records.filter(v => v.status === 'Solved').length;

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === "studentId") {
      const student = students.find(s => s.id === value);
      if (student) {
        setStudentName(`${student.firstName} ${student.lastName}`);
        setForm(f => ({ ...f, studentName: `${student.firstName} ${student.lastName}` }));
      } else {
        setStudentName("");
        setForm(f => ({ ...f, studentName: "" }));
      }
    }
  };
  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: 'Please select a valid image file', severity: 'error' });
        return;
      }
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: 'Image file size must be less than 200KB', severity: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result);
        setSnackbar({ open: true, message: 'Image loaded as base64!', severity: 'success' });
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that the student ID is registered in the system
    try {
      const validationResult = await validateStudentId(form.studentId);
      if (!validationResult.isValid) {
        setSnackbar({ 
          open: true, 
          message: `Error: ${validationResult.error}. Please ensure the student is properly registered before adding violations.`, 
          severity: "error" 
        });
        return;
      }
    } catch (validationError) {
      console.error("Student validation error:", validationError);
      setSnackbar({ 
        open: true, 
        message: "Student validation failed. Please try again or contact support.", 
        severity: "error" 
      });
      return;
    }
    
    setIsSubmitting(true);
    let imageUrl = null;
    let uploadTimedOut = false;
    try {
      if (imageFile) {
        try {
          const storageRef = ref(storage, `violation_evidence/${form.studentId}_${Date.now()}_${imageFile.name}`);
          // Add timeout for uploadBytes (15s)
          const uploadPromise = uploadBytes(storageRef, imageFile);
          const uploadTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Image upload timed out')), 15000));
          await Promise.race([uploadPromise, uploadTimeout]);
          // Only try getDownloadURL if uploadBytes succeeded
          try {
            const urlPromise = getDownloadURL(storageRef);
            const urlTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Image URL fetch timed out')), 15000));
            imageUrl = await Promise.race([urlPromise, urlTimeout]);
          } catch (urlErr) {
            console.error("Image getDownloadURL error:", urlErr);
            setSnackbar({ open: true, message: "Image uploaded but URL fetch failed. Violation will be saved without image.", severity: "warning" });
            imageUrl = null;
          }
        } catch (imgErr) {
          console.error("Image upload error:", imgErr);
          uploadTimedOut = true;
          setSnackbar({ open: true, message: "Image upload failed or timed out. Violation will be saved without image.", severity: "warning" });
          imageUrl = null;
        }
      }
      
      // Get student details for notification
      const student = students.find(s => s.id === form.studentId);
      const studentEmail = student?.email;
      const studentName = student ? `${student.firstName} ${student.lastName}` : form.studentName;
      
      const violationData = {
        ...form,
        image: imageUrl,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: "Pending"
      };
      
      const violationRef = await addDoc(collection(db, "violations"), violationData);
      
      // Create detailed notification for the student
      if (studentEmail) {
        try {
          // Create comprehensive notification message with all violation details
          const notificationMessage = `
🚨 NEW VIOLATION REPORTED

Dear ${studentName},

A new violation has been reported for you with the following details:

📋 VIOLATION DETAILS:
• Type: ${form.violation}
• Classification: ${form.classification}
• Severity: ${form.severity || 'Not specified'}
• Date: ${form.date}
• Time: ${form.time || 'Not specified'}
• Location: ${form.location || 'Not specified'}

📝 DESCRIPTION:
${form.description || 'No description provided'}

👥 ADDITIONAL INFORMATION:
• Witnesses: ${form.witnesses || 'None specified'}
• Reported By: ${form.reportedBy || 'Not specified'}
• Action Taken: ${form.actionTaken || 'Pending review'}

⚠️ IMPORTANT:
Please review this violation in your student dashboard. You may need to take action or attend a meeting regarding this matter.

For questions or concerns, please contact the administration office.

Best regards,
School Administration
          `.trim();

          await addDoc(collection(db, "notifications"), {
            recipientEmail: studentEmail,
            recipientName: studentName,
            title: `🚨 New Violation: ${form.violation}`,
            message: notificationMessage,
            type: "violation",
            severity: form.severity || "Medium",
            read: false,
            createdAt: new Date().toISOString(),
            violationId: violationRef.id,
            violationDetails: {
              type: form.violation,
              classification: form.classification,
              severity: form.severity,
              date: form.date,
              time: form.time,
              location: form.location,
              description: form.description,
              witnesses: form.witnesses,
              reportedBy: form.reportedBy,
              actionTaken: form.actionTaken
            },
            priority: form.severity === "Critical" ? "high" : 
                     form.severity === "High" ? "high" : 
                     form.severity === "Medium" ? "medium" : "low"
          });

          console.log("Detailed violation notification created for student:", studentEmail);
        } catch (notificationError) {
          console.error("Error creating detailed notification:", notificationError);
          // Fallback to simple notification
          try {
            await addDoc(collection(db, "notifications"), {
              recipientEmail: studentEmail,
              title: "New Violation Reported",
              message: `A new violation "${form.violation}" has been reported for you on ${form.date}. Please review the details in your dashboard.`,
              type: "violation",
              read: false,
              createdAt: new Date().toISOString(),
              violationId: violationRef.id
            });
          } catch (fallbackError) {
            console.error("Error creating fallback notification:", fallbackError);
          }
        }
      }
      
      await logActivity({ message: `Violation added for student: ${form.studentId}`, type: 'add_violation' });
      setForm({
        studentId: "",
        violation: "",
        classification: "",
        severity: "",
        date: "",
        time: "",
        location: "",
        description: "",
        witnesses: "",
        actionTaken: "",
        reportedBy: "",
        status: "Pending",
        image: null,
        studentName: ""
      });
      setSelectedStudent(null);
      setStudentInputValue('');
      setStudentName("");
      setImageFile(null);
      setSnackbar({ open: true, message: uploadTimedOut ? "Violation added (image upload failed) - Student notified!" : "Violation added successfully - Student notified!", severity: uploadTimedOut ? "warning" : "success" });
      setDataRefresh(r => r + 1); // refresh table after add
      setShowAddModal(false); // Close the modal after successful submission
    } catch (e) {
      console.error("Error saving violation:", e);
      setSnackbar({ open: true, message: "Error adding violation.", severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };
  // Manual reset if stuck
  const handleReset = () => {
    setIsSubmitting(false);
    setSnackbar({ open: true, message: "Form reset. You can try submitting again.", severity: "info" });
  };

  // Edit handler
  const handleEdit = (violation) => setEditViolation(violation);
  const handleEditSave = async (updated) => {
    try {
      await updateDoc(doc(db, "violations", updated.id), updated);
      await logActivity({ message: `Violation updated for student: ${updated.studentId}`, type: 'edit_violation' });
      setSnackbar({ open: true, message: "Violation updated!", severity: "success" });
      setEditViolation(null);
      setDataRefresh(r => r + 1); // refresh table after edit
    } catch (e) {
      setSnackbar({ open: true, message: "Error updating violation.", severity: "error" });
    }
  };
  // Delete handler
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "violations", id));
      await logActivity({ message: `Violation deleted (ID: ${id})`, type: 'delete_violation' });
      setSnackbar({ open: true, message: "Violation deleted!", severity: "success" });
      setDeleteConfirm({ open: false, id: null });
      setDataRefresh(r => r + 1); // refresh table after delete
    } catch (e) {
      setSnackbar({ open: true, message: "Error deleting violation.", severity: "error" });
    }
  };

  const handleMeetingFormChange = (e) => {
    const { name, value } = e.target;
    setMeetingForm(f => ({ ...f, [name]: value }));
    if (name === 'studentId') {
      const student = students.find(s => s.id === value);
      if (student) {
        setMeetingForm(f => ({ ...f, studentName: `${student.firstName} ${student.lastName}` }));
      } else {
        setMeetingForm(f => ({ ...f, studentName: '' }));
      }
    }
    if (name === 'studentName') {
      const student = students.find(s => `${s.firstName} ${s.lastName}` === value);
      if (student) {
        setMeetingForm(f => ({ ...f, studentId: student.id }));
      } else {
        setMeetingForm(f => ({ ...f, studentId: '' }));
      }
    }
  };
  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    setMeetingSubmitting(true);
    try {
      // Prepare participants array
      const participants = [];
      
      // Add student to participants
      const student = students.find(s => s.id === meetingForm.studentId || `${s.firstName} ${s.lastName}` === meetingForm.studentName);
      if (student && student.email) {
        participants.push(student.email);
      }
      
      // Add current teacher to participants
      if (currentUser?.email) {
        participants.push(currentUser.email);
      }
      if (currentUser?.uid) {
        participants.push(currentUser.uid);
      }

      const meetingData = {
        studentId: meetingForm.studentId || '',
        studentName: meetingForm.studentName || '',
        location: meetingForm.location || '',
        purpose: meetingForm.purpose || '',
        date: meetingForm.date || '',
        time: meetingForm.time || '',
        description: meetingForm.description || '',
        participants: participants,
        createdAt: new Date().toISOString(),
        type: 'meeting',
        status: 'Scheduled'
      };

      // Only add teacher fields if currentUser is available
      if (currentUser?.uid) {
        meetingData.teacherUid = currentUser.uid;
        meetingData.teacherEmail = currentUser.email || '';
        meetingData.teacherName = userProfile?.fullName || currentUser?.displayName || 'Teacher';
        meetingData.organizer = currentUser.uid;
      }

      await addDoc(collection(db, 'meetings'), meetingData);
      
      // Send email notification to student
      if (student && student.email) {
        // Send email notification
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: student.email,
            subject: `Meeting Scheduled: ${meetingForm.purpose}`,
            message: `Dear ${student.firstName} ${student.lastName},\n\nYou have a meeting scheduled.\n\nPurpose: ${meetingForm.purpose}\nLocation: ${meetingForm.location}\nDate: ${meetingForm.date}\nTime: ${meetingForm.time}\nDescription: ${meetingForm.description || ''}\n\nPlease be on time.\n\nThank you.`,
          },
          EMAILJS_USER_ID
        );
      }
      setMeetingSnackbar({ open: true, message: 'Meeting created successfully!', severity: 'success' });
      setOpenMeetingModal(false);
      setMeetingForm({ studentId: '', studentName: '', location: '', purpose: '', date: '', time: '', description: '' });
    } catch (e) {
      setMeetingSnackbar({ open: true, message: 'Failed to create meeting.', severity: 'error' });
    }
    setMeetingSubmitting(false);
  };

  const handleDeleteMeeting = async (id) => {
    try {
      await deleteDoc(doc(db, 'meetings', id));
      setMeetings(meetings => meetings.filter(m => m.id !== id));
      setMeetingSnackbar({ open: true, message: 'Meeting deleted.', severity: 'success' });
    } catch (e) {
      setMeetingSnackbar({ open: true, message: 'Failed to delete meeting.', severity: 'error' });
    }
  };

  const handleEditMeetingSave = async (updated) => {
    try {
      await updateDoc(doc(db, 'meetings', updated.id), updated);
      setMeetings(meetings => meetings.map(m => m.id === updated.id ? updated : m));
      setMeetingSnackbar({ open: true, message: 'Meeting updated.', severity: 'success' });
      setEditMeeting(null);
    } catch (e) {
      setMeetingSnackbar({ open: true, message: 'Failed to update meeting.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #violation-document, #violation-document * { visibility: visible; }
            #violation-document { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}
      </style>
      {/* Welcome Section */}
      <Box sx={{ mb: 2, pt: { xs: 1, sm: 1 }, px: { xs: 0, sm: 0 } }}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          gutterBottom 
          sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
            wordBreak: 'break-word',
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            lineHeight: 1.2
          }}
        >
          Violation Records
        </Typography>
      </Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card onClick={() => setStatusFilter('all')} sx={{ 
            cursor: 'pointer', 
            boxShadow: 2, 
            borderLeft: '4px solid #800000',
            textAlign: 'center',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
            }
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }} fontWeight={700}>{total}</Typography>
              <Typography variant="body2" color="textSecondary">Total Violations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card onClick={() => setStatusFilter('pending')} sx={{ 
            cursor: 'pointer', 
            boxShadow: 2, 
            borderLeft: '4px solid #800000',
            textAlign: 'center',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
            }
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }} fontWeight={700}>{pending}</Typography>
              <Typography variant="body2" color="textSecondary">Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card onClick={() => setStatusFilter('solved')} sx={{ 
            cursor: 'pointer', 
            boxShadow: 2, 
            borderLeft: '4px solid #800000',
            textAlign: 'center',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
            }
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }} fontWeight={700}>{solved}</Typography>
              <Typography variant="body2" color="textSecondary">Solved</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Add Violation and History Buttons */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
          onClick={() => setShowAddModal(true)}
            sx={{
              bgcolor: '#ffffff',
              color: '#000000',
              borderColor: '#000000',
              px: 2,
              py: 1,
              fontSize: '0.75rem',
              fontWeight: 500,
              borderRadius: 1,
              '&:hover': {
                bgcolor: '#800000',
                color: '#ffffff',
                borderColor: '#800000',
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(128, 0, 0, 0.3)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            Add New Violation
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowHistory(true)}
            sx={{
              bgcolor: '#ffffff',
              color: '#000000',
              borderColor: '#000000',
              px: 2,
              py: 1,
              fontSize: '0.75rem',
              fontWeight: 500,
              borderRadius: 1,
              '&:hover': {
                bgcolor: '#800000',
                color: '#ffffff',
                borderColor: '#800000',
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(128, 0, 0, 0.3)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            History
          </Button>
        </Box>

      {/* History Modal */}
      <Dialog 
        open={showHistory} 
        onClose={() => setShowHistory(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '70vh',
            minHeight: '40vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#f8f9fa', 
          borderBottom: '1px solid #e0e0e0',
          p: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
            Violation History
          </Typography>
          <IconButton 
            onClick={() => setShowHistory(false)}
            sx={{ 
              color: '#666666',
              '&:hover': { 
                color: '#000000',
                bgcolor: '#f0f0f0'
              }
            }}
          >
            ×
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {/* Search Bar Section */}
          <Box sx={{ 
            p: 1.5, 
            bgcolor: '#fafafa', 
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-start'
          }}>
            <TextField
              value={historyFilter.name}
              onChange={(e) => setHistoryFilter({...historyFilter, name: e.target.value})}
              placeholder="Search by Student Name/ID, Violation Type, Reporter, Location..."
              size="small"
              sx={{ 
                width: '180px',
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#ffffff',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#800000'
                    }
                  },
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#800000'
                    }
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#800000' }} />
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* Table Section */}
          <Box sx={{ flex: 1 }}>
            {(() => {
              // Filter records based on search term
              const searchTerm = historyFilter.name.trim().toLowerCase();
              const filteredHistory = searchTerm ? records.filter(record => {
                const name = (record.studentName || '').toLowerCase();
                const id = (record.studentId || '').toLowerCase();
                const violation = (record.violation || record.violationType || '').toLowerCase();
                const location = (record.location || '').toLowerCase();
                const reporter = (record.reportedBy || record.reportedByName || '').toLowerCase();
                const description = (record.description || '').toLowerCase();
                const severity = (record.severity || '').toLowerCase();
                const status = (record.status || '').toLowerCase();
                
                return name.includes(searchTerm) || 
                       id.includes(searchTerm) || 
                       violation.includes(searchTerm) || 
                       location.includes(searchTerm) ||
                       reporter.includes(searchTerm) ||
                       description.includes(searchTerm) ||
                       severity.includes(searchTerm) ||
                       status.includes(searchTerm);
              }) : records;

              // Get paginated records
              const paginatedRecords = useMemo(() => {
                const startIndex = page * rowsPerPage;
                const endIndex = startIndex + rowsPerPage;
                return filteredHistory.slice(startIndex, endIndex);
              }, [filteredHistory, page, rowsPerPage]);

              return (
                <>
                  <TableContainer component={Paper} elevation={2} sx={{ 
                    bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff'
                  }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 12px',
                      minWidth: '120px',
                      maxWidth: '120px'
                    }}>Name</TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 12px',
                      minWidth: '100px',
                      maxWidth: '100px'
                    }}>Student ID</TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 12px',
                      minWidth: '150px',
                      maxWidth: '150px'
                    }}>Violation</TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 12px',
                      minWidth: '100px',
                      maxWidth: '100px'
                    }}>Date</TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 12px',
                      minWidth: '120px',
                      maxWidth: '120px'
                    }}>Location</TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 12px',
                      minWidth: '100px',
                      maxWidth: '100px'
                    }}>Reported By</TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 12px',
                      minWidth: '100px',
                      maxWidth: '100px'
                    }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ 
                        textAlign: 'center', 
                        py: 4,
                        color: '#666666',
                        fontStyle: 'italic'
                      }}>
                        {searchTerm ? 'No violation records found matching your search.' : 'No violation records found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRecords.map((record, idx) => (
                      <TableRow 
                        key={record.id || idx} 
                        hover 
                        sx={{ 
                          cursor: 'pointer',
                          '&:nth-of-type(even)': {
                            bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f9f9f9'
                          },
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' ? '#333333' : '#f0f0f0'
                          }
                        }}
                      >
                        <TableCell sx={{ 
                          fontWeight: 500,
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0'
                        }} onClick={() => setViewViolation(record)}>
                          {record.studentName || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 500,
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0'
                        }} onClick={() => setViewViolation(record)}>
                          {record.studentId || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 500,
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0',
                          maxWidth: 150,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} onClick={() => setViewViolation(record)}>
                          <Tooltip title={record.violation || ''}>
                            <span>{record.violation || 'N/A'}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 500,
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0'
                        }} onClick={() => setViewViolation(record)}>
                          {record.date || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 500,
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0'
                        }} onClick={() => setViewViolation(record)}>
                          {record.location || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 500,
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0'
                        }} onClick={() => setViewViolation(record)}>
                          {record.reportedBy || record.reportedByName || 'N/A'}
                        </TableCell>
                        <TableCell align="center" sx={{ 
                          borderBottom: '1px solid #f0f0f0',
                          padding: '8px 12px'
                        }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="View record">
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  color: '#666666', 
                                  '&:hover': { 
                                    color: '#1976d2',
                                    bgcolor: '#e3f2fd'
                                  } 
                                }} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewViolation(record);
                                }}
                              >
                                <VisibilityIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit record">
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  color: '#666666', 
                                  '&:hover': { 
                                    color: '#000000',
                                    bgcolor: '#f0f0f0'
                                  } 
                                }} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditViolation(record);
                                }}
                              >
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete record">
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  color: '#666666', 
                                  '&:hover': { 
                                    color: '#d32f2f',
                                    bgcolor: '#ffebee'
                                  } 
                                }} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ open: true, id: record.id });
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 8]}
              component="div"
              count={filteredHistory.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
                borderTop: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0'
              }}
            />
                </>
              );
            })()}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 1.5, 
          bgcolor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          justifyContent: 'center'
        }}>
          <Button 
            onClick={() => setShowHistory(false)}
            variant="outlined"
            sx={{
              minWidth: 100,
              bgcolor: '#ffffff',
              color: '#000000',
              borderColor: '#d0d0d0',
              '&:hover': {
                bgcolor: '#800000',
                color: '#ffffff',
                borderColor: '#800000'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add New Violation Modal */}
      <Dialog 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#f8f9fa', 
          borderBottom: '1px solid #e0e0e0',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
            Add New Violation
          </Typography>
          <IconButton 
            onClick={() => setShowAddModal(false)}
            sx={{ 
              color: '#666666',
              '&:hover': { 
                color: '#000000',
                bgcolor: '#f0f0f0'
              }
            }}
          >
            ×
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={students.filter(student => {
                    // Only show suggestions if user has typed at least one character
                    if (!studentInputValue || studentInputValue.length < 1) {
                      return false;
                    }
                    
                    // Add null/undefined checks for all properties
                    const firstName = student.firstName || '';
                    const lastName = student.lastName || '';
                    const studentId = student.id || '';
                    const course = student.course || '';
                    const year = student.year || '';
                    
                    const fullName = `${firstName} ${lastName}`.toLowerCase();
                    const input = studentInputValue.toLowerCase();
                    
                    // Check for exact match first (both first and last names)
                    if (fullName === input) {
                      return true;
                    }
                    
                    // Check if input matches first name, last name, full name, or student ID
                    return firstName.toLowerCase().includes(input) ||
                           lastName.toLowerCase().includes(input) ||
                           fullName.includes(input) ||
                           studentId.toLowerCase().includes(input);
                  }).slice(0, 5)} // Limit to 5 suggestions
                  getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''}`}
                  value={selectedStudent}
                  onChange={(event, newValue) => {
                    setSelectedStudent(newValue);
                    setForm(f => ({
                      ...f,
                      studentId: newValue ? newValue.id : '',
                      studentName: newValue ? `${newValue.firstName} ${newValue.lastName}` : ''
                    }));
                  }}
                  inputValue={studentInputValue}
                  onInputChange={(event, newInputValue) => {
                    setStudentInputValue(newInputValue);
                  }}
                  open={studentInputValue && studentInputValue.length > 0} // Only open when typing
                  disablePortal={false}
                  PaperComponent={({ children, ...other }) => (
                    <Paper 
                      {...other} 
                      sx={{ 
                        backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: theme.palette.mode === 'dark' ? '1px solid #404040' : 'none',
                        '& .MuiAutocomplete-option': {
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          },
                        }
                      }}
                    >
                      {children}
                    </Paper>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Student Name or ID"
                      required
                      fullWidth
                      helperText="Type to search by student name or ID"
                      placeholder="Start typing student name or ID..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: theme.palette.mode === 'dark' ? '#404040' : '#ffffff',
                          '& fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? '#666666' : '#e0e0e0',
                          },
                          '&:hover fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#b0b0b0',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#666666',
                        },
                        '& .MuiInputBase-input': {
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        },
                        '& .MuiAutocomplete-input': {
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        }
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>
                          {option.firstName || ''} {option.lastName || ''}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#b0b0b0' : 'text.secondary' }}>
                          ID: {option.id || 'N/A'} | {option.course || 'N/A'} - {option.year || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  filterOptions={(options, { inputValue }) => {
                    const filtered = options.filter(option => {
                      // Add null/undefined checks for all properties
                      const firstName = option.firstName || '';
                      const lastName = option.lastName || '';
                      const studentId = option.id || '';
                      
                      const fullName = `${firstName} ${lastName}`.toLowerCase();
                      const searchTerm = inputValue.toLowerCase();
                      
                      // Check for exact match first
                      if (fullName === searchTerm) {
                        return true;
                      }
                      
                      // Check if input matches first name, last name, full name, or student ID
                      return firstName.toLowerCase().includes(searchTerm) ||
                             lastName.toLowerCase().includes(searchTerm) ||
                             fullName.includes(searchTerm) ||
                             studentId.toLowerCase().includes(searchTerm);
                    });
                    return filtered.slice(0, 5); // Limit to 5 suggestions
                  }}
                  noOptionsText="No students found"
                  clearOnEscape
                  selectOnFocus
                  handleHomeEndKeys
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Violation" name="violation" value={form.violation} onChange={handleFormChange} required fullWidth helperText="Type of violation" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Classification" name="classification" value={form.classification} onChange={handleFormChange} select fullWidth required helperText="Select classification">
                  <MenuItem value="">Select</MenuItem>
                  <MenuItem value="Academic">Academic</MenuItem>
                  <MenuItem value="Behavioral">Behavioral</MenuItem>
                  <MenuItem value="Policy/Rules">Policy/Rules</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Severity" name="severity" value={form.severity} onChange={handleFormChange} select fullWidth required helperText="Severity level">
                  <MenuItem value="">Select</MenuItem>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Status" name="status" value={form.status} onChange={handleFormChange} select fullWidth required helperText="Mark as pending or solved">
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Solved">Solved</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Date" name="date" type="date" value={form.date} onChange={handleFormChange} InputLabelProps={{ shrink: true }} fullWidth required helperText="Date of violation" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Time" name="time" type="time" value={form.time} onChange={handleFormChange} InputLabelProps={{ shrink: true }} fullWidth helperText="Time (optional)" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Location" name="location" value={form.location} onChange={handleFormChange} fullWidth helperText="Location (optional)" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Reported By" name="reportedBy" value={form.reportedBy} onChange={handleFormChange} fullWidth helperText="Who reported?" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Action Taken" name="actionTaken" value={form.actionTaken} onChange={handleFormChange} fullWidth helperText="Action taken (optional)" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Witnesses" name="witnesses" value={form.witnesses} onChange={handleFormChange} fullWidth helperText="Witnesses (optional)" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip title="Attach an image as evidence (optional)">
                  <Button variant="contained" component="label" fullWidth sx={{ bgcolor: '#800000', color: '#fff', '&:hover': { bgcolor: '#6b0000' } }}>
                    Attach Evidence Image
                    <input type="file" accept="image/*" hidden onChange={handleImage} />
                  </Button>
                </Tooltip>
                {imageFile && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={imageFile} sx={{ width: 40, height: 40 }} variant="rounded" />
                    <Button variant="outlined" color="error" size="small" onClick={() => setImageFile(null)}>Remove</Button>
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField label="Description" name="description" value={form.description} onChange={handleFormChange} fullWidth multiline minRows={3} helperText="Describe the violation (optional)" />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 2, 
          bgcolor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          justifyContent: 'space-between'
        }}>
          <Button 
            onClick={() => {
              setShowAddModal(false);
              // Reset form when canceling
              setForm({
                studentId: "",
                violation: "",
                classification: "",
                severity: "",
                date: "",
                time: "",
                location: "",
                description: "",
                witnesses: "",
                actionTaken: "",
                reportedBy: "",
                status: "Pending",
                image: null,
                studentName: ""
              });
              setImageFile(null);
              setSelectedStudent(null);
              setStudentInputValue('');
            }}
            variant="outlined"
            sx={{
              minWidth: 100,
              bgcolor: '#ffffff',
              color: '#d32f2f',
              borderColor: '#d32f2f',
              '&:hover': {
                bgcolor: '#d32f2f',
                color: '#ffffff',
                borderColor: '#d32f2f'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            sx={{
              minWidth: 120,
              bgcolor: '#800000',
              color: '#ffffff',
              '&:hover': {
                bgcolor: '#6b0000'
              }
            }}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Add Violation"}
          </Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ mb: 3 }} />
      
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by Student Name/ID, Violation Type, Reporter, Location, Description, Status..."
          size="small"
          sx={{ 
            width: { xs: '100%', sm: '50%' },
            '& .MuiOutlinedInput-root': {
              bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#ffffff',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#800000'
                }
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#800000'
                }
              }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#800000' }} />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Expanded Table Container */}
      <TableContainer component={Paper} elevation={2} sx={{ 
          width: '100%', 
        bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
        borderRadius: 2
        }}>
        <Table stickyHeader>
            <TableHead>
                <TableRow sx={{ 
                  bgcolor: '#800000' 
                }}>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Student Name</TableCell>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
                  }}>Student ID</TableCell>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
                  }}>Violation</TableCell>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Classification</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
              }}>Severity</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
                  }}>Date</TableCell>
                  <TableCell sx={{ 
                    bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
                  }}>Status</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
                  }}>Reported By</TableCell>
              <TableCell sx={{ 
                bgcolor: '#800000',
                color: '#ffffff', 
                fontWeight: 600,
                fontSize: '16px',
                padding: '16px'
                  }} align="center">Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No violations found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedData.map((v, idx) => (
                <TableRow key={v.id || idx} hover sx={{ cursor: 'pointer' }}>
                <TableCell 
                  sx={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    padding: '12px 16px'
                  }} 
                  onClick={() => setViewViolation(v)}
                >
                  {v.studentName || 'N/A'}
                  </TableCell>
                <TableCell 
                  sx={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    padding: '12px 16px'
                  }} 
                  onClick={() => setViewViolation(v)}
                >
                  {v.studentId || 'N/A'}
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '12px 16px'
                  }} 
                  onClick={() => setViewViolation(v)}
                >
                  <Tooltip title={v.violation || ''}>
                    <span>{v.violation || 'N/A'}</span>
                  </Tooltip>
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    padding: '12px 16px'
                  }} 
                  onClick={() => setViewViolation(v)}
                >
                  {v.classification || 'N/A'}
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    padding: '12px 16px'
                  }} 
                  onClick={() => setViewViolation(v)}
                >
                  <Chip 
                    label={v.severity || 'N/A'} 
                    size="small" 
                    color={
                      v.severity === 'Critical' ? 'error' :
                      v.severity === 'High' ? 'error' :
                      v.severity === 'Medium' ? 'warning' :
                      v.severity === 'Low' ? 'success' : 'default'
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    padding: '12px 16px'
                  }} 
                  onClick={() => setViewViolation(v)}
                >
                  {v.date || 'N/A'}
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    padding: '12px 16px'
                  }} 
                  onClick={() => setViewViolation(v)}
                >
                  <Chip 
                    label={v.status || 'N/A'} 
                    size="small" 
                    color={
                      v.status === 'Solved' ? 'success' :
                      v.status === 'Pending' ? 'warning' : 'default'
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    padding: '12px 16px'
                  }} 
                  onClick={() => setViewViolation(v)}
                >
                  {v.reportedBy || v.reportedByName || 'N/A'}
                </TableCell>
                <TableCell align="center" sx={{ padding: '12px 16px' }}>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="View record">
                        <IconButton 
                          size="small" 
                        sx={{ 
                          color: '#666666',
                          '&:hover': { 
                            color: '#1976d2',
                            bgcolor: 'rgba(25, 118, 210, 0.1)'
                          }
                        }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewViolation(v);
                          }}
                        >
                          <VisibilityIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit record">
                        <IconButton 
                          size="small" 
                          sx={{ 
                            color: '#666666',
                            '&:hover': { 
                              color: '#f57c00',
                            bgcolor: 'rgba(245, 124, 0, 0.1)'
                            }
                          }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditViolation(v);
                          }}
                        >
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete record">
                        <IconButton 
                          size="small" 
                        sx={{ 
                          color: '#666666',
                          '&:hover': { 
                            color: '#d32f2f',
                            bgcolor: 'rgba(211, 47, 47, 0.1)'
                          }
                        }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, id: v.id });
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
            borderTop: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0'
          }}
        />
        </TableContainer>
      {/* Image Preview Modal */}
      <Dialog open={!!imagePreview} onClose={() => setImagePreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>Violation Evidence Image</DialogTitle>
        <DialogContent>
          {imagePreview && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, bgcolor: '#f5f6fa', borderRadius: 2 }}>
              <img
                src={imagePreview}
                alt="Violation Evidence"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 8,
                  boxShadow: '0 2px 16px #0002'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePreview(null)} variant="contained" color="primary">Close</Button>
        </DialogActions>
      </Dialog>
      {/* View Violation Modal (Detail document-style with print and attach/replace evidence) */}
      <Dialog open={!!viewViolation} onClose={() => setViewViolation(null)} maxWidth="md" fullWidth>
        <DialogTitle className="no-print" sx={{ fontWeight: 700, color: '#800000' }}>Student Violation Record</DialogTitle>
        <DialogContent dividers>
          {viewViolation && (
            <Box id="violation-document" sx={{ typography: 'body1' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>{viewViolation.studentName}</Typography>
              <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid item xs={6}><Typography><b>Student ID:</b> {viewViolation.studentId}</Typography></Grid>
                <Grid item xs={6}><Typography><b>Date:</b> {viewViolation.date}</Typography></Grid>
                <Grid item xs={6}><Typography><b>Time:</b> {viewViolation.time}</Typography></Grid>
                <Grid item xs={12}><Typography><b>Violation:</b> {viewViolation.violation}</Typography></Grid>
                <Grid item xs={6}><Typography><b>Classification:</b> {viewViolation.classification}</Typography></Grid>
                <Grid item xs={6}><Typography><b>Severity:</b> {viewViolation.severity}</Typography></Grid>
                {viewViolation.location && (<Grid item xs={12}><Typography><b>Location:</b> {viewViolation.location}</Typography></Grid>)}
                {viewViolation.reportedBy && (<Grid item xs={12}><Typography><b>Reported By:</b> {viewViolation.reportedBy}</Typography></Grid>)}
                {viewViolation.actionTaken && (<Grid item xs={12}><Typography><b>Action Taken:</b> {viewViolation.actionTaken}</Typography></Grid>)}
                {viewViolation.witnesses && (<Grid item xs={12}><Typography><b>Witnesses:</b> {viewViolation.witnesses}</Typography></Grid>)}
                {viewViolation.description && (<Grid item xs={12}><Typography><b>Description:</b> {viewViolation.description}</Typography></Grid>)}
              </Grid>
              {viewViolation.image && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <img src={viewViolation.image} alt="Evidence" style={{ maxWidth: '100%', borderRadius: 8 }} />
                </Box>
              )}
              <Box className="no-print" sx={{ mt: 2 }}>
                <Button variant="outlined" component="label" size="small">
                  {viewViolation?.image ? 'Replace Evidence Image' : 'Attach Evidence Image'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (!file.type.startsWith('image/')) {
                          setSnackbar({ open: true, message: 'Please select a valid image file', severity: 'error' });
                          return;
                        }
                        if (file.size > 500 * 1024) {
                          setSnackbar({ open: true, message: 'Image file size must be less than 500KB', severity: 'error' });
                          return;
                        }
                        try {
                          const storageRef = ref(storage, `violation_evidence/${viewViolation.id}_${Date.now()}_${file.name}`);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          await updateDoc(doc(db, 'violations', viewViolation.id), { image: url, updatedAt: new Date().toISOString() });
                          setViewViolation(v => ({ ...v, image: url }));
                          setSnackbar({ open: true, message: 'Evidence image attached successfully!', severity: 'success' });
                        } catch (err) {
                          setSnackbar({ open: true, message: 'Failed to upload evidence image', severity: 'error' });
                        }
                      }
                    }}
                  />
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="no-print">
          <Button onClick={() => window.print()} variant="outlined">Print</Button>
          <Button onClick={() => setViewViolation(null)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Violation Modal */}
      <Dialog open={!!editViolation} onClose={() => setEditViolation(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#800000' }}>Edit Violation</DialogTitle>
        <DialogContent dividers>
          {editViolation && (
            <Box component="form" onSubmit={e => { e.preventDefault(); handleEditSave(editViolation); }}>
              <TextField label="Student ID" value={editViolation.studentId} onChange={e => setEditViolation({ ...editViolation, studentId: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Violation" value={editViolation.violation} onChange={e => setEditViolation({ ...editViolation, violation: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Classification" value={editViolation.classification} onChange={e => setEditViolation({ ...editViolation, classification: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                <MenuItem value="Academic">Academic</MenuItem>
                <MenuItem value="Behavioral">Behavioral</MenuItem>
                <MenuItem value="Policy/Rules">Policy/Rules</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
              <TextField label="Severity" value={editViolation.severity} onChange={e => setEditViolation({ ...editViolation, severity: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
              <TextField label="Status" value={editViolation.status} onChange={e => setEditViolation({ ...editViolation, status: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Solved">Solved</MenuItem>
              </TextField>
              <TextField label="Date" type="date" value={editViolation.date} onChange={e => setEditViolation({ ...editViolation, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Time" type="time" value={editViolation.time} onChange={e => setEditViolation({ ...editViolation, time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Location" value={editViolation.location} onChange={e => setEditViolation({ ...editViolation, location: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Reported By" value={editViolation.reportedBy} onChange={e => setEditViolation({ ...editViolation, reportedBy: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Action Taken" value={editViolation.actionTaken} onChange={e => setEditViolation({ ...editViolation, actionTaken: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Witnesses" value={editViolation.witnesses} onChange={e => setEditViolation({ ...editViolation, witnesses: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Description" value={editViolation.description} onChange={e => setEditViolation({ ...editViolation, description: e.target.value })} fullWidth multiline minRows={2} sx={{ mb: 1 }} />
              <Box sx={{ mb: 2 }}>
                <Button variant="contained" component="label" sx={{ mt: 1 }}>
                  Change Evidence Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (!file.type.startsWith('image/')) {
                          setSnackbar({ open: true, message: 'Please select a valid image file', severity: 'error' });
                          return;
                        }
                        if (file.size > 200 * 1024) {
                          setSnackbar({ open: true, message: 'Image file size must be less than 200KB', severity: 'error' });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditViolation(ev => ({ ...ev, image: reader.result }));
                          setSnackbar({ open: true, message: 'Image loaded as base64!', severity: 'success' });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </Button>
                {editViolation.image && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={editViolation.image} sx={{ width: 80, height: 80 }} variant="rounded" />
                  </Box>
                )}
              </Box>
              <DialogActions>
                <Button onClick={() => setEditViolation(null)} color="secondary">Cancel</Button>
                <Button type="submit" variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>Delete Violation?</DialogTitle>
        <DialogContent>Are you sure you want to delete this violation? This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleteConfirm.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Meeting Modal */}
      <Dialog open={openMeetingModal} onClose={() => setOpenMeetingModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Meeting</DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleMeetingSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={students}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  value={selectedMeetingStudent}
                  onChange={(event, newValue) => {
                    setSelectedMeetingStudent(newValue);
                    setMeetingForm(prev => ({
                      ...prev,
                      studentName: newValue ? `${newValue.firstName} ${newValue.lastName}` : '',
                      studentId: newValue ? newValue.id : ''
                    }));
                    // Calculate meeting statistics for the selected student
                    calculateMeetingStats(newValue ? newValue.id : null);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Student Name"
                      required
                      sx={{ mb: 2 }}
                      placeholder="Start typing student name..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      {option.firstName} {option.lastName} ({option.id})
                    </Box>
                  )}
                  filterOptions={(options, { inputValue }) => {
                    if (!inputValue || inputValue.length < 1) {
                      return []; // Don't show any options when not typing
                    }
                    const filtered = options.filter(option => {
                      const fullName = `${option.firstName} ${option.lastName}`.toLowerCase();
                      const studentId = option.id.toLowerCase();
                      const searchTerm = inputValue.toLowerCase();
                      return fullName.includes(searchTerm) || studentId.includes(searchTerm);
                    });
                    return filtered.slice(0, 4); // Limit to 4 results
                  }}
                  noOptionsText="No students found"
                  isOptionEqualToValue={(option, value) => option.id === value?.id}
                  openOnFocus={false}
                  disablePortal={false}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Student ID"
                  name="studentId"
                  value={meetingForm.studentId}
                  onChange={handleMeetingFormChange}
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  placeholder="Auto-filled when student is selected"
                  disabled
                />
              </Grid>
              
              {/* Meeting Statistics Table */}
              {selectedMeetingStudent && (
                <Grid item xs={12}>
                  {console.log('🎯 Rendering statistics table for:', selectedMeetingStudent)}
                  {console.log('📊 Current meeting stats:', meetingStats)}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '3px solid #ff0000' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#800000', fontWeight: 600 }}>
                      🎯 MEETING STATISTICS FOR {selectedMeetingStudent.firstName} {selectedMeetingStudent.lastName} 🎯
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#ffffff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                          <Typography variant="h4" sx={{ color: '#800000', fontWeight: 'bold' }}>
                            {meetingStats.total}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Meetings
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#fff3cd', borderRadius: 1, border: '1px solid #ffeaa7' }}>
                          <Typography variant="h4" sx={{ color: '#856404', fontWeight: 'bold' }}>
                            {meetingStats.pending}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#856404' }}>
                            Pending
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#cce5ff', borderRadius: 1, border: '1px solid #74c0fc' }}>
                          <Typography variant="h4" sx={{ color: '#004085', fontWeight: 'bold' }}>
                            {meetingStats.scheduled}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#004085' }}>
                            Scheduled
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#d4edda', borderRadius: 1, border: '1px solid #c3e6cb' }}>
                          <Typography variant="h4" sx={{ color: '#155724', fontWeight: 'bold' }}>
                            {meetingStats.completed}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#155724' }}>
                            Completed
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <TextField label="Location" name="location" value={meetingForm.location} onChange={handleMeetingFormChange} fullWidth required sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Purpose" name="purpose" value={meetingForm.purpose} onChange={handleMeetingFormChange} fullWidth required sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Date" name="date" type="date" value={meetingForm.date} onChange={handleMeetingFormChange} InputLabelProps={{ shrink: true }} fullWidth required sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Time" name="time" type="time" value={meetingForm.time} onChange={handleMeetingFormChange} InputLabelProps={{ shrink: true }} fullWidth required sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Description" name="description" value={meetingForm.description} onChange={handleMeetingFormChange} fullWidth multiline minRows={2} sx={{ mb: 2 }} />
              </Grid>
            </Grid>
            <DialogActions>
              <Button onClick={() => setOpenMeetingModal(false)} color="secondary">Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={meetingSubmitting}>
                {meetingSubmitting ? 'Submitting...' : 'Create Meeting'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
      {/* Meetings Modal (CRUD + Print) */}
      <Dialog open={openMeetingsModal} onClose={() => { setOpenMeetingsModal(false); setPrintMode(false); }} maxWidth="md" fullWidth>
        <DialogTitle>Meetings
          <Button onClick={() => setPrintMode(true)} color="primary" variant="outlined" size="small" sx={{ float: 'right', ml: 2 }}>Print</Button>
        </DialogTitle>
        <DialogContent dividers>
          {printMode ? (
            <Box id="print-meetings">
              <Typography variant="h6" align="center" gutterBottom>Meetings List</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meetings.map((m, idx) => (
                    <TableRow key={m.id || idx}>
                      <TableCell>{m.date}</TableCell>
                      <TableCell>{m.time}</TableCell>
                      <TableCell>{m.studentName}</TableCell>
                      <TableCell>{m.studentId}</TableCell>
                      <TableCell>{m.location}</TableCell>
                      <TableCell>{m.purpose}</TableCell>
                      <TableCell>{m.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {meetings.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>No meetings found.</TableCell></TableRow>
                ) : meetings.map((m, idx) => (
                  <TableRow key={m.id || idx}>
                    <TableCell>{m.date}</TableCell>
                    <TableCell>{m.time}</TableCell>
                    <TableCell>{m.studentName}</TableCell>
                    <TableCell>{m.studentId}</TableCell>
                    <TableCell>{m.location}</TableCell>
                    <TableCell>{m.purpose}</TableCell>
                    <TableCell>{m.description}</TableCell>
                    <TableCell>
                      <Button size="small" color="info" variant="outlined" sx={{ mr: 1 }} onClick={() => setEditMeeting(m)}>Edit</Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteMeeting(m.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenMeetingsModal(false); setPrintMode(false); }} color="secondary">Close</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Meeting Modal */}
      <Dialog open={!!editMeeting} onClose={() => setEditMeeting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Meeting</DialogTitle>
        <DialogContent dividers>
          {editMeeting && (
            <Box component="form" onSubmit={e => { e.preventDefault(); handleEditMeetingSave(editMeeting); }}>
              <TextField label="Student Name" value={editMeeting.studentName} onChange={e => setEditMeeting({ ...editMeeting, studentName: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Student ID" value={editMeeting.studentId} onChange={e => setEditMeeting({ ...editMeeting, studentId: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Location" value={editMeeting.location} onChange={e => setEditMeeting({ ...editMeeting, location: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Purpose" value={editMeeting.purpose} onChange={e => setEditMeeting({ ...editMeeting, purpose: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Date" type="date" value={editMeeting.date} onChange={e => setEditMeeting({ ...editMeeting, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Time" type="time" value={editMeeting.time} onChange={e => setEditMeeting({ ...editMeeting, time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Description" value={editMeeting.description} onChange={e => setEditMeeting({ ...editMeeting, description: e.target.value })} fullWidth multiline minRows={2} sx={{ mb: 1 }} />
              <DialogActions>
                <Button onClick={() => setEditMeeting(null)} color="secondary">Cancel</Button>
                <Button type="submit" variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      {/* Print meetings when printMode is true */}
      {printMode && (
        <Box sx={{ display: 'none' }}>
          <iframe
            title="print-meetings"
            srcDoc={`<html><head><title>Meetings List</title></head><body>${document.getElementById('print-meetings')?.outerHTML || ''}<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script></body></html>`}
            style={{ width: 0, height: 0, border: 0 }}
            onLoad={() => setTimeout(() => setPrintMode(false), 1000)}
          />
        </Box>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Snackbar open={meetingSnackbar.open} autoHideDuration={4000} onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })}>
        <Alert onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })} severity={meetingSnackbar.severity} sx={{ width: '100%' }}>
          {meetingSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 