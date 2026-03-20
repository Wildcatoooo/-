/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowRight, AlertCircle } from 'lucide-react';

interface StudentLoginProps {
  onLogin: (name: string) => void;
  error: string;
  onBack: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLogin, error, onBack }) => {
  const [name, setName] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onLogin(name);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-3xl shadow-sm border border-black/5 space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">学生登录</h2>
          <p className="text-gray-500">请输入您的真实姓名进入系统</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">学生姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 张三"
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-lg font-medium"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center space-x-3 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-black/10 flex items-center justify-center space-x-2 disabled:bg-gray-300 disabled:shadow-none"
          >
            <span>进入系统</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          返回角色选择
        </button>
      </motion.div>
    </div>
  );
};
