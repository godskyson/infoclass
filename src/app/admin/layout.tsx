'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, FileText, Settings, ShieldCheck } from 'lucide-react';
import { subscribeToStudents, subscribeToConfig } from '../../lib/store';
import { Student, ExamConfig } from '../../lib/types';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [config, setConfig] = useState<ExamConfig | null>(null);

  useEffect(() => {
    const unsubStudents = subscribeToStudents((data) => {
      setStudents(data);
    });

    const unsubConfig = subscribeToConfig((data) => {
      setConfig(data);
    });

    return () => {
      unsubStudents();
      unsubConfig();
    };
  }, []);

  const navItems = [
    {
      name: '실시간 모니터링',
      href: '/admin',
      icon: Activity,
    },
    {
      name: '제출 정보 확인',
      href: '/admin/submissions',
      icon: FileText,
    },
    {
      name: '학생 및 시험 관리',
      href: '/admin/management',
      icon: Settings,
    },
  ];

  // 전체 통계 계산
  const totalSeats = 24;
  const loggedInStudents = students.filter(s => s.studentId !== '');
  const activeCount = loggedInStudents.filter(s => s.status === 'active' && !s.submitted).length;
  const idleCount = loggedInStudents.filter(s => s.status === 'idle' && !s.submitted).length;
  const tabLeftCount = loggedInStudents.filter(s => s.status === 'tab-left' && !s.submitted).length;
  const submittedCount = loggedInStudents.filter(s => s.submitted).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* 관리자 헤더 */}
      <header className="bg-white/80 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img 
              src="/image.png" 
              className="w-9 h-9 rounded-xl object-cover border border-slate-200/60 shadow-md" 
              alt="로고" 
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-slate-900">수행평가 감독관 포탈</h1>
                <span className="text-3xs px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {config ? config.title : '설정을 불러오는 중...'}
              </p>
            </div>
          </div>

          {/* 간략 실시간 요약 스태츠 */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-2xs font-medium shadow-2xs">
            <span className="px-2.5 py-1 rounded bg-white text-slate-600 border border-slate-200/60 shadow-3xs">
              접속: <strong className="text-slate-800 font-bold">{loggedInStudents.length}</strong> / {totalSeats}
            </span>
            <span className="h-4 w-px bg-slate-200"></span>
            <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-100/50 text-emerald-700">
              입력중: <strong>{activeCount}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-amber-50 border border-amber-100/50 text-amber-700">
              미입력: <strong>{idleCount}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-rose-50 border border-rose-100/50 text-rose-700 animate-pulse">
              화면이탈: <strong>{tabLeftCount}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-blue-50 border border-blue-100/50 text-blue-700">
              제출: <strong>{submittedCount}</strong>
            </span>
          </div>

          <button
            onClick={() => router.push('/')}
            className="text-xs text-slate-600 hover:text-slate-900 transition bg-white hover:bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 shadow-2xs"
          >
            포탈 메인
          </button>
        </div>
      </header>

      {/* 네비게이션 탭 */}
      <nav className="bg-white border-b border-slate-200 py-1">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold transition border-b-2
                  ${isActive 
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/20' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* 하단 푸터 */}
      <footer className="w-full border-t border-slate-200/80 py-4 bg-white/40 text-center text-xs text-slate-400 mt-auto">
        &copy; {new Date().getFullYear()} 수행평가 모니터링 시스템 (관리자 모드). All rights reserved.
      </footer>
    </div>
  );
}
