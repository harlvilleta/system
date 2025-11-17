# Complete Entity Relationship Diagram (ERD) - School Management System

## Entity Relationship Model

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          Complete Entity Relationship Model                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│      USER       │
├─────────────────┤
│ uid (PK)        │
│ email           │
│ fullName        │
│ role            │ (Student/Teacher/Admin/Staff)
│ phone           │
│ address         │
│ profilePic      │
│ createdAt       │
│ updatedAt       │
│ studentInfo     │ (embedded object for Students)
│ teacherInfo     │ (embedded object for Teachers)
│ adminInfo       │ (embedded object for Admins)
│ staffInfo       │ (embedded object for Staff)
└────────┬────────┘
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                             │
         │                                                             │
    ┌────▼─────┐                                              ┌───────▼──────┐
    │ STUDENTS │                                              │USER_PREFERENCES│
    ├──────────┤                                              ├───────────────┤
    │ id (PK)  │                                              │ uid (PK/FK)   │
    │ studentId│                                              │ email         │
    │ firstName│                                              │ theme         │
    │ lastName │                                              │ language      │
    │ course   │                                              │ notifications │
    │ year     │                                              │ createdAt     │
    │ section  │                                              └───────────────┘
    │ sex      │
    │ contact  │
    │ teacherId│ (FK to USER.uid)
    │ isRegistered│
    │ registeredEmail│
    └──────────┘
         │
         │
    ┌────▼──────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
    │  │  VIOLATIONS  │    │   MEETINGS   │    │VIOLATION_REVIEWS│            │
    │  ├──────────────┤    ├──────────────┤    ├──────────────┤              │
    │  │ id (PK)      │    │ id (PK)      │    │ id (PK)      │              │
    │  │ studentId(FK)│◄───┤ studentId(FK)│    │ violationId(FK)│            │
    │  │ studentName  │    │ studentName  │    │ reviewedBy(FK)│             │
    │  │ reportedBy(FK)│   │ teacherId(FK)│   │ reviewNotes  │             │
    │  │ violation    │    │ location     │    │ status       │             │
    │  │ classification│   │ purpose      │    │ createdAt    │             │
    │  │ severity     │    │ date         │    └──────────────┘             │
    │  │ penalty      │    │ time         │                                 │
    │  │ date         │    │ description  │                                 │
    │  │ time         │    │ type         │                                 │
    │  │ location     │    │ status       │                                 │
    │  │ description  │    │ createdAt    │                                 │
    │  │ witnesses    │    └──────────────┘                                 │
    │  │ actionTaken  │                                                      │
    │  │ status       │                                                      │
    │  │ image        │                                                      │
    │  │ createdAt    │                                                      │
    │  │ timestamp    │                                                      │
    │  └──────────────┘                                                      │
    │                                                                          │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            │
    │  │NOTIFICATIONS │    │ ANNOUNCEMENTS│    │RECYCLE_BIN_   │            │
    │  ├──────────────┤    ├──────────────┤    │ANNOUNCEMENTS │            │
    │  │ id (PK)      │    │ id (PK)      │    ├──────────────┤            │
    │  │ userId (FK)  │◄───┤ createdBy(FK)│    │ id (PK)      │            │
    │  │ title        │    │ title        │    │ (same as     │            │
    │  │ message      │    │ description  │    │ announcements)│            │
    │  │ type         │    │ createdAt    │    │ deletedAt    │            │
    │  │ read         │    │ updatedAt    │    └──────────────┘            │
    │  │ senderId(FK) │    └──────────────┘                               │
    │  │ senderName   │                                                    │
    │  │ senderRole   │                                                    │
    │  │ recipientRole│                                                    │
    │  │ createdAt    │                                                    │
    │  └──────────────┘                                                    │
    │                                                                       │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
    │  │  LOST_ITEMS  │    │ FOUND_ITEMS  │    │PENDING_LOST_  │          │
    │  ├──────────────┤    ├──────────────┤    │REPORTS        │          │
    │  │ id (PK)      │    │ id (PK)      │    ├──────────────┤          │
    │  │ userId (FK)  │◄───┤ userId (FK)  │◄───┤ id (PK)      │          │
    │  │ itemName     │    │ itemName     │    │ userId (FK)  │          │
    │  │ description  │    │ description  │    │ itemName     │          │
    │  │ location     │    │ location     │    │ description  │          │
    │  │ status       │    │ status       │    │ createdAt    │          │
    │  │ reportedDate │    │ foundDate    │    └──────────────┘          │
    │  │ createdAt    │    │ createdAt    │                             │
    │  └──────────────┘    └──────────────┘                             │
    │                                                                     │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
    │  │PENDING_FOUND │    │  ACTIVITIES  │    │ACTIVITY_     │        │
    │  │REPORTS       │    │              │    │BOOKINGS      │        │
    │  ├──────────────┤    ├──────────────┤    ├──────────────┤        │
    │  │ id (PK)      │    │ id (PK)      │    │ id (PK)      │        │
    │  │ userId (FK)  │    │ name         │    │ teacherId(FK)│        │
    │  │ itemName     │    │ description  │    │ teacherName  │        │
    │  │ description  │    │ category     │    │ department   │        │
    │  │ createdAt    │    │ date         │    │ activity     │        │
    │  └──────────────┘    │ createdBy(FK)│    │ resource     │        │
    │                      │ createdAt    │    │ date         │        │
    │                      └──────────────┘    │ startTime    │        │
    │                                           │ endTime      │        │
    │                      ┌──────────────┐    │ course       │        │
    │                      │    EVENTS    │    │ year         │        │
    │                      ├──────────────┤    │ section      │        │
    │                      │ id (PK)      │    │ notes        │        │
    │                      │ name         │    │ status       │        │
    │                      │ description  │    │ createdAt    │        │
    │                      │ date         │    └──────────────┘        │
    │                      │ createdBy(FK)│                            │
    │                      │ createdAt    │                            │
    │                      └──────────────┘                            │
    │                                                                   │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
    │  │RECEIPT_      │    │ ACTIVITY_LOG │    │TEACHER_      │      │
    │  │SUBMISSIONS   │    │              │    │REQUESTS      │      │
    │  ├──────────────┤    ├──────────────┤    ├──────────────┤      │
    │  │ id (PK)      │    │ id (PK)      │    │ id (PK)      │      │
    │  │ userId (FK)  │◄───┤ user (FK)    │    │ userId (FK)  │      │
    │  │ userEmail    │    │ message      │    │ email        │      │
    │  │ userName     │    │ type         │    │ fullName     │      │
    │  │ userRole     │    │ timestamp    │    │ phone        │      │
    │  │ receiptType  │    └──────────────┘    │ address      │      │
    │  │ amount       │                        │ role         │      │
    │  │ description  │                        │ status       │      │
    │  │ receiptImage │                        │ createdAt    │      │
    │  │ status       │                        └──────────────┘      │
    │  │ submittedAt  │                                                │
    │  │ updatedAt    │                                                │
    │  │ adminNotes   │                                                │
    │  │ reviewedBy   │                                                │
    │  │ reviewedAt   │                                                │
    │  │ studentInfo  │                                                │
    │  └──────────────┘                                                │
    │                                                                   │
    └───────────────────────────────────────────────────────────────────┘
