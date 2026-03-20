/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Exam, Question } from '../types';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  newExam: Partial<Exam>;
  setNewExam: (exam: Partial<Exam>) => void;
  onSave: (e: React.FormEvent) => void;
}

export const ExamModal: React.FC<ExamModalProps> = ({
  isOpen,
  onClose,
  newExam,
  setNewExam,
  onSave,
}) => {
  const addQuestion = () => {
    const questions = [...(newExam.questions || [])];
    questions.push({
      id: Date.now().toString(),
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    });
    setNewExam({ ...newExam, questions });
  };

  const removeQuestion = (index: number) => {
    const questions = [...(newExam.questions || [])];
    questions.splice(index, 1);
    setNewExam({ ...newExam, questions });
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const questions = [...(newExam.questions || [])];
    questions[index] = { ...questions[index], [field]: value };
    setNewExam({ ...newExam, questions });
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const questions = [...(newExam.questions || [])];
    const options = [...questions[qIndex].options];
    options[oIndex] = value;
    questions[qIndex] = { ...questions[qIndex], options };
    setNewExam({ ...newExam, questions });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">发布新考试</h2>
            <form onSubmit={onSave} className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">考试标题</label>
                  <input
                    type="text"
                    value={newExam.title || ''}
                    onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                    placeholder="例如: 期中数学测试"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">考试时长 (分钟)</label>
                  <input
                    type="number"
                    value={newExam.duration || 30}
                    onChange={(e) => setNewExam({ ...newExam, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">题目列表</h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加题目</span>
                  </button>
                </div>

                {newExam.questions?.map((q, qIdx) => (
                  <div key={q.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 relative group">
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">题目 {qIdx + 1}</label>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                        placeholder="输入题目内容..."
                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === oIdx}
                            onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                            placeholder={`选项 ${String.fromCharCode(65 + oIdx)}`}
                            className="flex-1 px-3 py-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newExam.title || !newExam.questions?.length}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:bg-gray-300 disabled:shadow-none"
                >
                  发布考试
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
