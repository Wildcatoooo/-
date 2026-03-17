export interface ClassInfo {
  id: string;
  name: string;
  students: string[]; // List of student names
}

export interface Student {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen: Date;
}

export interface Exam {
  id: string;
  title: string;
  questions: Question[];
  active: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface Submission {
  id: string;
  studentName: string;
  content: string;
  timestamp: Date;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  timestamp: Date;
}
