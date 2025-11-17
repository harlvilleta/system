# Use Case Diagram - School Management System

## Use Case Diagram Model

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│                          School Management System                                   │
│                                                                                     │
│    ┌──────────┐                                                                    │
│    │          │                                                                    │
│    │ STUDENT  │                                                                    │
│    │          │                                                                    │
│    └────┬─────┘                                                                    │
│         │                                                                          │
│         │                                                                          │
│    ┌────▼────────────────────────────────────────────────────┐                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │   Register   │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │    Login     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Announcement  │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Report Lost   │                                       │                    │
│    │  │& Found       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View Lost     │                                       │                    │
│    │  │& Found       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Violation     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Activities    │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Meetings      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Submit        │                                       │                    │
│    │  │Receipt       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │   Logout     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    └──────────────────────────────────────────────────────────┘                    │
│                                                                                     │
│                                                                                     │
│    ┌──────────┐                                                                    │
│    │          │                                                                    │
│    │  STAFF   │                                                                    │
│    │          │                                                                    │
│    └────┬─────┘                                                                    │
│         │                                                                          │
│         │                                                                          │
│    ┌────▼────────────────────────────────────────────────────┐                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │   Register   │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │    Login     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Announcement  │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Post          │                                       │                    │
│    │  │Announcements │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Report Lost   │                                       │                    │
│    │  │& Found       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View Lost     │                                       │                    │
│    │  │& Found       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Violation     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Record        │                                       │                    │
│    │  │Violation     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Review        │                                       │                    │
│    │  │Violation     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Activities    │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Manage        │                                       │                    │
│    │  │Activity      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Schedule      │                                       │                    │
│    │  │Activity      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Meetings      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Schedule      │                                       │                    │
│    │  │Meeting       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Manage        │                                       │                    │
│    │  │Students      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Review        │                                       │                    │
│    │  │Receipt       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Generate      │                                       │                    │
│    │  │Report        │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Manage        │                                       │                    │
│    │  │Teacher       │                                       │                    │
│    │  │Request       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │   Logout     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    └──────────────────────────────────────────────────────────┘                    │
│                                                                                     │
│                                                                                     │
│    ┌──────────┐                                                                    │
│    │          │                                                                    │
│    │  ADMIN   │                                                                    │
│    │          │                                                                    │
│    └────┬─────┘                                                                    │
│         │                                                                          │
│         │                                                                          │
│    ┌────▼────────────────────────────────────────────────────┐                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │    Login     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Manage        │                                       │                    │
│    │  │User          │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Manage        │                                       │                    │
│    │  │Staff         │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Assign        │                                       │                    │
│    │  │Role          │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Security      │                                       │                    │
│    │  │Logs          │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Login         │                                       │                    │
│    │  │History        │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │System        │                                       │                    │
│    │  │Maintenance   │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │System        │                                       │                    │
│    │  │Settings      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Analytics     │                                       │                    │
│    │  │& Reports      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Audit Logs    │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │System        │                                       │                    │
│    │  │Monitoring    │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View Data     │                                       │                    │
│    │  │(Read-Only)   │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Generate      │                                       │                    │
│    │  │Report        │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │   Logout     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    └──────────────────────────────────────────────────────────┘                    │
│                                                                                     │
│                                                                                     │
│    ┌──────────┐                                                                    │
│    │          │                                                                    │
│    │ TEACHER  │                                                                    │
│    │          │                                                                    │
│    └────┬─────┘                                                                    │
│         │                                                                          │
│         │                                                                          │
│    ┌────▼────────────────────────────────────────────────────┐                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │    Login     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Announcement  │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View Lost     │                                       │                    │
│    │  │& Found       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Violation     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Report        │                                       │                    │
│    │  │Violation     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Activities    │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Schedule      │                                       │                    │
│    │  │Activity      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Meetings      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │Schedule      │                                       │                    │
│    │  │Meeting       │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │View          │                                       │                    │
│    │  │Students      │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    │  ┌──────────────┐                                       │                    │
│    │  │   Logout     │                                       │                    │
│    │  └──────────────┘                                       │                    │
│    │                                                          │                    │
│    └──────────────────────────────────────────────────────────┘                    │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Use Case Summary by Actor

