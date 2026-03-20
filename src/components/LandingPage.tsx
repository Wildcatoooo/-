/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Users } from 'lucide-react';

interface LandingPageProps {
  onSelectView: (view: 'teacher' | 'student') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectView('teacher')}
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
          onClick={() => onSelectView('student')}
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
};
