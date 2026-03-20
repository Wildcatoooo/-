/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, ClipboardList, Send, Settings, 
  Plus, Trash2, Edit2, Play, Square, Download, 
  MessageSquare, Lock, Unlock, CheckCircle2, XCircle
} from 'lucide-react';
import { ClassInfo, Student, Exam, Submission, ExamResult, DistributedFile } from '../types';
import { cn, formatFileSize } from '../utils';

interface TeacherDashboardProps {
  classes: ClassInfo[];
  students: Student[];
  exams: Exam[];
  submissions: Submission[];
  results: ExamResult[];
  distributedFiles: DistributedFile[];
  onSaveClass: (name: string, studentNames: string, editingId?: string) => void;
  onDeleteClass: (id: string) => void;
  onStartExam: (exam: Partial<Exam>) => void;
  onStopExam: (id: string) => void;
  onDistributeFile: (data: any) => void;
  onDeleteFile: (id: string) => void;
  onLockStudent: (id: string, locked: boolean) => void;
  onBroadcast: (message: string) => void;
  onGrade: (submission: Submission) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  classes,
  students,
  exams,
  submissions,
  results,
  distributedFiles,
  onSaveClass,
  onDeleteClass,
  onStartExam,
  onStopExam,
  onDistributeFile,
  onDeleteFile,
  onLockStudent,
  onBroadcast,
  onGrade,
}) => {
  const [activeTab, setActiveTab] = React.useState<'classes' | 'students' | 'exams' | 'submissions' | 'files'>('classes');
  const [broadcastMessage, setBroadcastMessage] = React.useState('');

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    onBroadcast(broadcastMessage);
    setBroadcastMessage('');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-black/5 flex flex-col">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">教师端系统</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">控制中心</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'classes', label: '班级管理', icon: BookOpen },
            { id: 'students', label: '学生状态', icon: Users },
            { id: 'exams', label: '考试系统', icon: ClipboardList },
            { id: 'submissions', label: '作业批改', icon: CheckCircle2 },
            { id: 'files', label: '文件分发', icon: Send },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium",
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-black/5">
          <form onSubmit={handleBroadcast} className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">全员广播</label>
            <div className="relative">
              <input
                type="text"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="发送消息..."
                className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-700">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto max-h-screen">
        <AnimatePresence mode="wait">
          {activeTab === 'classes' && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">班级管理</h2>
                  <p className="text-gray-500 mt-1">管理您的教学班级和学生名单</p>
                </div>
                <button
                  onClick={() => onSaveClass('', '')}
                  className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-5 h-5" />
                  <span>添加班级</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((c) => (
                  <div key={c.id} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4 group">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onSaveClass(c.name, c.students.join('\n'), c.id)}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => onDeleteClass(c.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{c.name}</h3>
                      <p className="text-gray-500 text-sm mt-1">{c.students.length} 名学生</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.students.slice(0, 5).map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-100">
                          {s}
                        </span>
                      ))}
                      {c.students.length > 5 && (
                        <span className="px-3 py-1 bg-gray-50 text-gray-400 text-xs font-medium rounded-full border border-gray-100">
                          +{c.students.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold text-gray-900">学生状态</h2>
                <p className="text-gray-500 mt-1">实时监控在线学生及考试进度</p>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-bottom border-black/5">
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">学生姓名</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">所属班级</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">当前状态</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">考试进度</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              s.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-gray-300"
                            )} />
                            <span className="font-semibold text-gray-900">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-gray-500">{s.className}</td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                            s.status === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                          )}>
                            {s.status === 'online' ? '在线' : '离线'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          {s.examProgress ? (
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                                <div 
                                  className="h-full bg-indigo-500 transition-all duration-500" 
                                  style={{ width: `${(s.examProgress.filter(p => p !== -1).length / s.examProgress.length) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-400">
                                {s.examProgress.filter(p => p !== -1).length}/{s.examProgress.length}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">未开始</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            onClick={() => onLockStudent(s.id, !s.locked)}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              s.locked ? "text-red-500 bg-red-50" : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                            )}
                          >
                            {s.locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'exams' && (
            <motion.div
              key="exams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">考试系统</h2>
                  <p className="text-gray-500 mt-1">发布新考试并查看过往成绩</p>
                </div>
                <button
                  onClick={() => onStartExam({})}
                  className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-5 h-5" />
                  <span>发布考试</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">考试列表</h3>
                  {exams.map((exam) => (
                    <div key={exam.id} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex items-center justify-between group">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          exam.active ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
                        )}>
                          <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{exam.title}</h4>
                          <p className="text-sm text-gray-500">{exam.questions.length} 道题目 · {exam.duration} 分钟</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {exam.active ? (
                          <button
                            onClick={() => onStopExam(exam.id)}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold"
                          >
                            <Square className="w-4 h-4" />
                            <span>停止</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded-full uppercase tracking-wider">已结束</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">最新成绩</h3>
                  <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
                    <div className="divide-y divide-black/5">
                      {results.slice().reverse().map((res) => (
                        <div key={res.id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-900">{res.studentName}</p>
                            <p className="text-xs text-gray-500">{res.className} · {exams.find(e => e.id === res.examId)?.title}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-indigo-600">{Math.round((res.score / res.totalQuestions) * 100)}%</p>
                            <p className="text-xs font-bold text-gray-400">{res.score}/{res.totalQuestions}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'submissions' && (
            <motion.div
              key="submissions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold text-gray-900">作业批改</h2>
                <p className="text-gray-500 mt-1">查看并批改学生提交的作业文件</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {submissions.slice().reverse().map((sub) => (
                  <div key={sub.id} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{sub.studentName}</p>
                          <p className="text-xs text-gray-500">{sub.className}</p>
                        </div>
                      </div>
                      {sub.grade ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-black rounded-full border border-emerald-100">
                          {sub.grade}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-100">
                          待批改
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{sub.content}</p>
                    {sub.files && sub.files.length > 0 && (
                      <div className="space-y-2">
                        {sub.files.map((file, i) => (
                          <a
                            key={i}
                            href={file.data}
                            download={file.name}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors group"
                          >
                            <div className="flex items-center space-x-2 overflow-hidden">
                              <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                              <span className="text-xs font-medium text-gray-600 truncate">{file.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">{formatFileSize(file.size)}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => onGrade(sub)}
                      className="w-full py-2 bg-gray-50 text-gray-600 text-sm font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      {sub.grade ? '修改批改' : '立即批改'}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'files' && (
            <motion.div
              key="files"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">文件分发</h2>
                  <p className="text-gray-500 mt-1">向指定班级或学生发送学习资料</p>
                </div>
                <button
                  onClick={() => onDistributeFile({})}
                  className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-5 h-5" />
                  <span>分发文件</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {distributedFiles.slice().reverse().map((file) => (
                  <div key={file.id} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4 group">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <Send className="w-6 h-6 text-indigo-600" />
                      </div>
                      <button
                        onClick={() => onDeleteFile(file.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 truncate">{file.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        对象: {file.target === 'all' ? '全体' : file.target === 'class' ? `班级: ${file.targetId}` : `学生: ${file.targetId}`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatFileSize(file.size)}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(file.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
