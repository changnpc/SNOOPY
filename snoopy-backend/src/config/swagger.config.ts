import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SNOOPY API',
      version: '2.0.0',
      description: `
## System for National Organization and Optimized Practice of Youth (SNOOPY)

API สำหรับจัดการนักกีฬาบริดจ์เยาวชนทีมชาติ

### Authentication
ทุก endpoint (ยกเว้น \`/auth/google\` และ \`/health\`) ต้องส่ง JWT Token ใน Header:
\`\`\`
Authorization: Bearer <token>
\`\`\`

### Roles
| Role | สิทธิ์ |
|---|---|
| **Super Admin** | เข้าถึงทุก endpoint |
| **Coach** | เข้าถึงข้อมูลทีมตัวเอง |
| **Player** | ดูข้อมูลตัวเอง + แจ้งลา |
      `,
      contact: { name: 'SNOOPY Dev Team', email: 'dev@snoopy.th' },
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Development' },
      { url: 'https://yourdomain.com/api', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token จาก POST /auth/google',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { description: 'ข้อมูลที่ต้องการ' },
            message: { type: 'string', example: 'สำเร็จ' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code:    { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'ข้อมูลไม่ถูกต้อง' },
              },
            },
          },
        },
        Team: {
          type: 'object',
          properties: {
            team_id:     { type: 'string', example: 'T20260530A1B2' },
            team_name:   { type: 'string', example: 'Under-21' },
            description: { type: 'string', example: 'ทีมนักกีฬาอายุไม่เกิน 21 ปี' },
            is_active:   { type: 'boolean', example: true },
            created_at:  { type: 'string', format: 'date-time' },
            updated_at:  { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            user_id:        { type: 'string', example: 'U20260530C3D4' },
            email:          { type: 'string', example: 'player@gmail.com' },
            role:           { type: 'string', enum: ['Super Admin', 'Coach', 'Player'] },
            team_id:        { type: 'string', example: 'T20260530A1B2' },
            th_prefix:      { type: 'string', example: 'นาย' },
            th_first_name:  { type: 'string', example: 'สมชาย' },
            th_last_name:   { type: 'string', example: 'ใจดี' },
            en_first_name:  { type: 'string', example: 'Somchai' },
            en_last_name:   { type: 'string', example: 'Jaidee' },
            img_avatar_url: { type: 'string', example: 'https://drive.google.com/...' },
            is_active:      { type: 'boolean', example: true },
            phone:          { type: 'string', example: '0812345678', description: 'Restricted: เจ้าของ/Coach ทีมเดียวกัน/Admin เท่านั้น' },
            birth_date:     { type: 'string', example: '2005-01-15', description: 'Restricted: เจ้าของ/Admin เท่านั้น' },
          },
        },
        AttendanceRecord: {
          type: 'object',
          properties: {
            attendance_id: { type: 'string' },
            date:          { type: 'string', format: 'date', example: '2026-05-30' },
            player_id:     { type: 'string' },
            team_id:       { type: 'string' },
            status:        { type: 'string', enum: ['Present', 'Absent', 'Leave'] },
            note:          { type: 'string' },
            checked_by:    { type: 'string' },
            checked_at:    { type: 'string', format: 'date-time' },
          },
        },
        LeaveRequest: {
          type: 'object',
          properties: {
            leave_id:      { type: 'string' },
            player_id:     { type: 'string' },
            team_id:       { type: 'string' },
            start_date:    { type: 'string', format: 'date', example: '2026-06-01' },
            end_date:      { type: 'string', format: 'date', example: '2026-06-02' },
            reason:        { type: 'string' },
            evidence_url:  { type: 'string' },
            status:        { type: 'string', enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'] },
            reject_reason: { type: 'string' },
            action_by:     { type: 'string' },
            action_at:     { type: 'string', format: 'date-time' },
          },
        },
        CalendarEvent: {
          type: 'object',
          properties: {
            event_id:       { type: 'string' },
            title:          { type: 'string' },
            description:    { type: 'string' },
            start_datetime: { type: 'string', format: 'date-time' },
            end_datetime:   { type: 'string', format: 'date-time' },
            is_all_day:     { type: 'boolean' },
            color:          { type: 'string', example: '#0288d1' },
            team_id:        { type: 'string', description: 'null = ทุกทีม' },
            created_by:     { type: 'string' },
          },
        },
        Activity: {
          type: 'object',
          properties: {
            activity_id: { type: 'string' },
            title:       { type: 'string' },
            date_from:   { type: 'string', format: 'date' },
            date_to:     { type: 'string', format: 'date' },
            location:    { type: 'string' },
            details:     { type: 'string' },
            img_url:     { type: 'string' },
            created_by:  { type: 'string' },
          },
        },
        PracticeLink: {
          type: 'object',
          properties: {
            link_id:       { type: 'string' },
            practice_date: { type: 'string', format: 'date' },
            team_id:       { type: 'string', description: 'null/empty = ทุกทีมร่วมกัน' },
            section:       { type: 'integer', example: 1, description: 'ลำดับ session ในวันนั้น' },
            player_link:   { type: 'string' },
            coach_link:    { type: 'string', description: 'ซ่อนจาก Player' },
            note:          { type: 'string' },
            is_archived:   { type: 'boolean' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            notification_id: { type: 'string' },
            user_id:         { type: 'string' },
            type:            { type: 'string', enum: ['leave_approved', 'leave_rejected', 'leave_new', 'feed_new', 'practice_new'] },
            title:           { type: 'string' },
            message:         { type: 'string' },
            ref_id:          { type: 'string' },
            is_read:         { type: 'boolean' },
            created_at:      { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',           description: '🔐 Authentication & Session' },
      { name: 'Teams',          description: '🏅 Team Management' },
      { name: 'Users',          description: '👤 Athlete & User Profiles' },
      { name: 'Attendance',     description: '✅ Attendance Tracking' },
      { name: 'Leave',          description: '📋 Leave Requests & Approval' },
      { name: 'Calendar',       description: '📅 Calendar Events' },
      { name: 'Activities',     description: '📰 Activity Feed' },
      { name: 'Practice Links', description: '🔗 Practice Links (Realbridge)' },
      { name: 'Notifications',  description: '🔔 In-App Notifications' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Auth'], summary: 'Health check', security: [],
          responses: { '200': { description: 'Server is running' } },
        },
      },
      '/auth/google': {
        post: {
          tags: ['Auth'], summary: 'Login with Google OAuth', security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string', description: 'Google OAuth authorization code' } }, required: ['code'] } } },
          },
          responses: {
            '200': { description: 'Login สำเร็จ — returns user + JWT token' },
            '401': { description: 'บัญชีไม่มีในระบบ หรือถูกระงับ' },
          },
        },
      },
      '/auth/logout': {
        post: { tags: ['Auth'], summary: 'Logout', responses: { '200': { description: 'Logout สำเร็จ' } } },
      },
      '/auth/me': {
        get: { tags: ['Auth'], summary: 'Get current user profile', responses: { '200': { description: 'Current user data' } } },
      },
      '/teams': {
        get:  { tags: ['Teams'], summary: 'Get all active teams', responses: { '200': { description: 'List of teams' } } },
        post: { tags: ['Teams'], summary: 'Create team [Super Admin]', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { team_name: { type: 'string' }, description: { type: 'string' } }, required: ['team_name'] } } } }, responses: { '201': { description: 'Created' } } },
      },
      '/teams/{id}': {
        get:    { tags: ['Teams'], summary: 'Get team by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Team data' }, '404': { description: 'Not found' } } },
        put:    { tags: ['Teams'], summary: 'Update team [Super Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
        delete: { tags: ['Teams'], summary: 'Delete team [Super Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' }, '409': { description: 'Team has members' } } },
      },
      '/users': {
        get:  { tags: ['Users'], summary: 'Get users (filtered by role)', parameters: [{ name: 'team_id', in: 'query', schema: { type: 'string' } }, { name: 'role', in: 'query', schema: { type: 'string', enum: ['Super Admin', 'Coach', 'Player'] } }, { name: 'is_active', in: 'query', schema: { type: 'boolean' } }], responses: { '200': { description: 'List of users' } } },
        post: { tags: ['Users'], summary: 'Create user [Super Admin]', responses: { '201': { description: 'Created' } } },
      },
      '/users/{id}': {
        get: { tags: ['Users'], summary: 'Get user by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User data (sensitive fields masked by role)' } } },
        put: { tags: ['Users'], summary: 'Update user [Admin or Owner]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
      },
      '/users/{id}/deactivate': {
        patch: { tags: ['Users'], summary: 'Deactivate user [Super Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Deactivated' } } },
      },
      '/users/{id}/reactivate': {
        patch: { tags: ['Users'], summary: 'Reactivate user [Super Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Reactivated' } } },
      },
      '/attendance': {
        get:  { tags: ['Attendance'], summary: 'Get attendance sheet [Coach/Admin]', parameters: [{ name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } }, { name: 'team_id', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Attendance records' } } },
        post: { tags: ['Attendance'], summary: 'Upsert attendance [Coach/Admin]', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { date: { type: 'string' }, player_id: { type: 'string' }, team_id: { type: 'string' }, status: { type: 'string', enum: ['Present', 'Absent', 'Leave'] }, note: { type: 'string' } }, required: ['date', 'player_id', 'team_id', 'status'] } } } }, responses: { '200': { description: 'Saved' } } },
      },
      '/attendance/my': {
        get: { tags: ['Attendance'], summary: 'Get own attendance history [Player]', responses: { '200': { description: 'Records' } } },
      },
      '/attendance/history': {
        get: { tags: ['Attendance'], summary: 'Get attendance history [Coach/Admin]', parameters: [{ name: 'team_id', in: 'query', schema: { type: 'string' } }, { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'player_id', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'History records' } } },
      },
      '/leave-requests': {
        get:  { tags: ['Leave'], summary: 'Get leave requests', parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'] } }, { name: 'team_id', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Leave requests' } } },
        post: { tags: ['Leave'], summary: 'Submit leave request [Player]', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, reason: { type: 'string', minLength: 5 }, evidence: { type: 'string', format: 'binary' } }, required: ['start_date', 'end_date', 'reason'] } } } }, responses: { '201': { description: 'Submitted' }, '400': { description: 'Past date' }, '409': { description: 'Conflict' } } },
      },
      '/leave-requests/{id}/cancel':  { patch: { tags: ['Leave'], summary: 'Cancel leave [Player]',  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Cancelled' } } } },
      '/leave-requests/{id}/approve': { patch: { tags: ['Leave'], summary: 'Approve leave [Coach/Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Approved' } } } },
      '/leave-requests/{id}/reject':  { patch: { tags: ['Leave'], summary: 'Reject leave [Coach/Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { reject_reason: { type: 'string', minLength: 5 } }, required: ['reject_reason'] } } } }, responses: { '200': { description: 'Rejected' } } } },
      '/events': {
        get:  { tags: ['Calendar'], summary: 'Get calendar events', parameters: [{ name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { '200': { description: 'Events' } } },
        post: { tags: ['Calendar'], summary: 'Create event [Coach/Admin]', responses: { '201': { description: 'Created' } } },
      },
      '/events/{id}': {
        put:    { tags: ['Calendar'], summary: 'Update event', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
        delete: { tags: ['Calendar'], summary: 'Delete event', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' } } },
      },
      '/activities': {
        get:  { tags: ['Activities'], summary: 'Get activity feed', responses: { '200': { description: 'Activities' } } },
        post: { tags: ['Activities'], summary: 'Create activity [Super Admin]', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { title: { type: 'string' }, date_from: { type: 'string', format: 'date' }, date_to: { type: 'string', format: 'date' }, location: { type: 'string' }, details: { type: 'string' }, image: { type: 'string', format: 'binary' } }, required: ['title', 'date_from', 'date_to', 'details'] } } } }, responses: { '201': { description: 'Created' } } },
      },
      '/activities/{id}': {
        put:    { tags: ['Activities'], summary: 'Update activity [Super Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
        delete: { tags: ['Activities'], summary: 'Delete activity [Super Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' } } },
      },
      '/practice-links': {
        get:  { tags: ['Practice Links'], summary: 'Get practice links', parameters: [{ name: 'archived', in: 'query', schema: { type: 'boolean' } }], responses: { '200': { description: 'Links (coach_link hidden from Player)' } } },
        post: { tags: ['Practice Links'], summary: 'Create practice link [Super Admin]', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { practice_date: { type: 'string', format: 'date' }, team_id: { type: 'string', description: 'ว่าง = ทุกทีมร่วมกัน' }, section: { type: 'integer', minimum: 1 }, player_link: { type: 'string' }, coach_link: { type: 'string' }, note: { type: 'string' } }, required: ['practice_date', 'section', 'player_link'] } } } }, responses: { '201': { description: 'Created' }, '409': { description: 'Duplicate section' } } },
      },
      '/practice-links/history': {
        get: { tags: ['Practice Links'], summary: 'Get archived practice links', responses: { '200': { description: 'Archived links' } } },
      },
      '/practice-links/archive-now': {
        post: { tags: ['Practice Links'], summary: 'Manually trigger archive [Super Admin]', responses: { '200': { description: 'Archived N links' } } },
      },
      '/practice-links/{id}': {
        put:    { tags: ['Practice Links'], summary: 'Update practice link [Super Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' }, '409': { description: 'Already archived' } } },
        delete: { tags: ['Practice Links'], summary: 'Delete practice link [Super Admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' } } },
      },
      '/notifications/my': {
        get: { tags: ['Notifications'], summary: 'Get my notifications', responses: { '200': { description: 'Notifications' } } },
      },
      '/notifications/{id}/read': {
        patch: { tags: ['Notifications'], summary: 'Mark notification as read', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Marked read' } } },
      },
      '/notifications/read-all': {
        patch: { tags: ['Notifications'], summary: 'Mark all notifications as read', responses: { '200': { description: 'All marked read' } } },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
