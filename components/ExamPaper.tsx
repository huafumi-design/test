import React from 'react';
import { EXAM_CONTENT } from '../constants';

const ExamPaper: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] h-[80%] bg-white shadow-2xl overflow-hidden border border-gray-300 z-10 rotate-1">
      {/* Paper Header */}
      <div className="border-b-2 border-dashed border-gray-400 p-8 text-center bg-gray-50">
        <h1 className="text-3xl font-bold font-serif mb-2 text-black">绝密 ★ 启用前</h1>
        <h2 className="text-xl font-serif text-gray-800">2024年全国统一高难度智商测试卷</h2>
        <div className="flex justify-center gap-8 mt-4 text-sm font-mono text-gray-600">
          <span>姓名: ___________</span>
          <span>准考证号: ___________</span>
        </div>
      </div>

      {/* Paper Content */}
      <div className="p-10 font-serif text-gray-900 leading-relaxed text-lg overflow-hidden h-full relative">
        <div className="whitespace-pre-wrap">{EXAM_CONTENT}</div>
        
        {/* Red stamp */}
        <div className="absolute top-20 right-20 w-32 h-32 border-4 border-red-700 rounded-full flex items-center justify-center opacity-60 rotate-[-15deg] pointer-events-none">
          <span className="text-red-700 font-bold text-xl">教务处</span>
        </div>
      </div>
    </div>
  );
};

export default ExamPaper;