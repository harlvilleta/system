// Role definitions and permission system
export const ROLES = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  TEACHER: 'Teacher',
  STUDENT: 'Student'
};

// Permission matrix for each role
export const ROLE_PERMISSIONS = {
  Admin: {
    // System Management
    systemSettings: true,
    userManagement: true,
    securityLogs: true,
    maintenance: true,
    analytics: true,
    auditLogs: true,
    systemMonitoring: true,
    dataBackup: true,
    // Day-to-day operations (read-only for monitoring)
    viewStudents: true,
    viewViolations: true,
    viewActivities: true,
    viewAnnouncements: true,
    viewLostFound: true,
    // Cannot perform operations
    createViolations: false,
    createAnnouncements: false,
    manageStudents: false,
    manageActivities: false,
    manageLostFound: false,
    reviewReceipts: false,
    manageTeacherRequests: false
  },
  Staff: {
    // Day-to-day operations
    manageStudents: true,
    createViolations: true,
    reviewViolations: true,
    createAnnouncements: true,
    manageActivities: true,
    manageLostFound: true,
    reviewReceipts: true,
    manageTeacherRequests: true,
    viewStudents: true,
    viewViolations: true,
    viewActivities: true,
    viewAnnouncements: true,
    viewLostFound: true,
    // Cannot access system management
    systemSettings: false,
    userManagement: false,
    securityLogs: false,
    maintenance: false,
    analytics: false,
    auditLogs: false,
    systemMonitoring: false,
    dataBackup: false
  },
  Teacher: {
    viewStudents: true,
    reportViolations: true,
    scheduleActivities: true,
    viewAnnouncements: true,
    viewLostFound: true,
    manageStudents: false,
    createAnnouncements: false,
    systemSettings: false
  },
  Student: {
    viewProfile: true,
    viewViolations: true,
    viewAnnouncements: true,
    viewLostFound: true,
    submitReceipts: true,
    manageStudents: false,
    createViolations: false,
    systemSettings: false
  }
};

// Check if user has specific permission
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  return ROLE_PERMISSIONS[userRole]?.[permission] || false;
};

// Check if user can access a route
export const canAccessRoute = (userRole, route) => {
  const routePermissions = {
    '/admin-dashboard': ['Admin'],
    '/admin-users': ['Admin'],
    '/admin-security': ['Admin'],
    '/admin-maintenance': ['Admin'],
    '/admin-settings': ['Admin'],
    '/admin-analytics': ['Admin'],
    '/admin-audit': ['Admin'],
    '/students': ['Admin', 'Staff'],
    '/violation-record': ['Admin', 'Staff'],
    '/announcements': ['Admin', 'Staff', 'Teacher'],
    '/activity': ['Admin', 'Staff', 'Teacher'],
    '/lost-found': ['Admin', 'Staff', 'Teacher', 'Student'],
    '/receipt-review': ['Admin', 'Staff']
  };
  
  const allowedRoles = routePermissions[route] || [];
  return allowedRoles.includes(userRole);
};

// Get role display name
export const getRoleDisplayName = (role) => {
  const displayNames = {
    'Admin': 'System Administrator',
    'Staff': 'Staff Member',
    'Teacher': 'Teacher',
    'Student': 'Student'
  };
  return displayNames[role] || role;
};

// Check if user can perform day-to-day operations (Staff, not Admin)
export const canPerformOperations = (userRole) => {
  return userRole === 'Staff' || userRole === 'Teacher';
};

// Check if user is Admin (system management only)
export const isAdmin = (userRole) => {
  return userRole === 'Admin';
};

// Check if user is Staff (day-to-day operations)
export const isStaff = (userRole) => {
  return userRole === 'Staff';
};

// Check if user can manage students (Staff only, Admin can only view)
export const canManageStudents = (userRole) => {
  return userRole === 'Staff';
};

// Check if user can create announcements (Staff only, Admin can only view)
export const canCreateAnnouncements = (userRole) => {
  return userRole === 'Staff';
};

