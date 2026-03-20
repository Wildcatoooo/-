/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { LandingPage } from './components/LandingPage';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentLogin } from './components/StudentLogin';
import { ClassModal } from './components/ClassModal';
import { ExamModal } from './components/ExamModal';
import { FileDistributeModal } from './components/FileDistributeModal';
import { GradeModal } from './components/GradeModal';
import { ClassInfo, Student, Exam, Submission, ExamResult, DistributedFile, SubmissionFile } from './types';
import { SOCKET_EVENTS } from './constants';

const App: React.FC = () => {
  // View State
  const [view, setView] = useState<'landing' | 'teacher' | 'student' | 'student_login'>('landing');
  
  // Data State
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [distributedFiles, setDistributedFiles] = useState<DistributedFile[]>([]);
  
  // Student Specific State
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [studentError, setStudentError] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newStudentNames, setNewStudentNames] = useState('');

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>({ questions: [] });

  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Socket Initialization
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on(SOCKET_EVENTS.SERVER_CLASSES, setClasses);
    socket.on(SOCKET_EVENTS.SERVER_STUDENTS, setStudents);
    socket.on(SOCKET_EVENTS.SERVER_EXAMS, setExams);
    socket.on(SOCKET_EVENTS.SERVER_SUBMISSIONS, setSubmissions);
    socket.on(SOCKET_EVENTS.SERVER_RESULTS, setResults);
    socket.on(SOCKET_EVENTS.SERVER_DISTRIBUTED_FILES, setDistributedFiles);

    socket.on(SOCKET_EVENTS.SERVER_CONFIRMED, (student: Student) => {
      setCurrentStudent(student);
      setView('student');
      setStudentError('');
    });

    socket.on(SOCKET_EVENTS.SERVER_ERROR, setStudentError);

    socket.on(SOCKET_EVENTS.SERVER_EXAM_STARTED, (exam: Exam) => {
      setActiveExam(exam);
      if (exam.duration && exam.startTime) {
        const elapsed = (Date.now() - exam.startTime) / 1000;
        setTimeLeft(Math.max(0, exam.duration * 60 - Math.floor(elapsed)));
      }
    });

    socket.on(SOCKET_EVENTS.SERVER_EXAM_STOPPED, () => {
      setActiveExam(null);
      setTimeLeft(0);
    });

    socket.on(SOCKET_EVENTS.SERVER_NEW_FILE, (file: DistributedFile) => {
      setDistributedFiles(prev => [...prev, file]);
    });

    socket.on(SOCKET_EVENTS.SERVER_RECEIVED_FILES, setDistributedFiles);

    socket.on(SOCKET_EVENTS.SERVER_BROADCAST, (msg: string) => {
      setBroadcastMessage(msg);
      setTimeout(() => setBroadcastMessage(''), 10000);
    });

    socket.on(SOCKET_EVENTS.SERVER_LOCK_STATUS, setIsLocked);

    return () => {
      socket.disconnect();
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    if (activeExam && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeExam, timeLeft]);

  // Fullscreen Logic for Students
  useEffect(() => {
    if (view === 'student' && activeExam && !isLocked) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          socketRef.current?.emit(SOCKET_EVENTS.ADMIN_LOCK_STUDENT, { 
            studentId: currentStudent?.id, 
            locked: true 
          });
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [view, activeExam, isLocked, currentStudent]);

  // Handlers
  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    const studentList = newStudentNames.split('\n').map(s => s.trim()).filter(s => s !== '');
    const updatedClasses = editingClass 
      ? classes.map(c => c.id === editingClass.id ? { ...c, name: newClassName, students: studentList } : c)
      : [...classes, { id: Date.now().toString(), name: newClassName, students: studentList }];
    
    socketRef.current?.emit(SOCKET_EVENTS.ADMIN_SAVE_CLASSES, updatedClasses);
    setIsClassModalOpen(false);
    setEditingClass(null);
    setNewClassName('');
    setNewStudentNames('');
  };

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    socketRef.current?.emit(SOCKET_EVENTS.ADMIN_START_EXAM, newExam);
    setIsExamModalOpen(false);
    setNewExam({ questions: [] });
  };

  const handleStudentLogin = (name: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.STUDENT_LOGIN, { name });
  };

  const handleStudentLogout = () => {
    socketRef.current?.emit(SOCKET_EVENTS.STUDENT_LOGOUT);
    setCurrentStudent(null);
    setView('landing');
  };

  const handleSubmitHomework = (content: string, files: SubmissionFile[]) => {
    socketRef.current?.emit(SOCKET_EVENTS.STUDENT_SUBMIT_HOMEWORK, {
      studentName: currentStudent?.name,
      content,
      files
    });
  };

  const handleSubmitExam = (answers: number[]) => {
    if (!activeExam || !currentStudent) return;
    socketRef.current?.emit(SOCKET_EVENTS.STUDENT_SUBMIT_EXAM, {
      examId: activeExam.id,
      studentName: currentStudent.name,
      className: currentStudent.className,
      score: answers.reduce((acc, curr, idx) => acc + (curr === activeExam.questions[idx].correctAnswer ? 1 : 0), 0),
      totalQuestions: activeExam.questions.length,
      answers
    });
  };

  return (
    <div className="min-h-screen font-sans">
      {view === 'landing' && <LandingPage onSelectView={(v) => setView(v === 'student' ? 'student_login' : 'teacher')} />}
      
      {view === 'student_login' && (
        <StudentLogin 
          onLogin={handleStudentLogin} 
          error={studentError} 
          onBack={() => setView('landing')} 
        />
      )}

      {view === 'teacher' && (
        <TeacherDashboard
          classes={classes}
          students={students}
          exams={exams}
          submissions={submissions}
          results={results}
          distributedFiles={distributedFiles}
          onSaveClass={(name, names, id) => {
            if (id) {
              const c = classes.find(cl => cl.id === id);
              if (c) {
                setEditingClass(c);
                setNewClassName(name);
                setNewStudentNames(names);
              }
            } else {
              setEditingClass(null);
              setNewClassName('');
              setNewStudentNames('');
            }
            setIsClassModalOpen(true);
          }}
          onDeleteClass={(id) => socketRef.current?.emit(SOCKET_EVENTS.ADMIN_SAVE_CLASSES, classes.filter(c => c.id !== id))}
          onStartExam={() => setIsExamModalOpen(true)}
          onStopExam={(id) => socketRef.current?.emit(SOCKET_EVENTS.ADMIN_STOP_EXAM, id)}
          onDistributeFile={() => setIsFileModalOpen(true)}
          onDeleteFile={(id) => socketRef.current?.emit(SOCKET_EVENTS.ADMIN_DELETE_FILE, id)}
          onLockStudent={(id, locked) => socketRef.current?.emit(SOCKET_EVENTS.ADMIN_LOCK_STUDENT, { studentId: id, locked })}
          onBroadcast={(msg) => socketRef.current?.emit(SOCKET_EVENTS.ADMIN_BROADCAST, msg)}
          onGrade={(sub) => {
            setSelectedSubmission(sub);
            setIsGradeModalOpen(true);
          }}
        />
      )}

      {view === 'student' && currentStudent && (
        <StudentDashboard
          student={currentStudent}
          activeExam={activeExam}
          timeLeft={timeLeft}
          distributedFiles={distributedFiles}
          broadcastMessage={broadcastMessage}
          locked={isLocked}
          onLogout={handleStudentLogout}
          onSubmitHomework={handleSubmitHomework}
          onSubmitExam={handleSubmitExam}
          onProgressUpdate={(progress) => socketRef.current?.emit(SOCKET_EVENTS.STUDENT_PROGRESS, progress)}
        />
      )}

      {/* Modals */}
      <ClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        editingClass={editingClass}
        newClassName={newClassName}
        setNewClassName={setNewClassName}
        newStudentNames={newStudentNames}
        setNewStudentNames={setNewStudentNames}
        onSave={handleSaveClass}
      />

      <ExamModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        newExam={newExam}
        setNewExam={setNewExam}
        onSave={handleStartExam}
      />

      <FileDistributeModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        classes={classes}
        students={students}
        onDistribute={(data) => socketRef.current?.emit(SOCKET_EVENTS.ADMIN_DISTRIBUTE_FILE, data)}
      />

      <GradeModal
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        submission={selectedSubmission}
        onGrade={(id, grade, feedback) => socketRef.current?.emit(SOCKET_EVENTS.ADMIN_GRADE_SUBMISSION, { submissionId: id, grade, feedback })}
      />
    </div>
  );
};

export default App;
