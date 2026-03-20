/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, Send, Download, FileText, ClipboardList, 
  Clock, CheckCircle2, AlertCircle, Upload, X,
  MessageSquare
} from 'lucide-react';
import { Student, Exam, DistributedFile, SubmissionFile } from '../types';
import { cn, formatFileSize, formatTime } from '../utils';

interface StudentDashboardProps {
  student: Student;
  activeExam: Exam | null;
  timeLeft: number;
  distributedFiles: DistributedFile[];
  broadcastMessage: string;
  locked: boolean;
  onLogout: () => void;
  onSubmitHomework: (content: string, files: SubmissionFile[]) => void;
  onSubmitExam: (answers: number[]) => void;
  onProgressUpdate: (progress: number[]) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  activeExam,
  timeLeft,
  distributedFiles,
  broadcastMessage,
  locked,
  onLogout,
  onSubmitHomework,
  onSubmitExam,
  onProgressUpdate,
}) => {
  const [activeTab, setActiveTab] = React.useState<'exam' | 'homework' | 'files'>('exam');
  const [homeworkContent, setHomeworkContent] = React.useState('');
  const [homeworkFiles, setHomeworkFiles] = React.useState<SubmissionFile[]>([]);
  const [examAnswers, setExamAnswers] = React.useState<number[]>([]);
  const [isExamSubmitted, setIsExamSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (activeExam) {
      setExamAnswers(new Array(activeExam.questions.length).fill(-1));
      setIsExamSubmitted(false);
    }
  }, [activeExam]);

  const handleAnswerChange = (qIdx: number, aIdx: number) => {
    if (isExamSubmitted || locked) return;
    const newAnswers = [...examAnswers];
    newAnswers[qIdx] = aIdx;
    setExamAnswers(newAnswers);
    onProgressUpdate(newAnswers);
  };

  const handleExamSubmit = () => {
    if (isExamSubmitted || locked) return;
    onSubmitExam(examAnswers);
    setIsExamSubmitted(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setHomeworkFiles(prev => [...prev, {
          name: f.name,
          type: f.type,
          size: f.size,
          data: event.target?.result as string
        }]);
      };
      reader.readAsDataURL(f);
    });
  };

  const handleHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkContent.trim() && homeworkFiles.length === 0) return;
    onSubmitHomework(homeworkContent, homeworkFiles);
    setHomeworkContent('');
    setHomeworkFiles([]);
    alert('作业提交成功！');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-gray-900">学生学习系统</h1>
          <div className="h-6 w-px bg-black/5" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-xs">{student.name[0]}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{student.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{student.className}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <AnimatePresence>
            {broadcastMessage && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full border border-amber-100 text-xs font-bold"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{broadcastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-500 hover:text-red-500 transition-colors text-sm font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>退出系统</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 flex gap-8">
        {/* Navigation */}
        <aside className="w-64 space-y-2">
          {[
            { id: 'exam', label: '在线考试', icon: ClipboardList, badge: activeExam && !isExamSubmitted },
            { id: 'homework', label: '提交作业', icon: Send },
            { id: 'files', label: '学习资料', icon: Download, count: distributedFiles.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-bold text-sm",
                activeTab === tab.id 
                  ? "bg-white text-indigo-600 shadow-sm border border-black/5" 
                  : "text-gray-500 hover:bg-white/50"
              )}
            >
              <div className="flex items-center space-x-3">
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </div>
              {tab.badge && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </aside>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'exam' && (
              <motion.div
                key="exam"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {!activeExam ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-black/5 flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                      <ClipboardList className="w-10 h-10 text-gray-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">暂无进行中的考试</h2>
                    <p className="text-gray-500 max-w-sm">当老师发布考试后，这里会自动显示题目。请保持关注并做好准备。</p>
                  </div>
                ) : isExamSubmitted ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-black/5 flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">考试已提交</h2>
                    <p className="text-gray-500 max-w-sm">您已成功完成本次考试。成绩将在老师批改后公布，请耐心等待。</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 flex items-center justify-between sticky top-24 z-20 shadow-sm">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{activeExam.title}</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                          共 {activeExam.questions.length} 题 · 已完成 {examAnswers.filter(a => a !== -1).length} 题
                        </p>
                      </div>
                      <div className={cn(
                        "flex items-center space-x-3 px-6 py-3 rounded-2xl font-mono font-bold text-xl",
                        timeLeft < 60 ? "bg-red-50 text-red-600 animate-pulse" : "bg-indigo-50 text-indigo-600"
                      )}>
                        <Clock className="w-6 h-6" />
                        <span>{formatTime(timeLeft)}</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {activeExam.questions.map((q, qIdx) => (
                        <div key={q.id} className="bg-white p-8 rounded-3xl border border-black/5 space-y-6">
                          <div className="flex items-start space-x-4">
                            <span className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                              {qIdx + 1}
                            </span>
                            <h3 className="text-lg font-bold text-gray-900 leading-relaxed">{q.text}</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
                            {q.options.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                onClick={() => handleAnswerChange(qIdx, oIdx)}
                                disabled={locked}
                                className={cn(
                                  "flex items-center space-x-4 p-4 rounded-2xl border transition-all text-left group",
                                  examAnswers[qIdx] === oIdx
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                    : "bg-gray-50 border-gray-100 text-gray-600 hover:border-indigo-300 hover:bg-white"
                                )}
                              >
                                <span className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border transition-colors",
                                  examAnswers[qIdx] === oIdx
                                    ? "bg-white/20 border-white/40"
                                    : "bg-white border-gray-200 group-hover:border-indigo-300"
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
                      onClick={handleExamSubmit}
                      disabled={locked}
                      className="w-full py-6 bg-gray-900 text-white rounded-3xl font-bold text-xl hover:bg-indigo-600 transition-all shadow-xl shadow-black/10 disabled:bg-gray-300 disabled:shadow-none"
                    >
                      提交考试
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'homework' && (
              <motion.div
                key="homework"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-3xl border border-black/5 space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">提交作业</h2>
                    <p className="text-gray-500 mt-1">输入作业说明并上传相关附件</p>
                  </div>

                  <form onSubmit={handleHomeworkSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">作业内容说明</label>
                      <textarea
                        value={homeworkContent}
                        onChange={(e) => setHomeworkContent(e.target.value)}
                        placeholder="在此输入您的作业说明或回答..."
                        className="w-full h-48 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="block text-sm font-bold text-gray-700">附件上传</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {homeworkFiles.map((file, i) => (
                          <div key={i} className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-indigo-600" />
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-gray-900 truncate max-w-[150px]">{file.name}</p>
                                <p className="text-[10px] text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setHomeworkFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <div className="relative group">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex items-center justify-center space-x-2 group-hover:border-indigo-500 group-hover:bg-indigo-50/50 transition-all h-full min-h-[60px]">
                            <Upload className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                            <span className="text-xs font-bold text-gray-400 group-hover:text-indigo-600">添加附件</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={locked}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:bg-gray-300 disabled:shadow-none"
                    >
                      提交作业
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'files' && (
              <motion.div
                key="files"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {distributedFiles.slice().reverse().map((file) => (
                    <div key={file.id} className="bg-white p-6 rounded-3xl border border-black/5 flex items-center justify-between group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 truncate max-w-[200px]">{file.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {formatFileSize(file.size)} · {new Date(file.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={file.data}
                        download={file.name}
                        className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                  {distributedFiles.length === 0 && (
                    <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-black/5 flex flex-col items-center space-y-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                        <Download className="w-10 h-10 text-gray-300" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">暂无学习资料</h2>
                      <p className="text-gray-500 max-w-sm">老师分发的文件会显示在这里，您可以随时下载学习。</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Lock Overlay */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md space-y-6"
            >
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-gray-900">系统已锁定</h2>
              <p className="text-gray-500 leading-relaxed">
                您的操作已被老师暂时锁定。这通常发生在考试期间或需要您集中注意力时。请等待老师解锁。
              </p>
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center space-x-3 text-red-600 text-sm font-bold">
                <AlertCircle className="w-5 h-5" />
                <span>切屏或违规操作可能会导致自动锁定</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