### STUDENT Use Cases
1. **Register** - Register as a new student user
2. **Login** - Authenticate and access the system
3. **View Announcement** - View system announcements
4. **Report Lost & Found** - Report lost items
5. **View Lost & Found** - View lost and found items
6. **View Violation** - View personal violation records
7. **View Activities** - View school activities
8. **View Meetings** - View scheduled meetings
9. **Submit Receipt** - Submit payment receipts
10. **Logout** - End session and log out

### STAFF Use Cases
1. **Register** - Register as a new staff user
2. **Login** - Authenticate and access the system
3. **View Announcement** - View system announcements
4. **Post Announcements** - Create and post announcements
5. **Report Lost & Found** - Report lost items
6. **View Lost & Found** - View and manage lost and found items
7. **View Violation** - View violation records
8. **Record Violation** - Record new student violations
9. **Review Violation** - Review and process violations
10. **View Activities** - View school activities
11. **Manage Activity** - Create, edit, and delete activities
12. **Schedule Activity** - Schedule school activities
13. **View Meetings** - View scheduled meetings
14. **Schedule Meeting** - Schedule meetings for violations
15. **Manage Students** - Create, update, and manage student records
16. **Review Receipt** - Review and approve/reject receipt submissions
17. **Generate Report** - Generate various system reports
18. **Manage Teacher Request** - Review and manage teacher registration requests
19. **Logout** - End session and log out

### ADMIN Use Cases
1. **Login** - Authenticate and access the system
2. **Manage User** - Manage all system users
3. **Manage Staff** - Manage staff members
4. **Assign Role** - Assign roles to users
5. **View Security Logs** - View system security logs
6. **View Login History** - View user login history
7. **System Maintenance** - Perform system maintenance operations
8. **System Settings** - Configure system-wide settings
9. **Analytics & Reports** - View system analytics and reports
10. **View Audit Logs** - View system audit logs
11. **System Monitoring** - Monitor system performance
12. **View Data (Read-Only)** - View all system data in read-only mode
13. **Generate Report** - Generate system reports
14. **Logout** - End session and log out

### TEACHER Use Cases
1. **Login** - Authenticate and access the system
2. **View Announcement** - View system announcements
3. **View Lost & Found** - View lost and found items
4. **View Violation** - View violation records
5. **Report Violation** - Report student violations
6. **View Activities** - View school activities
7. **Schedule Activity** - Request activity bookings
8. **View Meetings** - View scheduled meetings
9. **Schedule Meeting** - Schedule meetings with students
10. **View Students** - View assigned students
11. **Logout** - End session and log out

## Actor Descriptions

### STUDENT
- **Description**: Student user with access to personal information and basic features
- **Primary Functions**: View personal records, submit receipts, report lost items, view announcements and activities

### STAFF
- **Description**: Staff member responsible for day-to-day operations management
- **Primary Functions**: Manage students, handle violations, review receipts, create announcements, schedule activities and meetings

### ADMIN
- **Description**: System administrator with full system management access
- **Primary Functions**: User management, system configuration, security monitoring, system maintenance, analytics

### TEACHER
- **Description**: Teacher with access to student-related features
- **Primary Functions**: View students, report violations, schedule activities and meetings, view announcements

## Notes

1. **Registration**: Only Students and Staff can register. Admin accounts are created by system, and Teachers must request registration through Staff.

2. **Role-Based Access**: Each actor has specific permissions based on their role in the system.

3. **Teacher Approval**: Teachers must be approved by Staff before they can access the system.

4. **Read-Only Admin**: Admin has read-only access to day-to-day operations data for monitoring purposes.

5. **Staff Operations**: Staff performs all operational management tasks including student management, violation handling, and receipt review.
