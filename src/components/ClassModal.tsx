/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClassInfo, Question } from '../types';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClass: ClassInfo | null;
  newClassName: string;
  setNewClassName: (name: string) => void;
  newStudentNames: string;
  setNewStudentNames: (names: string) => void;
  onSave: (e: React.FormEvent) => void;
}

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  editingClass,
  newClassName,
  setNewClassName,
  newStudentNames,
  setNewStudentNames,
  onSave,
}) => {
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingClass ? '编辑班级' : '添加新班级'}
            </h2>
            <form onSubmit={onSave} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">班级名称</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="例如: 初一 (1) 班"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">学生名单 (每行一个姓名)</label>
                <textarea
                  value={newStudentNames}
                  onChange={(e) => setNewStudentNames(e.target.value)}
                  placeholder="张三&#10;李四&#10;王五"
                  className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newClassName.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:bg-gray-300 disabled:shadow-none"
                >
                  保存班级
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
