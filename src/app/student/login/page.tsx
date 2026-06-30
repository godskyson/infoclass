'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToStudents, loginStudent, subscribeToConfig } from '../../../lib/store';
import { Student, ExamConfig } from '../../../lib/types';
import ClassMap from '../../../components/ClassMap';
import { User, IdCard, Armchair, ChevronRight } from 'lucide-react';

export default function StudentLoginPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [config, setConfig] = useState<ExamConfig | null>(null);
  
  // 입력 폼 필드
  const [selectedSeatId, setSelectedSeatId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 1. 학생 실시간 구독 및 시험 설정 구독
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

  // 2. 이미 로그인되어 있는지 체크
  useEffect(() => {
    const loggedInSeat = sessionStorage.getItem('student_seat_id');
    if (loggedInSeat) {
      router.push('/student/input');
    }
  }, [router]);

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeatId(seatId);
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedSeatId) {
      setError('자리를 선택해주세요.');
      return;
    }
    if (!studentId.trim()) {
      setError('학번을 입력해주세요 (예: 30415).');
      return;
    }
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    // 학번 형식 검증 (선택적)
    if (!/^\d{5}$/.test(studentId.trim())) {
      setError('학번은 5자리 숫자여야 합니다 (예: 30415).');
      return;
    }

    // 이미 다른 학생이 해당 자리에 로그인했는지 재확인
    const targetSeat = students.find(s => s.seatId === selectedSeatId);
    if (targetSeat && targetSeat.studentId) {
      setError('이미 선택된 자리입니다. 다른 자리를 선택해주세요.');
      return;
    }

    // 학번 중복 로그인 검사
    const isIdDuplicate = students.some(s => s.studentId === studentId.trim());
    if (isIdDuplicate) {
      setError('이미 로그인된 학번입니다.');
      return;
    }

    try {
      setLoading(true);
      await loginStudent(selectedSeatId, studentId.trim(), name.trim());
      
      // 세션 세팅
      sessionStorage.setItem('student_seat_id', selectedSeatId);
      sessionStorage.setItem('student_id', studentId.trim());
      sessionStorage.setItem('student_name', name.trim());
      
      router.push('/student/input');
    } catch (err) {
      console.error(err);
      setError('로그인 처리 중 에러가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getReadableSeatName = (seatId: string) => {
    const match = seatId.match(/^seat_(\d+)_(\d+)_(left|right)$/);
    if (!match) return '';
    const row = parseInt(match[1]) + 1;
    const col = parseInt(match[2]) + 1;
    const side = match[3] === 'left' ? '왼쪽' : '오른쪽';
    return `책상 ${row}-${col} (${side} 좌석)`;
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-pink-50/20 to-slate-100 text-slate-800 flex flex-col">
      {/* 상단 헤더 */}
      <header className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-200/80 gap-4">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2.5">
            <img 
              src="/image.png" 
              className="w-6 h-6 rounded-md object-cover border border-slate-200/60 shadow-3xs" 
              alt="로고" 
            />
            <span className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider">
              Student System
            </span>
            <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full"></span>
            <span className="text-xs font-medium text-slate-500">수행평가 응시 시스템</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight mt-1.5 text-slate-900">
            {config.title}
          </h1>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-xs text-slate-600 hover:text-slate-900 transition bg-white hover:bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 shadow-2xs"
        >
          메인 포탈로 이동
        </button>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* 왼쪽: 좌석 선택도 */}
        <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-6 shadow-md flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
              <Armchair className="w-5 h-5 text-indigo-500" /> 본인의 자리 선택
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              교실 배치도를 참고하여 자신이 앉은 자리를 클릭해 주세요. 이미 선택된 자리는 회색으로 표시됩니다.
            </p>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
            <ClassMap 
              students={students} 
              mode="login" 
              selectedSeatId={selectedSeatId}
              onSelectSeat={handleSeatSelect}
            />
          </div>
        </div>

        {/* 오른쪽: 로그인 폼 */}
        <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
          
          {/* 시험 상태 알림 */}
          {!config.isActive && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
              <h3 className="font-bold text-sm">⚠️ 시험 대기 중</h3>
              <p className="text-xs leading-relaxed opacity-90">
                수행평가가 아직 시작되지 않았거나 비활성화 상태입니다. 선생님이 시험을 시작하기 전까지는 로그인을 하더라도 대기 상태로 유지됩니다.
              </p>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-6 shadow-md flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-slate-850">인적사항 입력</h2>
              <p className="text-xs text-slate-500 mt-1">
                자리를 선택하고 학번과 이름을 입력한 뒤 접속해 주세요.
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              {/* 자리 확인 필드 */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  선택한 자리
                </label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
                  <Armchair className="w-4 h-4 text-indigo-500" />
                  <span className={selectedSeatId ? "text-indigo-600 font-bold" : "text-slate-400"}>
                    {selectedSeatId ? getReadableSeatName(selectedSeatId) : '좌석을 선택해 주세요'}
                  </span>
                </div>
              </div>

              {/* 학번 필드 */}
              <div>
                <label htmlFor="studentId" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  학번 (5자리)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <IdCard className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="예: 30101"
                    maxLength={5}
                    disabled={!config.isActive || loading}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-slate-400 transition outline-none text-slate-800 font-mono"
                  />
                </div>
                <span className="text-3xs text-slate-450 mt-1 block">학년-반-번호를 차례로 입력 (예: 3학년 1반 1번 {"->"} 30101)</span>
              </div>

              {/* 이름 필드 */}
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  이름
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    disabled={!config.isActive || loading}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-slate-400 transition outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 px-3.5 py-2.5 rounded-lg flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-rose-500 rounded-full shrink-0"></span>
                  {error}
                </div>
              )}

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={!config.isActive || loading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-indigo-100 disabled:shadow-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    수행평가 시작하기 <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </main>

      {/* 하단 푸터 */}
      <footer className="w-full border-t border-slate-200/80 py-4 bg-white/40 text-center text-xs text-slate-400 mt-auto">
        &copy; {new Date().getFullYear()} 수행평가 모니터링 시스템. All rights reserved.
      </footer>
    </div>
  );
}
