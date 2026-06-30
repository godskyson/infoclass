'use client';

import React, { useState, useEffect } from 'react';
import { subscribeToStudents } from '../../../lib/store';
import { Student } from '../../../lib/types';
import { Search, Copy, Download, FileText, CheckCircle2, AlertTriangle, Monitor, Clock, UserX } from 'lucide-react';

export default function AdminSubmissionsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [copiedSeatId, setCopiedSeatId] = useState<string | null>(null);

  // 1. 실시간 데이터 구독
  useEffect(() => {
    const unsubscribe = subscribeToStudents((data) => {
      // 로그인한 학생들만 정렬하여 저장 (학번 기준 오름차순)
      const activeStudents = data
        .filter(s => s.studentId !== '')
        .sort((a, b) => a.studentId.localeCompare(b.studentId));
      setStudents(activeStudents);
      
      // 선택된 학생의 실시간 텍스트 정보 동기화
      setSelectedStudent(prev => {
        if (!prev) return null;
        return activeStudents.find(s => s.seatId === prev.seatId) || null;
      });
    });
    return () => unsubscribe();
  }, []);

  // 2. 텍스트 복사 핸들러
  const handleCopyText = async (student: Student) => {
    if (!student.content) return;
    try {
      await navigator.clipboard.writeText(student.content);
      setCopiedSeatId(student.seatId);
      setTimeout(() => setCopiedSeatId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // 3. 파일 다운로드 핸들러
  const handleDownloadText = (student: Student) => {
    if (!student.content) return;
    const element = document.createElement("a");
    const file = new Blob([
      `학번: ${student.studentId}\n`,
      `이름: ${student.name}\n`,
      `제출일시: ${student.submittedAt ? new Date(student.submittedAt).toLocaleString() : '미제출 (작성중)'}\n`,
      `이탈횟수: ${student.warningsCount}회\n`,
      `----------------------------------------\n\n`,
      student.content
    ], { type: 'text/plain;charset=utf-8' });
    
    element.href = URL.createObjectURL(file);
    element.download = `${student.studentId}_${student.name}_수행평가.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 4. 전체 다운로드 핸들러 (모든 학생 답안을 하나의 텍스트 파일로 통합 다운로드)
  const handleDownloadAll = () => {
    const submittedOnes = filteredStudents.filter(s => s.content);
    if (submittedOnes.length === 0) {
      alert('다운로드할 답안이 존재하지 않습니다.');
      return;
    }

    let combinedText = `=== 수행평가 답안 취합 목록 (총 ${submittedOnes.length}명) ===\n`;
    combinedText += `일시: ${new Date().toLocaleString()}\n`;
    combinedText += `==================================================\n\n`;

    submittedOnes.forEach((student, index) => {
      combinedText += `[${index + 1}] 학번: ${student.studentId} | 이름: ${student.name}\n`;
      combinedText += `상태: ${student.submitted ? '제출 완료' : '작성 중'}\n`;
      combinedText += `이탈 횟수: ${student.warningsCount}회\n`;
      combinedText += `--------------------------------------------------\n`;
      combinedText += student.content;
      combinedText += `\n\n==================================================\n\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([combinedText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `전체학생_수행평가_답안취합.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 5. 검색 및 필터링 적용
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.includes(searchTerm) || 
      student.studentId.includes(searchTerm);
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'submitted') return matchesSearch && student.submitted;
    if (statusFilter === 'writing') return matchesSearch && !student.submitted;
    if (statusFilter === 'warning') return matchesSearch && student.warningsCount > 0;
    return matchesSearch;
  });

  const getSeatPositionName = (seatId: string) => {
    const match = seatId.match(/^seat_(\d+)_(\d+)_(left|right)$/);
    if (!match) return '';
    const row = parseInt(match[1]) + 1;
    const col = parseInt(match[2]) + 1;
    const side = match[3] === 'left' ? '왼쪽' : '오른쪽';
    return `${row}-${col} (${side === '왼쪽' ? '좌' : '우'})`;
  };

  const getStatusBadge = (student: Student) => {
    if (student.submitted) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 border border-blue-100 text-blue-700">
          제출완료
        </span>
      );
    }
    switch (student.status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-700">
            입력중
          </span>
        );
      case 'idle':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-50 border border-amber-100 text-amber-750 text-amber-700">
            미입력
          </span>
        );
      case 'tab-left':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-50 border border-rose-100 text-rose-700 animate-pulse">
            이탈발생
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 border border-slate-200 text-slate-500">
            오프라인
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* 왼쪽: 학생 리스트 테이블 */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
        
        {/* 필터 및 조작 영역 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> 작성 내용 관리 대시보드
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              현재 접속 중인 모든 학생들의 실시간 답안 분량과 제출 여부를 조회합니다.
            </p>
          </div>
          
          <button
            onClick={handleDownloadAll}
            disabled={filteredStudents.length === 0}
            className="w-full md:w-auto bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" /> 전체 답안 취합 다운로드 (.txt)
          </button>
        </div>

        {/* 검색창 & 필터 셀렉터 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 검색창 */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="학번 또는 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs transition outline-none text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 focus:border-indigo-500 text-xs rounded-xl px-4 py-2.5 outline-none transition text-slate-700"
          >
            <option value="all">모든 학생 상태</option>
            <option value="submitted">최종 제출 완료</option>
            <option value="writing">현재 작성 중</option>
            <option value="warning">이탈 경고 감지됨</option>
          </select>
        </div>

        {/* 테이블 뷰 */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-3xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-4 px-4">자리</th>
                <th className="py-4 px-4">학번</th>
                <th className="py-4 px-4">이름</th>
                <th className="py-4 px-4">상태</th>
                <th className="py-4 px-4">글자수</th>
                <th className="py-4 px-4 text-rose-600">이탈</th>
                <th className="py-4 px-4 text-right">조작</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    일치하는 학생 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr 
                    key={student.seatId}
                    className={`
                      hover:bg-slate-50/50 transition
                      ${selectedStudent?.seatId === student.seatId ? 'bg-indigo-50/40' : ''}
                    `}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-500">
                      {getSeatPositionName(student.seatId)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">{student.studentId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{student.name}</td>
                    <td className="py-3.5 px-4">{getStatusBadge(student)}</td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={student.content ? "text-indigo-600 font-bold" : "text-slate-400"}>
                        {student.content?.length || 0}자
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {student.warningsCount > 0 ? (
                        <span className="font-bold text-rose-600 font-mono flex items-center gap-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" /> {student.warningsCount}회
                        </span>
                      ) : (
                        <span className="text-slate-350">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="bg-indigo-50 hover:bg-indigo-500 hover:text-white border border-indigo-100 hover:border-indigo-500 text-indigo-600 transition font-semibold text-3xs py-1.5 px-3 rounded-lg mr-1.5 shadow-3xs"
                      >
                        답안 보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 오른쪽: 상세 답안 뷰어 패널 */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex-1 flex flex-col min-h-[400px]">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
            실시간 답안 상세 조회
          </h3>

          {selectedStudent ? (
            <div className="flex-1 flex flex-col gap-5">
              {/* 기본 요약 */}
              <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-3xs">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {selectedStudent.name} ({selectedStudent.studentId})
                  </h4>
                  <p className="text-3xs text-slate-500 mt-1">
                    좌석: {getSeatPositionName(selectedStudent.seatId)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(selectedStudent)}
                  <span className="text-3xs text-slate-500 font-mono mt-1">
                    글자수: {selectedStudent.content?.length || 0}자
                  </span>
                </div>
              </div>

              {/* 텍스트 뷰어 */}
              <div className="flex flex-col gap-2 flex-1 min-h-[220px]">
                <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
                  실시간 입력 내용
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs leading-relaxed text-slate-700 font-mono whitespace-pre-wrap overflow-y-auto max-h-[300px] border-l-2 border-l-indigo-500">
                  {selectedStudent.content ? selectedStudent.content : (
                    <span className="text-slate-400 italic">아직 입력한 내용이 없습니다.</span>
                  )}
                </div>
              </div>

              {/* 하단 제어 */}
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleCopyText(selectedStudent)}
                  disabled={!selectedStudent.content}
                  className="bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 font-bold text-2xs py-2.5 px-3 rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5 shadow-3xs"
                >
                  <Copy className="w-3.5 h-3.5" /> 
                  {copiedSeatId === selectedStudent.seatId ? '복사 완료!' : '답안 클립보드 복사'}
                </button>
                <button
                  onClick={() => handleDownloadText(selectedStudent)}
                  disabled={!selectedStudent.content}
                  className="bg-white hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 text-slate-700 font-bold text-2xs py-2.5 px-3 rounded-xl border border-slate-200 hover:border-indigo-150 transition flex items-center justify-center gap-1.5 shadow-3xs"
                >
                  <Download className="w-3.5 h-3.5" /> 파일 다운로드 (.txt)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-400 py-12">
              <FileText className="w-10 h-10 text-slate-300 mb-2.5" />
              <p className="text-xs">학생 리스트에서 &apos;답안 보기&apos;를 누르면<br />여기에 실시간 입력 내용이 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
