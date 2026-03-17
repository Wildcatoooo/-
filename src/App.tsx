/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, 
  BookOpen, 
  Send, 
  Monitor, 
  CheckCircle, 
  XCircle, 
  LogOut,
  Plus,
  ClipboardList,
  FileText,
  FileUp,
  Paperclip,
  Image as ImageIcon,
  File as FileIcon,
  Trash2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Types
interface ClassInfo {
  id: string;
  name: string;
  students: string[];
}

interface Student {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen: Date;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

interface Exam {
  id: string;
  title: string;
  questions: Question[];
  active: boolean;
}

interface SubmissionFile {
  name: string;
  type: string;
  data: string; // base64
  size: number;
}

interface Submission {
  id: string;
  studentName: string;
  className?: string;
  content: string;
  files?: SubmissionFile[];
  timestamp: Date;
}

interface DistributedFile {
  id: string;
  name: string;
  type: string;
  data: string;
  size: number;
  target: 'all' | 'class' | 'student';
  targetId?: string;
  timestamp: Date;
}

interface ExamResult {
  id: string;
  examId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  timestamp: Date;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [view, setView] = useState<'landing' | 'teacher' | 'student'>('landing');
  const [teacherTab, setTeacherTab] = useState<'monitor' | 'classes' | 'exams' | 'submissions'>('monitor');
  const [studentName, setStudentName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // State for Teacher
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [distributedFiles, setDistributedFiles] = useState<DistributedFile[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<DistributedFile[]>([]);
  const [serverUrl, setServerUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState(window.location.origin);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [pendingLogin, setPendingLogin] = useState(false);

  // Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newStudentNames, setNewStudentNames] = useState('');

  // New Exam State
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamQuestions, setNewExamQuestions] = useState<Partial<Question>[]>([
    { text: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);

  // State for Student
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<number[]>([]);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [homeworkContent, setHomeworkContent] = useState('');
  const [homeworkFiles, setHomeworkFiles] = useState<SubmissionFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const setupSocket = (url: string) => {
      const newSocket = io(url);
      socketRef.current = newSocket;
      
      newSocket.on('connect', () => {
        setIsConnecting(false);
        if (pendingLogin && studentName.trim()) {
          newSocket.emit('student:login', { name: studentName });
          setPendingLogin(false);
        }
      });
      newSocket.on('connect_error', () => {
        setIsConnecting(false);
        setPendingLogin(false);
        setLoginError('无法连接到服务器，请检查地址是否正确。');
      });

      newSocket.on('admin:classes', (data: ClassInfo[]) => setClasses(data));
      newSocket.on('admin:students', (data: Student[]) => setStudents(data));
      newSocket.on('admin:exams', (data: Exam[]) => setExams(data));
      newSocket.on('admin:submissions', (data: Submission[]) => setSubmissions(data));
      newSocket.on('admin:exam_results', (data: ExamResult[]) => setExamResults(data));
      newSocket.on('admin:distributed_files', (data: DistributedFile[]) => setDistributedFiles(data));
      newSocket.on('student:received_files', (data: DistributedFile[]) => setReceivedFiles(data));
      newSocket.on('student:new_file', (file: DistributedFile) => {
        setReceivedFiles(prev => [...prev, file]);
        alert(`收到新文件: ${file.name}`);
      });
      newSocket.on('student:exam_started', (exam: Exam) => {
        setActiveExam(exam);
        setStudentAnswers(new Array(exam.questions.length).fill(-1));
        setExamSubmitted(false);
      });
      newSocket.on('student:confirmed', () => {
        setIsLoggedIn(true);
        setLoginError('');
      });
      newSocket.on('student:error', (msg: string) => setLoginError(msg));

      return newSocket;
    };

    const currentSocket = setupSocket(activeUrl);

    return () => {
      currentSocket.close();
    };
  }, [activeUrl, pendingLogin, studentName]);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    let inputUrl = serverUrl.trim();
    let formattedUrl;

    if (!inputUrl) {
      formattedUrl = window.location.origin;
    } else {
      formattedUrl = inputUrl;
      if (!formattedUrl.startsWith('http')) {
        if (!formattedUrl.includes(':')) {
          formattedUrl = `http://${formattedUrl}:3000`;
        } else {
          formattedUrl = `http://${formattedUrl}`;
        }
      }
    }

    if (formattedUrl !== activeUrl) {
      setIsConnecting(true);
      setPendingLogin(true);
      setActiveUrl(formattedUrl);
    } else if (studentName.trim() && socketRef.current) {
      if (socketRef.current.connected) {
        socketRef.current.emit('student:login', { name: studentName });
      } else {
        setIsConnecting(true);
        setPendingLogin(true);
      }
    }
  };

  const openAddClassModal = () => {
    setEditingClass(null);
    setNewClassName('');
    setNewStudentNames('');
    setIsClassModalOpen(true);
  };

  const openEditClassModal = (cls: ClassInfo) => {
    setEditingClass(cls);
    setNewClassName(cls.name);
    setNewStudentNames('');
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const studentList = newStudentNames
      .split(/[,，\n]/)
      .map(n => n.trim())
      .filter(n => n);

    let newClasses;
    if (editingClass) {
      newClasses = classes.map(c => 
        c.id === editingClass.id 
          ? { ...c, name: newClassName, students: [...new Set([...c.students, ...studentList])] } 
          : c
      );
    } else {
      newClasses = [...classes, { 
        id: Date.now().toString(), 
        name: newClassName, 
        students: studentList 
      }];
    }

    socketRef.current?.emit('admin:save_classes', newClasses);
    setIsClassModalOpen(false);
  };

  const removeStudentFromClass = (classId: string, studentName: string) => {
    if (confirm(`确定要从班级中移除学生 "${studentName}" 吗？`)) {
      const newClasses = classes.map(c => 
        c.id === classId ? { ...c, students: c.students.filter(s => s !== studentName) } : c
      );
      socketRef.current?.emit('admin:save_classes', newClasses);
    }
  };

  const deleteClass = (classId: string) => {
    if (confirm('确定要删除该班级吗？')) {
      const newClasses = classes.filter(c => c.id !== classId);
      socketRef.current?.emit('admin:save_classes', newClasses);
    }
  };

  const openAddExamModal = () => {
    setNewExamTitle('');
    setNewExamQuestions([{ text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
    setIsExamModalOpen(true);
  };

  const addQuestion = () => {
    setNewExamQuestions([...newExamQuestions, { text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...newExamQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setNewExamQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...newExamQuestions];
    const options = [...(updated[qIndex].options || [])];
    options[oIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options };
    setNewExamQuestions(updated);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const questions = newExamQuestions.map((q, idx) => ({
      ...q,
      id: idx.toString(),
    })) as Question[];

    socketRef.current?.emit('admin:start_exam', { title: newExamTitle, questions });
    setIsExamModalOpen(false);
  };

  const handleStudentExamSubmit = () => {
    if (!activeExam) return;
    
    let score = 0;
    activeExam.questions.forEach((q, idx) => {
      if (studentAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });

    socketRef.current?.emit('student:submit_exam', {
      examId: activeExam.id,
      studentName,
      score,
      totalQuestions: activeExam.questions.length,
      answers: studentAnswers
    });

    setExamSubmitted(true);
  };

  const handleWordImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        
        // 解析逻辑：识别题目和选项
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const parsedQuestions: Partial<Question>[] = [];
        let currentQuestion: Partial<Question> | null = null;

        lines.forEach(line => {
          // 匹配题目 (例如: 1. 题目内容 或 1、题目内容)
          if (/^\d+[\.、\s]/.test(line)) {
            if (currentQuestion) parsedQuestions.push(currentQuestion);
            currentQuestion = {
              text: line.replace(/^\d+[\.、\s]*/, ''),
              options: ['', '', '', ''],
              correctAnswer: 0
            };
          } 
          // 匹配选项 (例如: A. 选项内容 或 A、选项内容)
          else if (/^[A-D][\.、\s:]/i.test(line)) {
            if (currentQuestion) {
              const optionMatch = line.match(/^([A-D])[\.、\s:]*(.*)/i);
              if (optionMatch) {
                const index = optionMatch[1].toUpperCase().charCodeAt(0) - 65;
                if (index >= 0 && index < 4) {
                  currentQuestion.options![index] = optionMatch[2].trim();
                }
              }
            }
          } 
          // 如果不是题目也不是选项，且当前有题目，则追加到题目文本中
          else if (currentQuestion) {
            currentQuestion.text += ' ' + line;
          }
        });

        if (currentQuestion) parsedQuestions.push(currentQuestion);

        if (parsedQuestions.length > 0) {
          setNewExamQuestions(parsedQuestions);
          alert(`成功识别到 ${parsedQuestions.length} 道题目，请手动核对并设置正确答案。`);
        } else {
          alert('未能识别到符合格式的题目，请确保题目以数字开头，选项以A-D开头。');
        }
      } catch (err) {
        console.error(err);
        alert('读取 Word 文档失败，请确保文件格式正确。');
      }
    };
    reader.readAsArrayBuffer(file);
    // 重置 input 以便下次选择同一文件
    e.target.value = '';
  };

  const submitHomework = () => {
    if ((homeworkContent.trim() || homeworkFiles.length > 0) && socketRef.current) {
      socketRef.current.emit('student:submit_homework', { 
        studentName, 
        content: homeworkContent,
        files: homeworkFiles
      });
      setHomeworkContent('');
      setHomeworkFiles([]);
      alert('作业已提交！');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(Array.from(files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) {
      processFiles(Array.from(files));
    }
  };

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target?.result as string;
        setHomeworkFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: base64Data,
          size: file.size
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setHomeworkFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAllSubmissions = async () => {
    if (submissions.length === 0) return;
    
    const zip = new JSZip();
    
    submissions.forEach(sub => {
      const folderName = sub.className || '未分类';
      const studentFolder = zip.folder(folderName);
      
      if (sub.content) {
        studentFolder?.file(`${sub.studentName}_作业内容.txt`, sub.content);
      }
      
      if (sub.files && sub.files.length > 0) {
        sub.files.forEach(file => {
          // Extract base64 data
          const base64Data = file.data.split(',')[1];
          studentFolder?.file(`${sub.studentName}_${file.name}`, base64Data, { base64: true });
        });
      }
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `学生作业_${new Date().toLocaleDateString()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const distributeFile = (file: SubmissionFile, target: 'all' | 'class' | 'student', targetId?: string) => {
    if (socketRef.current) {
      socketRef.current.emit('admin:distribute_file', {
        name: file.name,
        type: file.type,
        data: file.data,
        size: file.size,
        target,
        targetId
      });
    }
  };

  const deleteDistributedFile = (id: string) => {
    if (socketRef.current) {
      socketRef.current.emit('admin:delete_distributed_file', id);
    }
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('teacher')}
            className="bg-white p-12 rounded-3xl shadow-sm border border-black/5 flex flex-col items-center text-center space-y-6 group transition-all hover:shadow-md"
          >
            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Monitor className="w-10 h-10 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">教师端</h2>
              <p className="text-gray-500 mt-2">管理班级、监控学生、发布考试</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('student')}
            className="bg-white p-12 rounded-3xl shadow-sm border border-black/5 flex flex-col items-center text-center space-y-6 group transition-all hover:shadow-md"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Users className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">学生端</h2>
              <p className="text-gray-500 mt-2">登录系统、参加考试、提交作业</p>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  if (view === 'teacher') {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-black/5 p-6 flex flex-col">
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">管理系统</span>
          </div>

          <nav className="space-y-2 flex-1">
            <button 
              onClick={() => setTeacherTab('monitor')}
              className={cn(
                "w-full flex items-center space-x-3 p-3 rounded-xl font-medium transition-all",
                (teacherTab === 'monitor' || teacherTab === 'classes') ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <Users className="w-5 h-5" />
              <span>班级与学生</span>
            </button>
            <button 
              onClick={() => setTeacherTab('exams')}
              className={cn(
                "w-full flex items-center space-x-3 p-3 rounded-xl font-medium transition-all",
                teacherTab === 'exams' ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <BookOpen className="w-5 h-5" />
              <span>考试管理</span>
            </button>
            <button 
              onClick={() => setTeacherTab('submissions')}
              className={cn(
                "w-full flex items-center space-x-3 p-3 rounded-xl font-medium transition-all",
                teacherTab === 'submissions' ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <FileText className="w-5 h-5" />
              <span>作业批改</span>
            </button>
          </nav>

          <button 
            onClick={() => setView('landing')}
            className="flex items-center space-x-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors mt-auto"
          >
            <LogOut className="w-5 h-5" />
            <span>退出</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10 overflow-auto">
          {(teacherTab === 'monitor' || teacherTab === 'classes') && (
            <>
              <header className="flex justify-between items-center mb-10">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">班级与学生监控</h1>
                  <div className="flex items-center space-x-4 mt-2">
                    <p className="text-gray-500 text-sm">
                      当前在线: <span className="text-emerald-600 font-bold">{students.filter(s => s.status === 'online').length}</span> / 总计: {classes.reduce((acc, c) => acc + c.students.length, 0)}
                    </p>
                    <div className="h-4 w-px bg-gray-200"></div>
                    <div className="flex items-center space-x-2 text-xs text-gray-400 bg-white px-3 py-1 rounded-full border border-black/5">
                      <Monitor className="w-3 h-3" />
                      <span>局域网访问: 请在学生端输入教师机 IP</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={openAddClassModal}
                    className="bg-white text-gray-700 border border-black/5 px-6 py-3 rounded-xl font-medium flex items-center space-x-2 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    <span>添加班级</span>
                  </button>
                  <button 
                    onClick={openAddExamModal}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span>发布考试</span>
                  </button>
                </div>
              </header>

              <div className="space-y-8">
                {classes.map(cls => (
                  <div key={cls.id} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-xl font-bold text-gray-900">{cls.name}</h3>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                          {cls.students.length} 名学生
                        </span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          {cls.students.filter(name => students.some(s => s.name === name && s.status === 'online')).length} 在线
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openEditClassModal(cls)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="添加学生/编辑班级"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => deleteClass(cls.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="删除班级"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {cls.students.map((name, idx) => {
                          const studentSession = students.find(s => s.name === name);
                          const isOnline = studentSession?.status === 'online';
                          
                          return (
                            <div 
                              key={idx}
                              className={cn(
                                "group relative p-4 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-2",
                                isOnline 
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm" 
                                  : "bg-gray-50 border-gray-100 text-gray-400"
                              )}
                            >
                              <button 
                                onClick={() => removeStudentFromClass(cls.id, name)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                              
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                isOnline ? "bg-emerald-100" : "bg-gray-200"
                              )}>
                                <Monitor className="w-5 h-5" />
                              </div>
                              
                              <span className="text-xs font-bold truncate w-full text-center px-1">
                                {name}
                              </span>
                              
                              <div className="flex items-center space-x-1">
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                                )}></span>
                                <span className="text-[9px] font-medium uppercase tracking-wider">
                                  {isOnline ? '在线' : '离线'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {cls.students.length === 0 && (
                          <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                            <p className="text-gray-400 text-sm">暂无学生，点击上方“+”号添加</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {classes.length === 0 && (
                  <div className="py-32 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">欢迎使用管理系统</h3>
                    <p className="text-gray-500 mt-2 mb-8">您还没有创建任何班级，请先添加班级并录入学生名单。</p>
                    <button 
                      onClick={openAddClassModal}
                      className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      立即创建班级
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Submissions Section (Floating or Bottom) */}
              {submissions.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
                    <Send className="w-6 h-6 text-indigo-600" />
                    <span>最新作业动态</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {submissions.slice(-4).reverse().map(sub => (
                      <div key={sub.id} className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-sm text-gray-900">{sub.studentName}</span>
                          <span className="text-[10px] text-gray-400">{new Date(sub.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 italic">"{sub.content}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exam Modal */}
              <AnimatePresence>
                {isExamModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsExamModalOpen(false)}
                      className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">发布新考试</h2>
                      <form onSubmit={handleSaveExam} className="space-y-6 overflow-auto pr-4 flex-1">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">考试标题</label>
                          <input
                            type="text"
                            value={newExamTitle}
                            onChange={(e) => setNewExamTitle(e.target.value)}
                            placeholder="例如: 期中数学测试"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            required
                          />
                        </div>

                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-gray-700">题目列表</label>
                            <div className="flex items-center space-x-4">
                              <label className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer bg-emerald-50 px-2 py-1 rounded-lg transition-colors">
                                <FileUp className="w-4 h-4" />
                                <span>Word 导入</span>
                                <input 
                                  type="file" 
                                  accept=".docx" 
                                  onChange={handleWordImport} 
                                  className="hidden" 
                                />
                              </label>
                              <button 
                                type="button"
                                onClick={addQuestion}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                                <span>添加题目</span>
                              </button>
                            </div>
                          </div>

                          {newExamQuestions.map((q, qIdx) => (
                            <div key={qIdx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">题目 {qIdx + 1}</span>
                                {newExamQuestions.length > 1 && (
                                  <button 
                                    type="button"
                                    onClick={() => setNewExamQuestions(newExamQuestions.filter((_, i) => i !== qIdx))}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={q.text}
                                onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                                placeholder="请输入题目内容"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                required
                              />
                              <div className="grid grid-cols-2 gap-3">
                                {q.options?.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center space-x-2">
                                    <input 
                                      type="radio" 
                                      name={`correct-${qIdx}`}
                                      checked={q.correctAnswer === oIdx}
                                      onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                                      className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                      placeholder={`选项 ${String.fromCharCode(65 + oIdx)}`}
                                      className="flex-1 px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none"
                                      required
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </form>
                      <div className="flex space-x-3 pt-6 border-t border-gray-100 mt-6">
                        <button
                          type="button"
                          onClick={() => setIsExamModalOpen(false)}
                          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveExam}
                          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                        >
                          发布考试
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </>
          )}

          {teacherTab === 'exams' && (
            <>
              <header className="flex justify-between items-center mb-10">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">考试管理</h1>
                  <p className="text-gray-500 mt-1">创建、发布及查看历史考试</p>
                </div>
                <button 
                  onClick={openAddExamModal}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-5 h-5" />
                  <span>创建考试</span>
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map(exam => (
                  <div key={exam.id} className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        exam.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {exam.active ? '进行中' : '已结束'}
                      </span>
                    </div>
                    <div className="space-y-2 mb-6">
                      <p className="text-sm text-gray-500 flex items-center space-x-2">
                        <ClipboardList className="w-4 h-4" />
                        <span>{exam.questions.length} 道题目</span>
                      </p>
                      <p className="text-sm text-gray-500 flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{examResults.filter(r => r.examId === exam.id).length} 人已提交</span>
                      </p>
                    </div>
                    <button className="w-full py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors">
                      查看详情
                    </button>
                  </div>
                ))}
                {exams.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-400">暂无考试记录，点击右上角“创建考试”开始</p>
                  </div>
                )}
              </div>
            </>
          )}

          {teacherTab === 'submissions' && (
            <>
              <header className="flex justify-between items-center mb-10">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">作业与成绩</h1>
                  <p className="text-gray-500 mt-1">查看学生提交的作业和考试成绩</p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={downloadAllSubmissions}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>打包下载全部</span>
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Homework Submissions */}
                <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <Send className="w-5 h-5 text-indigo-600" />
                    <span>学生作业 ({submissions.length})</span>
                  </h2>
                  <div className="space-y-4 max-h-[600px] overflow-auto pr-2">
                    {submissions.length === 0 ? (
                      <p className="text-gray-400 text-center py-10 italic">暂无作业提交</p>
                    ) : (
                      submissions.slice().reverse().map(sub => (
                        <div key={sub.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <span className="font-bold text-gray-900">{sub.studentName}</span>
                              <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase font-bold">
                                {sub.className}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{new Date(sub.timestamp).toLocaleString()}</span>
                          </div>
                          {sub.content && <p className="text-sm text-gray-600 leading-relaxed mb-3">{sub.content}</p>}
                          
                          {sub.files && sub.files.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">附件 ({sub.files.length})</p>
                              <div className="grid grid-cols-1 gap-2">
                                {sub.files.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-100 text-xs">
                                    <div className="flex items-center space-x-2 overflow-hidden">
                                      {file.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 text-emerald-500 shrink-0" /> : <FileIcon className="w-3 h-3 text-indigo-500 shrink-0" />}
                                      <span className="truncate text-gray-700">{file.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => distributeFile(file, 'student', sub.studentName)}
                                        title="返回给学生修改"
                                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                      >
                                        <Send className="w-3 h-3" />
                                      </button>
                                      <a 
                                        href={file.data} 
                                        download={`${sub.studentName}_${file.name}`}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                      >
                                        <Download className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  {/* File Distribution */}
                  <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                      <FileUp className="w-5 h-5 text-indigo-600" />
                      <span>文件分发</span>
                    </h2>
                    
                    <div className="space-y-4">
                      <div 
                        className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-indigo-400 hover:bg-gray-50/50 transition-all cursor-pointer"
                        onClick={() => document.getElementById('admin-file-dist')?.click()}
                      >
                        <input 
                          id="admin-file-dist"
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const data = ev.target?.result as string;
                                distributeFile({
                                  name: file.name,
                                  type: file.type,
                                  data: data,
                                  size: file.size
                                }, 'all');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <Plus className="w-8 h-8 text-indigo-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">分发新文件给全班</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">已分发的文件 ({distributedFiles.length})</p>
                        {distributedFiles.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">暂无分发记录</p>
                        ) : (
                          distributedFiles.slice().reverse().map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="flex items-center space-x-3 overflow-hidden">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                                  <FileIcon className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-xs font-bold text-gray-900 truncate">{file.name}</span>
                                  <span className="text-[10px] text-gray-400">
                                    {file.target === 'all' ? '全班' : file.targetId} • {formatFileSize(file.size)}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => deleteDistributedFile(file.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Exam Results */}
                  <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span>考试成绩 ({examResults.length})</span>
                    </h2>
                    <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
                      {examResults.length === 0 ? (
                        <p className="text-gray-400 text-center py-10 italic">暂无考试成绩</p>
                      ) : (
                        examResults.slice().reverse().map(res => {
                          const exam = exams.find(e => e.id === res.examId);
                          return (
                            <div key={res.id} className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                              <div className="flex justify-between items-center mb-3">
                                <div>
                                  <span className="font-bold text-gray-900 block">{res.studentName}</span>
                                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                    {exam?.title || '未知考试'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-2xl font-black text-emerald-600">
                                    {res.score}
                                  </span>
                                  <span className="text-xs text-emerald-400"> / {res.totalQuestions}</span>
                                </div>
                              </div>
                              <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full transition-all duration-1000" 
                                  style={{ width: `${(res.score / res.totalQuestions) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  if (view === 'student') {
    if (!isLoggedIn) {
      return (
        <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white p-10 rounded-3xl shadow-sm border border-black/5"
          >
            <div className="flex flex-col items-center text-center space-y-6 mb-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">学生登录</h2>
                <p className="text-gray-500 mt-1">请输入您的姓名以连接到系统</p>
              </div>
            </div>

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">学生姓名</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="您的姓名"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              <div className="pt-4 border-t border-gray-50">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">教师机 IP 地址</label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="留空使用默认地址，或输入 IP (如 192.168.1.5)"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {loginError && (
                <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={isConnecting}
                className={cn(
                  "w-full py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-emerald-600/20",
                  isConnecting ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                {isConnecting ? '连接中...' : '进入系统'}
              </button>
            </form>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F5F5F4] p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-center mb-10">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{studentName}</h1>
                <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest">学生在线</p>
              </div>
            </div>
            <button 
              onClick={() => {
                if (socketRef.current) socketRef.current.emit('student:logout');
                setIsLoggedIn(false);
                setStudentName('');
              }}
              className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Active Exam Section */}
              <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm overflow-hidden relative">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">当前考试</h2>
                </div>

                {!activeExam ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-400">目前没有正在进行的考试</p>
                  </div>
                ) : examSubmitted ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">考试已提交</h3>
                    <p className="text-gray-500">您的答案已成功上传，请等待老师阅卷。</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <h3 className="text-2xl font-bold text-indigo-900 mb-2">{activeExam.title}</h3>
                      <p className="text-indigo-600 text-sm font-medium">共 {activeExam.questions.length} 道题目，请认真作答。</p>
                    </div>

                    <div className="space-y-10">
                      {activeExam.questions.map((q, qIdx) => (
                        <div key={q.id} className="space-y-4">
                          <div className="flex items-start space-x-4">
                            <span className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                              {qIdx + 1}
                            </span>
                            <p className="text-lg font-medium text-gray-800 pt-1">{q.text}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                            {q.options.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                onClick={() => {
                                  const updated = [...studentAnswers];
                                  updated[qIdx] = oIdx;
                                  setStudentAnswers(updated);
                                }}
                                className={cn(
                                  "p-4 rounded-xl border text-left transition-all flex items-center space-x-3",
                                  studentAnswers[qIdx] === oIdx
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                    : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                                )}
                              >
                                <span className={cn(
                                  "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold",
                                  studentAnswers[qIdx] === oIdx ? "border-white/30 bg-white/20" : "border-gray-200 bg-white"
                                )}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="font-medium">{opt}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleStudentExamSubmit}
                      disabled={studentAnswers.includes(-1)}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold text-lg transition-all shadow-xl",
                        studentAnswers.includes(-1)
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                      )}
                    >
                      {studentAnswers.includes(-1) ? `还有 ${studentAnswers.filter(a => a === -1).length} 题未完成` : '提交试卷'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Received Files */}
              {receivedFiles.length > 0 && (
                <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <FileUp className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">收到的文件</h2>
                  </div>
                  <div className="space-y-3">
                    {receivedFiles.slice().reverse().map(file => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                            {file.type.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-emerald-500" /> : <FileIcon className="w-5 h-5 text-indigo-500" />}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold text-gray-900 truncate">{file.name}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <a 
                          href={file.data} 
                          download={file.name}
                          className="p-3 bg-white text-indigo-600 rounded-xl border border-gray-100 hover:bg-indigo-50 transition-all shadow-sm"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Homework Submission */}
              <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Send className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">提交作业</h2>
                </div>
                <textarea
                  value={homeworkContent}
                  onChange={(e) => setHomeworkContent(e.target.value)}
                  placeholder="在此输入您的作业内容..."
                  className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none mb-4"
                />

                {/* File Upload Area */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-6 mb-4 transition-all flex flex-col items-center justify-center text-center cursor-pointer",
                    isDragging ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 hover:border-emerald-400 hover:bg-gray-50/50"
                  )}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input 
                    id="file-upload"
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileSelect}
                  />
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                    <Paperclip className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">点击或拖拽文件到此处</p>
                  <p className="text-xs text-gray-400 mt-1">支持图片和各类文档</p>
                </div>

                {/* File List */}
                {homeworkFiles.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {homeworkFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          {file.type.startsWith('image/') ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                              <img src={file.data} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                              <FileIcon className="w-4 h-4 text-indigo-600" />
                            </div>
                          )}
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold text-gray-900 truncate">{file.name}</span>
                            <span className="text-[10px] text-gray-400">{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={submitHomework}
                  disabled={!homeworkContent.trim() && homeworkFiles.length === 0}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all",
                    (!homeworkContent.trim() && homeworkFiles.length === 0)
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                  )}
                >
                  提交作业
                </button>
              </div>

              {/* System Status */}
              <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl">
                <h3 className="text-lg font-bold mb-4">系统状态</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">连接状态</span>
                    <span className="text-emerald-400 font-bold flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                      <span>已连接</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">当前时间</span>
                    <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
