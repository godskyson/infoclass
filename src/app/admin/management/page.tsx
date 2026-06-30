'use client';

import React, { useState, useEffect } from 'react';
import { subscribeToStudents, subscribeToConfig, updateConfig, resetAllStudents, logoutStudent, submitExam } from '../../../lib/store';
import { Student, ExamConfig } from '../../../lib/types';
import { Settings, Play, Pause, Trash2, LogOut, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [config, setConfig] = useState<ExamConfig | null>(null);
  
  // 입력 폼 필드
  const [examTitle, setExamTitle] = useState<string>('');
  const [isUpdatingTitle, setIsUpdatingTitle] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // 1. 실시간 구독
  useEffect(() => {
    const unsubStudents = subscribeToStudents((data) => {
      // 로그인한 학생들만 학번 순 정렬
      const active = data
        .filter(s => s.studentId !== '')
        .sort((a, b) => a.studentId.localeCompare(b.studentId));
      setStudents(active);
    });

    const unsubConfig = subscribeToConfig((configData) => {
      setConfig(configData);
      setExamTitle(configData.title);
    });

    return () => {
      unsubStudents();
      unsubConfig();
    };
  }, []);

  // 2. 시험 상태 조작
  const handleToggleExamStatus = async () => {
    if (!config) return;
    const nextStatus = !config.isActive;
    
    if (nextStatus) {
      if (!window.confirm('수행평가를 활성화(시작)하시겠습니까? 학생들이 로그인을 하고 답안 입력을 시작할 수 있게 됩니다.')) return;
    } else {
      if (!window.confirm('수행평가를 비활성화(일시정지)하시겠습니까? 학생들의 입력창이 모두 정지되며 대기 상태로 들어갑니다. (작성된 내용은 안전하게 보존됩니다)')) return;
    }

    try {
      await updateConfig({ isActive: nextStatus });
    } catch (err) {
      console.error(err);
      alert('설정 변경 중 에러가 발생했습니다.');
    }
  };

  // 3. 시험 제목 변경
  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) return;

    try {
      setIsUpdatingTitle(true);
      await updateConfig({ title: examTitle.trim() });
      setSaveStatus('성공적으로 저장되었습니다.');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      alert('제목 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  // 4. 개별 조작 (킥, 강제 제출)
  const handleKick = async (seatId: string, name: string) => {
    if (window.confirm(`${name} 학생의 자리를 강제 로그아웃(초기화)하시겠습니까? 이 학생은 로그인 화면으로 튕기게 되며 자리가 비워집니다.`)) {
      await logoutStudent(seatId);
    }
  };

  const handleForceSubmit = async (seatId: string, name: string) => {
    if (window.confirm(`${name} 학생의 수행평가를 강제 제출 처리하시겠습니까? 제출 후에는 더 이상 수정할 수 없으며 오프라인 처리됩니다.`)) {
      await submitExam(seatId);
    }
  };

  // 5. 전체 초기화 (시험 리셋)
  const handleResetAll = async () => {
    if (!window.confirm('⚠️ 경고! 전체 데이터를 초기화하시겠습니까?\n\n모든 학생의 로그인 자리 정보, 입력중인 수행평가 텍스트, 경고 기록이 완전히 영구 삭제되며 빈 교실 상태가 됩니다. 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    const doubleConfirm = window.prompt('안전을 위해 초기화를 진행하려면 "초기화 승인"이라고 정확히 입력해 주세요.');
    if (doubleConfirm !== '초기화 승인') {
      alert('인증 문구가 올바르지 않아 초기화 작업이 취소되었습니다.');
      return;
    }

    try {
      await resetAllStudents();
      alert('성공적으로 모든 학생 데이터가 초기화되고 교실이 비워졌습니다.');
    } catch (err) {
      console.error(err);
      alert('초기화 작업 중 오류가 발생했습니다.');
    }
  };

  const getSeatPositionName = (seatId: string) => {
    const match = seatId.match(/^seat_(\d+)_(\d+)_(left|right)$/);
    if (!match) return '';
    const row = parseInt(match[1]) + 1;
    const col = parseInt(match[2]) + 1;
    const side = match[3] === 'left' ? '왼쪽' : '오른쪽';
    return `${row}행 ${col}열 (${side === '왼쪽' ? '좌' : '우'})`;
  };

  if (!config) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* 왼쪽 7칸: 시험 통제 & 설정 */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* 시험 활성화/비활성화 통제 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">시험 시작 및 정지 통제</h3>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-3xs">
            <div className="flex flex-col gap-1">
              <span className="text-2xs font-semibold text-slate-400">현재 시험 통제 상태</span>
              <strong className={`text-base ${config.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {config.isActive ? '🟢 활성화 상태 (학생 입력 가능)' : '🔴 비활성화 상태 (학생 입력 일시정지)'}
              </strong>
            </div>

            <button
              onClick={handleToggleExamStatus}
              className={`
                w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs transition duration-150 flex items-center justify-center gap-2 shadow-sm
                ${config.isActive 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }
              `}
            >
              {config.isActive ? (
                <>
                  <Pause className="w-4 h-4" /> 수행평가 일시정지
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> 수행평가 활성화/시작
                </>
              )}
            </button>
          </div>

          <p className="text-2xs text-slate-455 text-slate-500 leading-relaxed">
            ※ **일시정지 상태**로 설정하면 모든 학생 화면에 대기 오버레이 창이 생기며 입력을 할 수 없게 됩니다. 시험 도중 설명이 필요하거나 휴식 시간, 혹은 시험 종료 후 학생들의 입력 차단을 위해 사용할 수 있습니다.
          </p>
        </div>

        {/* 시험 타이틀 수정 폼 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">수행평가 기본 정보 수정</h3>
          </div>

          <form onSubmit={handleSaveTitle} className="flex flex-col gap-4">
            <div>
              <label htmlFor="examTitle" className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                수행평가 평가명 (타이틀)
              </label>
              <input
                type="text"
                id="examTitle"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="예: 3학년 2학기 수행평가"
                disabled={isUpdatingTitle}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-xs transition outline-none text-slate-800 placeholder-slate-400"
              />
            </div>

            {saveStatus && (
              <div className="text-3xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 rounded-lg">
                ✓ {saveStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingTitle || !examTitle.trim() || examTitle.trim() === config.title}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-405 text-white font-bold text-xs py-3 px-4 rounded-xl transition duration-150 self-end w-full sm:w-auto shadow-2xs"
            >
              {isUpdatingTitle ? '수정 중...' : '정보 저장하기'}
            </button>
          </form>
        </div>

        {/* 위험 구역 (전체 리셋) */}
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">위험 제어 구역 (Danger Zone)</h3>
          </div>

          <div className="bg-rose-50/50 border border-rose-100 p-4.5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <h4 className="font-bold text-xs text-rose-800">교실 전체 상태 리셋</h4>
              <p className="text-3xs text-slate-500 leading-relaxed">
                모든 학생의 로그인 연동을 해제하고, 작성 중이거나 제출된 모든 답안 및 경고 로그를 즉시 영구 삭제합니다.
              </p>
            </div>

            <button
              onClick={handleResetAll}
              className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-3 px-5 rounded-xl transition duration-150 flex items-center justify-center gap-2 shrink-0 shadow-sm shadow-rose-100"
            >
              <Trash2 className="w-4 h-4" /> 전체 데이터 초기화
            </button>
          </div>
        </div>

      </div>

      {/* 오른쪽 5칸: 접속 학생 관리 (킥, 로그아웃 제어) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex-1 flex flex-col min-h-[400px]">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
            응시 중인 학생 신속 제어 (총 {students.length}명)
          </h3>

          <div className="flex-1 overflow-y-auto max-h-[500px] flex flex-col gap-3 pr-1 scrollbar">
            {students.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-400 py-12">
                <ShieldCheck className="w-10 h-10 text-slate-300 mb-2.5" />
                <p className="text-xs">현재 로그인하여 시험을 치르고 있는<br />학생이 없습니다.</p>
              </div>
            ) : (
              students.map(student => (
                <div 
                  key={student.seatId}
                  className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-800">
                        {student.name} ({student.studentId})
                      </span>
                      {student.submitted ? (
                        <span className="text-4xs px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-bold">
                          제출됨
                        </span>
                      ) : (
                        <span className={`text-4xs px-1.5 py-0.5 rounded-full font-bold
                          ${student.status === 'active' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : ''}
                          ${student.status === 'idle' ? 'bg-amber-50 border border-amber-105 text-amber-700' : ''}
                          ${student.status === 'tab-left' ? 'bg-rose-50 border border-rose-100 text-rose-700 animate-pulse' : ''}
                          ${student.status === 'offline' ? 'bg-slate-100 border border-slate-200 text-slate-500' : ''}
                        `}>
                          {student.status === 'active' ? '입력중' : ''}
                          {student.status === 'idle' ? '미입력' : ''}
                          {student.status === 'tab-left' ? '화면이탈' : ''}
                          {student.status === 'offline' ? '오프라인' : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-3xs text-slate-500 font-medium">
                      자리: {getSeatPositionName(student.seatId)}
                    </span>
                  </div>

                  {/* 관리용 제어 버튼 */}
                  <div className="flex gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => handleKick(student.seatId, student.name)}
                      className="bg-white hover:bg-rose-50 hover:text-rose-650 border border-slate-200 hover:border-rose-200 text-slate-600 transition py-1.5 px-2.5 rounded-lg text-3xs font-semibold flex items-center gap-1 shadow-3xs"
                    >
                      <LogOut className="w-3 h-3" /> 강제종료
                    </button>
                    {!student.submitted && (
                      <button
                        onClick={() => handleForceSubmit(student.seatId, student.name)}
                        className="bg-indigo-50 hover:bg-indigo-500 hover:text-white border border-indigo-100 hover:border-indigo-500 text-indigo-650 transition py-1.5 px-2.5 rounded-lg text-3xs font-semibold flex items-center gap-1 shadow-3xs"
                      >
                        <CheckCircle2 className="w-3 h-3" /> 제출완료
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
