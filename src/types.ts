/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClassInfo {
  id: string;
  name: string;
  students: string[];
}

export interface Student {
  id: string;
  name: string;
  className: string;
  status: 'online' | 'offline';
  lastSeen: Date;
  examProgress?: number[]; // indices of answers, -1 for unanswered
  locked?: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface Exam {
  id: string;
  title: string;
  questions: Question[];
  active: boolean;
  duration?: number; // in minutes
  startTime?: number; // timestamp
}

export interface SubmissionFile {
  name: string;
  type: string;
  data: string; // base64
  size: number;
}

export interface Submission {
  id: string;
  studentName: string;
  className?: string;
  content: string;
  files?: SubmissionFile[];
  timestamp: Date;
  grade?: string;
  feedback?: string;
}

export interface DistributedFile {
  id: string;
  name: string;
  type: string;
  data: string;
  size: number;
  target: 'all' | 'class' | 'student';
  targetId?: string;
  timestamp: Date;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentName: string;
  className?: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  timestamp: Date;
}
