'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  updateStudent, 
  subscribeToStudents, 
  subscribeToConfig, 
  submitExam 
} from '../../../lib/store';
import { Student, ExamConfig } from '../../../lib/types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  LogOut, 
  Save, 
  Monitor, 
  FileText, 
  Clock 
} from 'lucide-react';

export default function StudentInputPage() {
  const router = useRouter();
  
  // 상태 변수
  const [student, setStudent] = useState<Student | null>(null);
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [text, setText] = useState<string>('');
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningCountInSession, setWarningCountInSession] = useState<number>(0);
  
  // Refs
  const seatIdRef = useRef<string | null>(null);
  const isTabActiveRef = useRef<boolean>(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningsCountRef = useRef<number>(0);

  // 1. 초기 로그인 세션 검증
  useEffect(() => {
    const seatId = sessionStorage.getItem('student_seat_id');
    if (!seatId) {
      router.push('/student/login');
      return;
    }
    seatIdRef.current = seatId;

    // 데이터 초기 로드 및 실시간 구독
    const unsubStudents = subscribeToStudents((students) => {
      const currentStudent = students.find(s => s.seatId === seatId);
      if (currentStudent) {
        setStudent(currentStudent);
        // 처음 한 번 또는 서버에 저장된 텍스트와 다르고 자신이 아직 입력 중일 때 동기화 (기존 텍스트 보존)
        // 단, 로컬 입력이 없을 때만 덮어씀
        setText(prev => {
          if (!prev && currentStudent.content) {
            return currentStudent.content;
          }
          return prev;
        });

        // 세션 내 이탈 횟수 업데이트
        setWarningCountInSession(currentStudent.warningsCount);
        warningsCountRef.current = currentStudent.warningsCount;

        // 만약 관리자에 의해 제출 완료 처리가 되었거나 이미 제출했다면
        if (currentStudent.submitted) {
          // 세션 클리어 후 종료
          sessionStorage.clear();
        }
      } else {
        // 학생 정보가 없으면 강제 로그아웃
        handleLogout();
      }
    });

    const unsubConfig = subscribeToConfig((configData) => {
      setConfig(configData);
    });

    return () => {
      unsubStudents();
      unsubConfig();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [router]);

  // 2. 실시간 상태 및 하트비트 주기적 전송 (3초 간격)
  useEffect(() => {
    if (!seatIdRef.current) return;

    const sendHeartbeat = async () => {
      if (!seatIdRef.current || !isTabActiveRef.current) return;
      
      // 현재 로컬 탭이 액티브 상태인 경우 서버에 하트비트 전송
      await updateStudent(seatIdRef.current, {
        lastActive: Date.now(),
        // 탭이 액티브면 active 혹은 idle 상태 유지
        status: document.hasFocus() && isTabActiveRef.current ? (idleTimerRef.current ? 'active' : 'idle') : 'tab-left'
      });
    };

    // 하트비트 시작
    heartbeatTimerRef.current = setInterval(sendHeartbeat, 3000);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, []);

  // 3. 화면 이탈 감지 시스템 (Visibility API, Focus/Blur)
  useEffect(() => {
    if (!seatIdRef.current) return;

    const reportTabLeft = async () => {
      if (!seatIdRef.current || !isTabActiveRef.current) return;
      
      isTabActiveRef.current = false;
      
      // 1. 타이머 클리어
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      // 2. 경고 횟수 증가 및 상태를 'tab-left'로 업데이트
      const nextWarnings = warningsCountRef.current + 1;
      warningsCountRef.current = nextWarnings;
      
      await updateStudent(seatIdRef.current, {
        status: 'tab-left',
        warningsCount: nextWarnings,
        lastWarningAt: Date.now()
      });

      // 3. 로컬 알림 모달 띄우기
      setShowWarningModal(true);
    };

    const reportTabActive = async () => {
      if (!seatIdRef.current || isTabActiveRef.current) return;
      
      isTabActiveRef.current = true;
      resetIdleTimer(); // 복귀 후 미입력 타이머 재설정
      
      await updateStudent(seatIdRef.current, {
        status: 'active',
        lastActive: Date.now()
      });
    };

    // 포커스/비지빌리티 이벤트 핸들러
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportTabLeft();
      } else {
        // 사용자가 다시 탭으로 돌아왔을 때
        reportTabActive();
      }
    };

    const handleWindowBlur = () => {
      reportTabLeft();
    };

    const handleWindowFocus = () => {
      reportTabActive();
    };

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // 4. 미입력(Idle) 30초 감지 타이머
  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    // 사용자가 입력 중이므로 status를 'active'로 설정 (만약 이전이 idle이었으면 업데이트)
    if (student && student.status === 'idle' && seatIdRef.current) {
      updateStudent(seatIdRef.current, { status: 'active', lastActive: Date.now() });
    }

    idleTimerRef.current = setTimeout(async () => {
      if (seatIdRef.current && isTabActiveRef.current) {
        idleTimerRef.current = null;
        await updateStudent(seatIdRef.current, {
          status: 'idle'
        });
      }
    }, 30000); // 30초 미입력 시 idle
  };

  // 5. 텍스트 변경 핸들러 (Debounced Auto-save)
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    setAutosaveStatus('saving');
    
    // 미입력 타이머 갱신
    resetIdleTimer();

    // 디바운싱: 입력이 멈추고 800ms 후에 서버에 자동 저장
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(async () => {
      if (seatIdRef.current) {
        try {
          await updateStudent(seatIdRef.current, {
            content: value,
            lastActive: Date.now()
          });
          setAutosaveStatus('saved');
        } catch (err) {
          console.error('Autosave failed:', err);
          setAutosaveStatus('error');
        }
      }
    }, 800);
  };

  // 6. 로그아웃 / 자리 비우기
  const handleLogout = async () => {
    if (seatIdRef.current) {
      // 오프라인 상태로 리셋
      await updateStudent(seatIdRef.current, {
        studentId: '',
        name: '',
        status: 'offline',
        lastActive: 0,
        content: '',
        submitted: false,
        warningsCount: 0
      });
    }
    sessionStorage.clear();
    router.push('/student/login');
  };

  // 7. 최종 제출
  const handleSubmit = async () => {
    if (!window.confirm('수행평가 답안을 최종 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.')) {
      return;
    }

    if (seatIdRef.current) {
      try {
        setAutosaveStatus('saving');
        // 먼저 작성한 텍스트 최종 업데이트
        await updateStudent(seatIdRef.current, {
          content: text,
          lastActive: Date.now()
        });
        
        // 최종 제출 API 실행
        await submitExam(seatIdRef.current);
        setAutosaveStatus('saved');
        
        // 제출 성공 알림 후 로그인 화면으로 이동
        alert('수행평가 답안이 정상적으로 제출되었습니다. 수고하셨습니다!');
        sessionStorage.clear();
        router.push('/student/login');
      } catch (err) {
        console.error(err);
        alert('제출 처리 중 에러가 발생했습니다. 네트워크 상태를 확인해 주세요.');
        setAutosaveStatus('error');
      }
    }
  };

  // 경고 창 닫기
  const closeWarningModal = () => {
    setShowWarningModal(false);
  };

  // 8. 렌더링 검사
  if (!student || !config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4 text-slate-500">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-sm">학적 정보를 로드하는 중입니다...</p>
      </div>
    );
  }

  // 만약 이미 제출된 학생 정보라면 (다른 탭 등에서 완료된 경우)
  if (student.submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-8 text-center shadow-lg flex flex-col items-center gap-5">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-155/30 text-emerald-555 rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">제출 완료</h1>
            <p className="text-sm text-slate-500 mt-2">
              본 수행평가는 성공적으로 최종 제출되었습니다.
            </p>
          </div>
          <div className="w-full bg-slate-50 p-4 rounded-xl text-left border border-slate-200 font-mono text-xs text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-2 mb-2 font-semibold">
              <span>학생명</span>
              <span>{student.name} ({student.studentId})</span>
            </div>
            <div className="flex justify-between">
              <span>제출 시각</span>
              <span>{student.submittedAt ? new Date(student.submittedAt).toLocaleString() : '-'}</span>
            </div>
          </div>
          <button
            onClick={() => {
              sessionStorage.clear();
              router.push('/student/login');
            }}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition shadow-xs"
          >
            로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 시험 일시정지 상태일 때
  if (!config.isActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-8 text-center shadow-lg flex flex-col items-center gap-5">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center shadow-sm animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">수행평가 대기 및 정지</h1>
            <p className="text-sm text-slate-500 mt-2">
              선생님에 의해 수행평가가 일시 정지되었거나 아직 시작되지 않았습니다. 잠시만 대기해 주세요.
            </p>
          </div>
          <div className="w-full bg-slate-50 p-4 rounded-xl text-left border border-slate-200 text-xs text-slate-650 flex flex-col gap-2">
            <p>※ 입력창은 정지 상태가 풀릴 때까지 잠금 처리됩니다.</p>
            <p>※ 현재까지 작성한 내용은 모두 안전하게 자동 저장되어 있습니다.</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 border border-slate-200"
          >
            <LogOut className="w-4 h-4" /> 로그아웃 (자리 비우기)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* 이탈 방지 모달 (경고 오버레이) */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-rose-300 max-w-lg w-full rounded-2xl p-8 text-center shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-500 rounded-full flex items-center justify-center shadow-sm animate-bounce">
              <AlertTriangle className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">⚠️ 화면 이탈 경고</h2>
              <p className="text-sm text-rose-700 font-semibold mt-3">
                수행평가 도중 브라우저 창을 벗어나거나 화면을 이탈했습니다!
              </p>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                해당 이탈 기록(이탈 횟수 및 시각)은 **실시간으로 감독관(선생님) 화면에 전송 및 기록**됩니다. 고의적인 화면 이탈은 불이익을 받을 수 있습니다.
              </p>
            </div>

            <div className="w-full bg-rose-50 border border-rose-100 py-2.5 px-4 rounded-xl flex justify-between items-center text-sm">
              <span className="text-slate-600 font-medium">현재 누적 이탈 횟수</span>
              <span className="text-rose-600 font-extrabold font-mono text-lg">{warningCountInSession}회</span>
            </div>

            <button
              onClick={closeWarningModal}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3.5 rounded-xl transition duration-150 shadow-md"
            >
              네, 인지하였으며 시험으로 복귀합니다
            </button>
          </div>
        </div>
      )}

      {/* 상단 네비게이션 바 */}
      <header className="w-full bg-white/80 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="/image.png" 
              className="w-7 h-7 rounded-md object-cover border border-slate-200/60 shadow-3xs" 
              alt="로고" 
            />
            <h1 className="font-extrabold text-base md:text-lg text-slate-800 truncate max-w-xs sm:max-w-md">
              {config.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {/* 상태 인디케이터 */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute"></span>
              <span className="text-2xs text-slate-500 font-medium">모니터링 활성화됨</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs text-slate-600 hover:text-rose-650 transition bg-white hover:bg-rose-50 px-3 py-2 rounded-lg border border-slate-200 hover:border-rose-200 flex items-center gap-1.5 shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" /> 자리 비우기
            </button>
          </div>
        </div>
      </header>

      {/* 서브 바: 학생 정보 및 자동 저장 상태 */}
      <section className="bg-slate-100/50 border-b border-slate-200/40 py-3">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <div>
              <span className="text-slate-400 mr-1.5">학번:</span>
              <strong className="font-mono text-indigo-600 font-semibold">{student.studentId}</strong>
            </div>
            <div className="hidden sm:block text-slate-350 text-slate-200">|</div>
            <div>
              <span className="text-slate-400 mr-1.5">이름:</span>
              <strong className="text-indigo-600 font-semibold">{student.name}</strong>
            </div>
            <div className="hidden sm:block text-slate-350 text-slate-200">|</div>
            <div>
              <span className="text-slate-400 mr-1.5">좌석:</span>
              <strong className="text-indigo-600 font-semibold">
                {parseInt(student.seatId.split('_')[1]) + 1}행 {parseInt(student.seatId.split('_')[2]) + 1}열 ({student.seatId.split('_')[3] === 'left' ? '왼쪽' : '오른쪽'})
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            {/* 자동저장 아이콘 */}
            <div className="flex items-center gap-1.5 font-medium">
              {autosaveStatus === 'saving' && (
                <span className="text-indigo-500 flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  서버에 저장 중...
                </span>
              )}
              {autosaveStatus === 'saved' && (
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> 서버에 실시간 저장됨
                </span>
              )}
              {autosaveStatus === 'error' && (
                <span className="text-rose-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> 저장 실패 (재시도 중)
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 메인 에디터 영역 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col gap-4">
        
        {/* 상단 안내 경고 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
          <Monitor className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-800">※ 주의사항:</strong> 수행평가가 완료될 때까지 **브라우저 창이나 탭을 끄지 마십시오.** 또한 인터넷 브라우저 화면을 절대 벗어나지 마십시오. 다른 사이트를 조회하거나, 메신저를 켜거나, 창을 내릴 경우 모니터링 시스템에서 즉시 감지되어 부정행위 경고가 누적됩니다.
          </div>
        </div>

        {/* 텍스트 입력창 카드 */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {/* 입력창 헤더 */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-slate-550 uppercase tracking-wider">
              수행평가 작성 패널
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
              <span>글자수: <strong className="text-indigo-600 font-semibold">{text.length}자</strong></span>
              <span>|</span>
              <span>공백 제외: <strong className="text-indigo-600 font-semibold">{text.replace(/\s/g, '').length}자</strong></span>
            </div>
          </div>

          {/* 에디터 텍스트 영역 */}
          <div className="flex-1 relative bg-white">
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="여기에 수행평가 답안 내용을 작성하세요. 작성하신 내용은 실시간으로 관리자(선생님) 화면에 전송되며 자동 저장되므로 따로 저장 버튼을 누르지 않으셔도 됩니다."
              className="w-full h-full min-h-[350px] bg-transparent p-6 text-slate-800 placeholder-slate-400 focus:outline-none resize-none leading-relaxed text-sm md:text-base border-none font-sans"
              disabled={autosaveStatus === 'saving' && text.length === 0}
            />
          </div>

          {/* 하단 제어바 */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex justify-between items-center shrink-0 gap-4">
            <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-555" /> 
              <span>본인 화면 이탈 횟수: {warningCountInSession}회</span>
            </div>
            
            <button
              onClick={handleSubmit}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-sm py-2.5 px-6 rounded-xl transition duration-150 flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> 최종 답안 제출
            </button>
          </div>
        </div>

      </main>

      {/* 하단 푸터 */}
      <footer className="w-full border-t border-slate-200/80 py-4 bg-white/40 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} 수행평가 모니터링 시스템. All rights reserved.
      </footer>
    </div>
  );
}
