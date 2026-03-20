/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText } from 'lucide-react';
import { ClassInfo, Student } from '../types';
import { formatFileSize } from '../utils';

interface FileDistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassInfo[];
  students: Student[];
  onDistribute: (data: any) => void;
}

export const FileDistributeModal: React.FC<FileDistributeModalProps> = ({
  isOpen,
  onClose,
  classes,
  students,
  onDistribute,
}) => {
  const [target, setTarget] = React.useState<'all' | 'class' | 'student'>('all');
  const [targetId, setTargetId] = React.useState('');
  const [file, setFile] = React.useState<{ name: string; type: string; data: string; size: number } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFile({
        name: f.name,
        type: f.type,
        size: f.size,
        data: event.target?.result as string,
      });
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    onDistribute({ target, targetId, ...file });
    setFile(null);
    onClose();
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
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">分发文件</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">分发对象</label>
                <select
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value as any);
                    setTargetId('');
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="all">全体学生</option>
                  <option value="class">指定班级</option>
                  <option value="student">指定学生</option>
                </select>
              </div>

              {target === 'class' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">选择班级</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="">请选择班级</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {target === 'student' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">选择学生</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="">请选择学生</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.name}>{s.name} ({s.className})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">选择文件</label>
                {!file ? (
                  <div className="relative group">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center space-y-3 group-hover:border-indigo-500 group-hover:bg-indigo-50/50 transition-all">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">点击或拖拽文件上传</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
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
                  disabled={!file || (target !== 'all' && !targetId)}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:bg-gray-300 disabled:shadow-none"
                >
                  立即分发
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
