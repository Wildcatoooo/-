/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SOCKET_EVENTS = {
  // Admin to Server
  ADMIN_SAVE_CLASSES: 'admin:save_classes',
  ADMIN_GET_STUDENTS: 'admin:get_students',
  ADMIN_START_EXAM: 'admin:start_exam',
  ADMIN_STOP_EXAM: 'admin:stop_exam',
  ADMIN_DISTRIBUTE_FILE: 'admin:distribute_file',
  ADMIN_DELETE_FILE: 'admin:delete_distributed_file',
  ADMIN_LOCK_STUDENT: 'admin:lock_student',
  ADMIN_BROADCAST: 'admin:broadcast_message',
  ADMIN_GRADE_SUBMISSION: 'admin:grade_submission',

  // Server to Admin
  SERVER_CLASSES: 'admin:classes',
  SERVER_STUDENTS: 'admin:students',
  SERVER_EXAMS: 'admin:exams',
  SERVER_SUBMISSIONS: 'admin:submissions',
  SERVER_RESULTS: 'admin:exam_results',
  SERVER_DISTRIBUTED_FILES: 'admin:distributed_files',

  // Student to Server
  STUDENT_LOGIN: 'student:login',
  STUDENT_LOGOUT: 'student:logout',
  STUDENT_SUBMIT_HOMEWORK: 'student:submit_homework',
  STUDENT_SUBMIT_EXAM: 'student:submit_exam',
  STUDENT_PROGRESS: 'student:progress_update',

  // Server to Student
  SERVER_CONFIRMED: 'student:confirmed',
  SERVER_ERROR: 'student:error',
  SERVER_RECEIVED_FILES: 'student:received_files',
  SERVER_NEW_FILE: 'student:new_file',
  SERVER_BROADCAST: 'student:broadcast',
  SERVER_LOCK_STATUS: 'student:lock_status',
  SERVER_EXAM_STARTED: 'student:exam_started',
  SERVER_EXAM_STOPPED: 'student:exam_stopped',
};
