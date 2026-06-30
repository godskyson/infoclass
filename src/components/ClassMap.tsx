import React from 'react';
import { Student, ROWS, COLS, POSITIONS, parseSeatId } from '../lib/types';
import { Monitor, User, AlertTriangle, CheckCircle2, UserX } from 'lucide-react';

interface ClassMapProps {
  students: Student[];
  mode: 'login' | 'admin';
  selectedSeatId?: string;
  onSelectSeat?: (seatId: string) => void;
  onSeatClick?: (student: Student) => void;
}

export default function ClassMap({
  students,
  mode,
  selectedSeatId,
  onSelectSeat,
  onSeatClick
}: ClassMapProps) {
  // 학생 데이터 맵핑 (seatId -> Student)
  const studentMap = new Map<string, Student>();
  students.forEach(student => {
    studentMap.set(student.seatId, student);
  });

  // 상태별 스타일 정의
  const getSeatStyle = (student?: Student, isSelected?: boolean) => {
    if (mode === 'login') {
      const isOccupied = student && student.studentId !== '';
      if (isOccupied) {
        return 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed';
      }
      if (isSelected) {
        return 'bg-indigo-500 text-white border-indigo-500 ring-4 ring-indigo-100 scale-105 shadow-md cursor-pointer';
      }
      return 'bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-700 hover:border-indigo-300 scale-100 cursor-pointer';
    }

    // 관리자 모드
    if (!student || student.studentId === '') {
      return 'bg-slate-50 border-dashed border-slate-300 text-slate-400 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900/50 cursor-pointer';
    }

    if (student.submitted) {
      return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/40 cursor-pointer';
    }

    switch (student.status) {
      case 'active':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 ring-2 ring-emerald-400 dark:ring-emerald-500 animate-pulse-slow cursor-pointer';
      case 'idle':
        return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 cursor-pointer';
      case 'tab-left':
        return 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 ring-2 ring-rose-500 dark:ring-rose-500 animate-bounce-subtle cursor-pointer';
      case 'offline':
      default:
        return 'bg-slate-100 border-slate-300 text-slate-500 dark:bg-slate-800/40 dark:border-slate-700/50 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/60 cursor-pointer';
    }
  };

  const getStatusBadge = (student?: Student) => {
    if (!student || student.studentId === '') return null;
    if (student.submitted) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/55 dark:text-blue-200">
          <CheckCircle2 className="w-3 h-3 mr-0.5" /> 제출완료
        </span>
      );
    }
    switch (student.status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/55 dark:text-emerald-200">
            <Monitor className="w-3 h-3 mr-0.5" /> 입력중
          </span>
        );
      case 'idle':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/55 dark:text-amber-200">
            <UserX className="w-3 h-3 mr-0.5" /> 미입력
          </span>
        );
      case 'tab-left':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/55 dark:text-rose-200 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-0.5" /> 화면이탈
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            오프라인
          </span>
        );
    }
  };

  const desks: React.ReactNode[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      desks.push(
        <div 
          key={`desk_${r}_${c}`} 
          className="border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 bg-slate-50/60 dark:bg-slate-900/40 shadow-sm flex flex-col gap-2.5 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
        >
          {/* 책상 번호 표시 */}
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
            <span>책상 {r + 1}-{c + 1}</span>
            <div className="w-8 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          </div>

          {/* 2인 좌석 배치 */}
          <div className="grid grid-cols-2 gap-2">
            {POSITIONS.map(pos => {
              const seatId = `seat_${r}_${c}_${pos}`;
              const student = studentMap.get(seatId);
              const isSelected = selectedSeatId === seatId;
              const isOccupied = student && student.studentId !== '';

              const handleSeatClick = () => {
                if (mode === 'login') {
                  if (!isOccupied && onSelectSeat) {
                    onSelectSeat(seatId);
                  }
                } else {
                  if (onSeatClick && student) {
                    onSeatClick(student);
                  }
                }
              };

              return (
                <button
                  key={seatId}
                  type="button"
                  onClick={handleSeatClick}
                  disabled={mode === 'login' && isOccupied}
                  className={`
                    flex flex-col items-center justify-between p-3 rounded-lg border text-center transition-all duration-200 min-h-[96px]
                    ${getSeatStyle(student, isSelected)}
                  `}
                >
                  <div className="text-2xs font-medium opacity-80 uppercase tracking-wider mb-1">
                    {pos === 'left' ? '왼쪽' : '오른쪽'}
                  </div>

                  {student && student.studentId ? (
                    <div className="flex-1 flex flex-col justify-center my-1.5 w-full">
                      <div className="font-bold text-sm truncate max-w-full px-0.5">
                        {student.name}
                      </div>
                      <div className="text-2xs font-mono opacity-80 mt-0.5">
                        {student.studentId}
                      </div>
                      {student.warningsCount > 0 && !student.submitted && (
                        <div className="text-3xs text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center justify-center gap-0.5 bg-rose-100/40 dark:bg-rose-950/30 rounded py-0.5 px-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> 이탈 {student.warningsCount}회
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center my-1.5 text-slate-400 dark:text-slate-600">
                      <User className="w-5 h-5 opacity-60 mb-0.5" />
                      <span className="text-2xs">빈 자리</span>
                    </div>
                  )}

                  <div className="w-full mt-1 flex justify-center">
                    {getStatusBadge(student)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 칠판/교단 표시 (교실 느낌 극대화) */}
      <div className="w-full flex flex-col items-center mb-2">
        <div className="w-2/3 md:w-1/2 bg-slate-700 dark:bg-slate-800 text-white dark:text-slate-200 text-center py-2 px-6 rounded-b-xl shadow-sm text-xs font-bold tracking-widest relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 rounded-b"></div>
          [ 교 탁 / 칠 판 ]
        </div>
        <div className="text-2xs text-slate-400 mt-2 font-medium">▲ 앞쪽 교실 앞부분</div>
      </div>

      {/* 3x4 책상 그리드 배치 (2명씩 3x4로 가로 4열, 세로 3행) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {desks}
      </div>

      <style jsx global>{`
        .text-2xs {
          font-size: 0.7rem;
          line-height: 0.85rem;
        }
        .text-3xs {
          font-size: 0.6rem;
          line-height: 0.75rem;
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.92;
            transform: scale(0.99);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
