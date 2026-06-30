'use client';

import React, { useState, useEffect } from 'react';
import { subscribeToStudents, logoutStudent, submitExam } from '../../lib/store';
import { Student } from '../../lib/types';
import ClassMap from '../../components/ClassMap';
import { 
  AlertTriangle, 
  Monitor, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  LogOut 
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 1. 실시간 학생 데이터 구독
  useEffect(() => {
    const unsubscribe = subscribeToStudents((data) => {
      setStudents(data);
      // 모달창이 열려있는 경우, 열려있는 학생의 실시간 상태도 실시간으로 반영
      setSelectedStudent(prev => {
        if (!prev) return null;
        const updated = data.find(s => s.seatId === prev.seatId);
        return updated || null;
      });
    });
    return () => unsubscribe();
  }, []);

  // 2. 모달 상세 조작 처리
  const handleForceLogout = async (seatId: string) => {
    if (window.confirm('이 학생을 강제로 로그아웃(자리 초기화) 처리하시겠습니까? 현재 작성중인 데이터는 보존되지 않을 수 있습니다.')) {
      await logoutStudent(seatId);
      setSelectedStudent(null);
    }
  };

  const handleForceSubmit = async (seatId: string) => {
    if (window.confirm('이 학생의 수행평가를 강제 제출 완료 처리하시겠습니까? 제출 후에는 더 이상 수정할 수 없으며 오프라인 처리됩니다.')) {
      await submitExam(seatId);
      setSelectedStudent(null);
    }
  };

  const getSeatPositionName = (seatId: string) => {
    const match = seatId.match(/^seat_(\d+)_(\d+)_(left|right)$/);
    if (!match) return '';
    const row = parseInt(match[1]) + 1;
    const col = parseInt(match[2]) + 1;
    const side = match[3] === 'left' ? '왼쪽' : '오른쪽';
    return `${row}행 ${col}열 - ${side} 책상`;
  };

  // 3. 최근 이탈 감지 경고 데이터 추출 (warningsCount가 높은 순 및 최근 이탈 시간 순)
  const alertStudents = students
    .filter(s => s.studentId && s.warningsCount > 0)
    .sort((a, b) => (b.lastWarningAt || 0) - (a.lastWarningAt || 0))
    .slice(0, 10); // 최근 10개만 표시

  // 4. 모니터링 통계 요약 데이터
  const registeredCount = students.filter(s => s.studentId).length;
  const activeCount = students.filter(s => s.status === 'active' && s.studentId && !s.submitted).length;
  const idleCount = students.filter(s => s.status === 'idle' && s.studentId && !s.submitted).length;
  const tabLeftCount = students.filter(s => s.status === 'tab-left' && s.studentId && !s.submitted).length;

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      
      {/* 왼쪽: 좌석 맵 & 메인 보드 */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* 설명 범례 바 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
            <h2 className="text-sm font-bold text-slate-800">모니터링 범례</h2>
          </div>
          
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3.5 h-3.5 rounded bg-slate-50 border border-dashed border-slate-350 block"></span>
              빈자리/비활성
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-250 block animate-pulse"></span>
              정상 입력 중
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-3.5 h-3.5 rounded bg-amber-50 border border-amber-250 block"></span>
              30초 미입력 (Idle)
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-3.5 h-3.5 rounded bg-rose-50 border border-rose-250 block animate-bounce"></span>
              화면 이탈 경고
            </span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-3.5 h-3.5 rounded bg-blue-50 border border-blue-250 block"></span>
              제출 완료
            </span>
          </div>
        </div>

        {/* 3x4 2인 교실 맵 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex-1 flex flex-col justify-center">
          <ClassMap 
            students={students} 
            mode="admin" 
            onSeatClick={(s) => setSelectedStudent(s)} 
          />
        </div>
      </div>

      {/* 오른쪽: 최근 경고 로그 사이드바 */}
      <div className="w-full xl:w-96 shrink-0 flex flex-col gap-6">
        
        {/* 대시보드 상태 요약 카드 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
            실시간 응시 현황
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex flex-col shadow-3xs">
              <span className="text-3xs text-slate-400 font-semibold uppercase">총 등록 인원</span>
              <strong className="text-xl text-slate-800 font-extrabold font-mono mt-1">{registeredCount}명</strong>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex flex-col shadow-3xs">
              <span className="text-3xs text-emerald-600 font-semibold uppercase">현재 입력 중</span>
              <strong className="text-xl text-emerald-600 font-extrabold font-mono mt-1">{activeCount}명</strong>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex flex-col shadow-3xs">
              <span className="text-3xs text-amber-600 font-semibold uppercase">현재 미입력</span>
              <strong className="text-xl text-amber-600 font-extrabold font-mono mt-1">{idleCount}명</strong>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex flex-col shadow-3xs">
              <span className="text-3xs text-rose-600 font-semibold uppercase">현재 화면이탈</span>
              <strong className="text-xl text-rose-600 font-extrabold font-mono mt-1 animate-pulse">{tabLeftCount}명</strong>
            </div>
          </div>
        </div>

        {/* 실시간 이탈 알림 피드 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex-1 flex flex-col min-h-[300px]">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> 실시간 이탈 감지 알림
          </h3>
          
          <div className="flex-1 overflow-y-auto max-h-[450px] flex flex-col gap-3 pr-1 scrollbar">
            {alertStudents.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-400 py-12">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/30 mb-2" />
                <p className="text-xs">현재 화면을 이탈한 학생이 없거나<br />이탈 기록이 깨끗합니다.</p>
              </div>
            ) : (
              alertStudents.map(student => (
                <div 
                  key={student.seatId}
                  onClick={() => setSelectedStudent(student)}
                  className={`
                    border rounded-xl p-3.5 transition cursor-pointer flex flex-col gap-1.5
                    ${student.status === 'tab-left'
                      ? 'bg-rose-50 border-rose-300 hover:border-rose-450 hover:bg-rose-100/30 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100'
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-slate-800">
                      {student.name} ({student.studentId})
                    </span>
                    <span className="text-3xs px-2 py-0.5 bg-rose-100 border border-rose-200 text-rose-700 rounded-full font-bold">
                      누적 {student.warningsCount}회 이탈
                    </span>
                  </div>

                  <div className="flex justify-between text-3xs text-slate-500 font-mono mt-1">
                    <span>{getSeatPositionName(student.seatId)}</span>
                    <span>
                      {student.lastWarningAt 
                        ? `최근: ${new Date(student.lastWarningAt).toLocaleTimeString()}`
                        : ''
                      }
                    </span>
                  </div>
                  
                  {student.status === 'tab-left' && (
                    <div className="text-3xs text-rose-600 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-100 mt-1 animate-pulse flex items-center gap-1 justify-center">
                      ⚠️ 현재 다른 화면(창)에 있습니다!
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 자리 클릭 시 상세 정보 모달 */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* 모달 헤더 */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">학생 실시간 상세 정보</h3>
                <p className="text-3xs text-slate-550 mt-0.5">{getSeatPositionName(selectedStudent.seatId)}</p>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="text-slate-650 hover:text-slate-900 transition text-sm bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-3xs"
              >
                닫기
              </button>
            </div>

            {/* 모달 바디 */}
            <div className="p-6 flex flex-col gap-5">
              
              {/* 인적사항 및 실시간 상태 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-3xs">
                  <span className="text-3xs text-slate-400 font-semibold block">학생 학번/이름</span>
                  <span className="font-bold text-sm text-slate-800 mt-1.5 block">
                    {selectedStudent.name ? `${selectedStudent.name} (${selectedStudent.studentId})` : '미로그인'}
                  </span>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-3xs">
                  <span className="text-3xs text-slate-400 font-semibold block">현재 상태</span>
                  <span className="font-bold text-sm mt-1.5 block">
                    {selectedStudent.submitted ? (
                      <span className="text-blue-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-blue-500" /> 제출 완료
                      </span>
                    ) : selectedStudent.status === 'active' ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Monitor className="w-4 h-4 text-emerald-500" /> 입력 중
                      </span>
                    ) : selectedStudent.status === 'idle' ? (
                      <span className="text-amber-600 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-amber-500" /> 미입력
                      </span>
                    ) : selectedStudent.status === 'tab-left' ? (
                      <span className="text-rose-600 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-rose-500" /> 화면 이탈함
                      </span>
                    ) : (
                      <span className="text-slate-400">오프라인</span>
                    )}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-3xs">
                  <span className="text-3xs text-slate-400 font-semibold block">화면 이탈 횟수</span>
                  <span className={`font-bold text-sm mt-1.5 block ${selectedStudent.warningsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {selectedStudent.warningsCount}회 이탈
                  </span>
                </div>
              </div>

              {/* 실시간 입력 본문 미리보기 */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-600">작성 내용 실시간 미리보기 (글자수: {selectedStudent.content?.length || 0}자)</span>
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 min-h-[160px] max-h-[220px] overflow-y-auto text-sm leading-relaxed text-slate-700 font-mono whitespace-pre-wrap">
                  {selectedStudent.content ? selectedStudent.content : (
                    <span className="text-slate-450 italic">아직 작성한 내용이 없습니다.</span>
                  )}
                </div>
              </div>

              {/* 최근 이탈 상세 기록 */}
              {selectedStudent.warningsCount > 0 && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-xl flex flex-col gap-1">
                  <div className="font-bold flex items-center gap-1 text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> 화면 이탈 경고 감지됨
                  </div>
                  <p className="text-rose-650">
                    최근 이탈 발생 시각: {selectedStudent.lastWarningAt ? new Date(selectedStudent.lastWarningAt).toLocaleString() : '-'}
                  </p>
                </div>
              )}

            </div>

            {/* 모달 푸터 / 관리자 제어 버튼 */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => handleForceLogout(selectedStudent.seatId)}
                  disabled={!selectedStudent.studentId}
                  className="bg-white hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 text-slate-600 border border-slate-200 hover:border-rose-200 font-semibold text-xs py-2.5 px-4 rounded-xl transition shadow-3xs"
                >
                  강제 로그아웃 (비우기)
                </button>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs py-2.5 px-5 rounded-xl border border-slate-200 transition shadow-3xs"
                >
                  확인
                </button>
                <button
                  onClick={() => handleForceSubmit(selectedStudent.seatId)}
                  disabled={!selectedStudent.studentId || selectedStudent.submitted}
                  className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition shadow-sm"
                >
                  강제 제출 완료 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
        }
        .scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 999px;
        }
        .scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