```

## Data Dictionary

### USER TABLE (users collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| uid | string | 50 | Primary key (Firebase Auth UID) | "abc123def456" |
| email | string | 255 | User's email address | "john@email.com" |
| fullName | string | 200 | User's full name | "John Doe" |
| role | string | 20 | User role (Student/Teacher/Admin/Staff) | "Student" |
| phone | string | 20 | Phone number | "+1234567890" |
| address | string | 500 | User's address | "Cebu City, Philippines" |
| profilePic | string | - | Profile picture URL | "https://..." |
| createdAt | timestamp | - | Account creation date | "2024-01-15T10:30:00Z" |
| updatedAt | timestamp | - | Last update date | "2024-01-20T10:30:00Z" |
| studentInfo | object | - | Student-specific data (if role=Student) | {studentId, course, year, section} |
| teacherInfo | object | - | Teacher-specific data (if role=Teacher) | {subjects, department, hireDate} |
| adminInfo | object | - | Admin-specific data (if role=Admin) | {permissions, adminLevel} |
| staffInfo | object | - | Staff-specific data (if role=Staff) | {department, hireDate, status} |

### STUDENTS TABLE (students collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Document ID | "SCC-22-00800957" |
| studentId | string | 50 | Student identification number | "SCC-22-00800957" |
| firstName | string | 100 | Student's first name | "John" |
| lastName | string | 100 | Student's last name | "Doe" |
| course | string | 50 | Academic course/program | "BSIT" |
| year | string | 20 | Academic year level | "2nd Year" |
| section | string | 10 | Class section | "A" |
| sex | string | 10 | Student gender | "Male" |
| contact | string | 20 | Contact number | "09123456789" |
| teacherId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| isRegistered | boolean | - | Whether student has registered | false |
| registeredEmail | string | 255 | Email used for registration | "john@email.com" |
| registeredAt | timestamp | - | Registration timestamp | "2024-01-15T10:30:00Z" |

### VIOLATIONS TABLE (violations collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "V001" |
| studentId | string | 50 | Foreign key to STUDENTS.studentId | "SCC-22-00800957" |
| studentName | string | 200 | Student's full name | "John Doe" |
| reportedBy | string | 50 | Foreign key to USER.uid | "abc123def456" |
| violation | string | 100 | Type of violation | "Academic Dishonesty" |
| classification | string | 50 | Violation classification | "Academic" |
| severity | string | 20 | Severity level (Level 1-4) | "Level 2" |
| penalty | string | 50 | Penalty assigned | "Suspension" |
| date | string | - | Date of violation | "2024-01-15" |
| time | string | - | Time of violation | "14:30" |
| location | string | 200 | Location of violation | "Room 101" |
| description | text | 2000 | Detailed description | "Caught cheating on exam" |
| witnesses | string | 500 | Witness information | "Jane Smith" |
| actionTaken | string | 500 | Action taken | "Suspended for 3 days" |
| status | string | 20 | Current status | "Open" |
| image | string | - | Evidence image URL | "https://..." |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |
| timestamp | timestamp | - | Alternative timestamp field | "2024-01-15T10:30:00Z" |

### MEETINGS TABLE (meetings collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "M001" |
| studentId | string | 50 | Foreign key to STUDENTS.studentId | "SCC-22-00800957" |
| studentName | string | 200 | Student's full name | "John Doe" |
| teacherId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| location | string | 200 | Meeting location | "Room 101" |
| purpose | string | 200 | Purpose of meeting | "Violation Discussion" |
| date | string | - | Meeting date | "2024-01-20" |
| time | string | - | Meeting time | "14:30" |
| description | text | 1000 | Meeting description | "Discuss violation consequences" |
| type | string | 50 | Meeting type | "violation_meeting" |
| status | string | 20 | Meeting status | "scheduled" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### NOTIFICATIONS TABLE (notifications collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "N001" |
| userId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| title | string | 200 | Notification title | "Violation Report" |
| message | text | 1000 | Notification message | "You have a new violation report" |
| type | string | 50 | Notification type | "violation" |
| read | boolean | - | Whether notification is read | false |
| senderId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| senderName | string | 200 | Sender's name | "Jane Smith" |
| senderRole | string | 20 | Sender's role | "Teacher" |
| recipientRole | string | 20 | Recipient's role | "Student" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### ANNOUNCEMENTS TABLE (announcements collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "A001" |
| title | string | 200 | Announcement title | "School Closure" |
| description | text | 5000 | Announcement content | "School will be closed tomorrow" |
| createdBy | string | 50 | Foreign key to USER.uid | "abc123def456" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |
| updatedAt | timestamp | - | Last update timestamp | "2024-01-15T10:30:00Z" |

### RECYCLE_BIN_ANNOUNCEMENTS TABLE (recycle_bin_announcements collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "A001" |
| (all fields from announcements) | - | - | Same as announcements table | - |
| deletedAt | timestamp | - | Deletion timestamp | "2024-01-20T10:30:00Z" |

### LOST_ITEMS TABLE (lost_items collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "LF001" |
| userId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| itemName | string | 200 | Name of lost item | "Black Backpack" |
| description | text | 1000 | Item description | "Nike backpack with laptop" |
| location | string | 200 | Location where item was lost | "Library" |
| status | string | 20 | Current status | "lost" |
| reportedDate | string | - | Date item was reported | "2024-01-15" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### FOUND_ITEMS TABLE (found_items collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "FF001" |
| userId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| itemName | string | 200 | Name of found item | "Black Backpack" |
| description | text | 1000 | Item description | "Nike backpack with laptop" |
| location | string | 200 | Location where item was found | "Library" |
| status | string | 20 | Current status | "found" |
| foundDate | string | - | Date item was found | "2024-01-15" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### PENDING_LOST_REPORTS TABLE (pending_lost_reports collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "PLR001" |
| userId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| itemName | string | 200 | Name of lost item | "Black Backpack" |
| description | text | 1000 | Item description | "Nike backpack with laptop" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### PENDING_FOUND_REPORTS TABLE (pending_found_reports collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "PFR001" |
| userId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| itemName | string | 200 | Name of found item | "Black Backpack" |
| description | text | 1000 | Item description | "Nike backpack with laptop" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### ACTIVITIES TABLE (activities collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "ACT001" |
| name | string | 200 | Activity name | "School Assembly" |
| description | text | 2000 | Activity description | "Monthly school assembly" |
| category | string | 50 | Activity category | "Seminar" |
| date | string | - | Activity date | "2024-01-20" |
| createdBy | string | 50 | Foreign key to USER.uid | "abc123def456" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### EVENTS TABLE (events collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "E001" |
| name | string | 200 | Event name | "Annual Sports Day" |
| description | text | 2000 | Event description | "School-wide sports competition" |
| date | string | - | Event date | "2024-02-15" |
| createdBy | string | 50 | Foreign key to USER.uid | "abc123def456" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### ACTIVITY_BOOKINGS TABLE (activity_bookings collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "AB001" |
| teacherId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| teacherName | string | 200 | Teacher's name | "Jane Smith" |
| teacherEmail | string | 255 | Teacher's email | "jane@school.com" |
| department | string | 100 | Department | "Computer Science" |
| activity | string | 200 | Activity name | "Workshop" |
| resource | string | 200 | Resource/venue | "Computer Lab 1" |
| date | string | - | Booking date | "2024-01-20" |
| startTime | string | - | Start time | "09:00" |
| endTime | string | - | End time | "11:00" |
| time | string | - | Time range | "09:00 - 11:00" |
| notes | text | 1000 | Additional notes | "Need projector" |
| course | string | 50 | Course | "BSIT" |
| year | string | 20 | Year level | "2nd Year" |
| section | string | 10 | Section | "A" |
| status | string | 20 | Booking status | "pending" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |
| updatedAt | timestamp | - | Last update timestamp | "2024-01-15T10:30:00Z" |

### RECEIPT_SUBMISSIONS TABLE (receipt_submissions collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "RS001" |
| userId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| userEmail | string | 255 | User's email | "john@email.com" |
| userName | string | 200 | User's name | "John Doe" |
| userRole | string | 20 | User's role | "Student" |
| receiptType | string | 50 | Type of receipt | "Tuition" |
| amount | decimal | 10,2 | Receipt amount | 5000.00 |
| description | text | 1000 | Description | "Tuition fee payment" |
| receiptImage | string | - | Receipt image (base64) | "data:image/..." |
| status | string | 20 | Submission status | "pending" |
| submittedAt | timestamp | - | Submission timestamp | "2024-01-15T10:30:00Z" |
| updatedAt | timestamp | - | Last update timestamp | "2024-01-15T10:30:00Z" |
| adminNotes | text | 1000 | Admin review notes | "Approved" |
| reviewedBy | string | 50 | Foreign key to USER.uid | "abc123def456" |
| reviewedAt | timestamp | - | Review timestamp | "2024-01-16T10:30:00Z" |
| studentInfo | object | - | Student information | {studentId, course, year, section} |

### ACTIVITY_LOG TABLE (activity_log collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "AL001" |
| user | string | 50 | Foreign key to USER.uid | "abc123def456" |
| message | text | 1000 | Activity message | "User logged in" |
| type | string | 50 | Activity type | "login" |
| timestamp | timestamp | - | Activity timestamp | "2024-01-15T10:30:00Z" |

### USER_PREFERENCES TABLE (user_preferences collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| uid | string | 50 | Primary key, foreign key to USER.uid | "abc123def456" |
| email | string | 255 | User's email address | "john@email.com" |
| theme | string | 20 | UI theme preference | "light" |
| language | string | 10 | Language preference | "en" |
| notifications | object | - | Notification preferences | {"email": true} |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### TEACHER_REQUESTS TABLE (teacher_requests collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "TR001" |
| userId | string | 50 | Foreign key to USER.uid | "abc123def456" |
| email | string | 255 | Teacher's email | "teacher@school.com" |
| fullName | string | 200 | Teacher's full name | "Jane Smith" |
| phone | string | 20 | Phone number | "+1234567890" |
| address | string | 500 | Address | "Cebu City" |
| role | string | 20 | Requested role | "Teacher" |
| status | string | 20 | Request status | "pending" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

### VIOLATION_REVIEWS TABLE (violation_reviews collection)
| Field Name | Data Type | Size | Description | Example |
|------------|-----------|------|-------------|---------|
| id | string | 50 | Primary key | "VR001" |
| violationId | string | 50 | Foreign key to VIOLATIONS.id | "V001" |
| reviewedBy | string | 50 | Foreign key to USER.uid | "abc123def456" |
| reviewNotes | text | 2000 | Review notes | "Violation confirmed" |
| status | string | 20 | Review status | "approved" |
| createdAt | timestamp | - | Creation timestamp | "2024-01-15T10:30:00Z" |

## Relationship Summary

1. **USER** is the central entity with relationships to:
   - STUDENTS (via teacherId)
   - VIOLATIONS (via reportedBy)
   - MEETINGS (via teacherId)
   - NOTIFICATIONS (via userId, senderId)
   - ANNOUNCEMENTS (via createdBy)
   - LOST_ITEMS, FOUND_ITEMS (via userId)
   - ACTIVITIES, EVENTS (via createdBy)
   - ACTIVITY_BOOKINGS (via teacherId)
   - RECEIPT_SUBMISSIONS (via userId, reviewedBy)
   - ACTIVITY_LOG (via user)
   - USER_PREFERENCES (via uid)
   - TEACHER_REQUESTS (via userId)
   - VIOLATION_REVIEWS (via reviewedBy)

2. **STUDENTS** has relationships to:
   - USER (via teacherId)
   - VIOLATIONS (via studentId)
   - MEETINGS (via studentId)

3. **VIOLATIONS** has relationships to:
   - STUDENTS (via studentId)
   - USER (via reportedBy)
   - MEETINGS (indirectly through studentId)
   - VIOLATION_REVIEWS (via violationId)

4. **MEETINGS** has relationships to:
   - STUDENTS (via studentId)
   - USER (via teacherId)

5. **ANNOUNCEMENTS** has a soft-delete relationship with RECYCLE_BIN_ANNOUNCEMENTS

## Notes

- The system uses Firebase Firestore as the database
- Some entities use embedded objects (studentInfo, teacherInfo, etc.) within the USER collection
- The STUDENTS collection contains both registered and unregistered students
- Soft deletes are implemented for announcements using RECYCLE_BIN_ANNOUNCEMENTS
- Images are stored as base64 strings in some collections (receipt_submissions)
- All timestamps are stored as ISO 8601 strings or Firestore timestamps


