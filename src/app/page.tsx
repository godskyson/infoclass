import Link from 'next/link';
import { ShieldCheck, User, Sparkles, Monitor, ClipboardList, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-pink-50/30 to-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-indigo-100 relative overflow-x-hidden">
      
      {/* 백그라운드 무드 라이트 효과 */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-200/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 상단 바 */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <img 
            src="/image.png" 
            className="w-8 h-8 rounded-lg object-cover border border-slate-200/60 shadow-sm" 
            alt="뜸부기 모니터 로고" 
          />
          <span className="font-extrabold text-sm tracking-wider uppercase text-slate-800">
            뜸부기 모니터
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/60 px-3 py-1 rounded-full text-2xs font-semibold text-slate-600 shadow-sm">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
          수행평가 실시간 관리 시스템
        </div>
      </header>

      {/* 메인 콘텐츠 히어로 */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-between max-w-7xl w-full mx-auto px-6 py-12 z-10 gap-12">
        
        {/* 왼쪽: 타이틀 및 카드 */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-8 w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-5 border border-indigo-100 text-indigo-600 text-2xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" /> High School Performance Assessment Service
          </div>
          
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-slate-900">
              공정하고 스마트한<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600">
                수행평가 실시간 모니터링
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 max-w-lg leading-relaxed mx-auto lg:mx-0">
              학생들의 화면 이탈 및 미입력 상태를 교실 자리 배치와 연동하여 실시간으로 확인하고 제어하는 지능형 감독 보드 서비스입니다.
            </p>
          </div>

          {/* 진입 카드 두 개 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            
            {/* 학생용 진입 카드 */}
            <Link 
              href="/student/login"
              className="group relative bg-white/80 hover:bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 hover:border-indigo-400 p-6 shadow-md hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 flex flex-col justify-between min-h-[180px] overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-300 opacity-60 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 bg-indigo-5 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-115 transition-transform duration-300 shadow-sm">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    학생용 화면 진입
                  </h3>
                  <p className="text-3xs text-slate-500 mt-1 leading-relaxed">
                    자신의 자리를 선택한 후 학번과 이름을 입력하고 수행평가 작성 화면에 접속합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-4xs text-indigo-600 font-bold tracking-wider uppercase mt-4 group-hover:translate-x-1.5 transition-transform">
                응시 화면 접속하기 &rarr;
              </div>
            </Link>

            {/* 관리자용 진입 카드 */}
            <Link 
              href="/admin"
              className="group relative bg-white/80 hover:bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 hover:border-emerald-400 p-6 shadow-md hover:shadow-xl hover:shadow-emerald-100/40 transition-all duration-300 flex flex-col justify-between min-h-[180px] overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 bg-emerald-5 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-115 transition-transform duration-300 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                    감독관(관리자) 대시보드
                  </h3>
                  <p className="text-3xs text-slate-500 mt-1 leading-relaxed">
                    학생들의 실시간 화면 이탈 여부, 미입력 상태, 작성 내용 확인 및 시험 통제 제어판에 진입합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-4xs text-emerald-600 font-bold tracking-wider uppercase mt-4 group-hover:translate-x-1.5 transition-transform">
                관리자 포탈 접속하기 &rarr;
              </div>
            </Link>

          </div>
        </div>

        {/* 오른쪽: 이미지 일러스트 데코 */}
        <div className="flex-1 w-full max-w-md lg:max-w-none flex justify-center items-center">
          <div className="relative group p-2 bg-white rounded-2xl border border-slate-200/80 shadow-xl hover:shadow-2xl transition-all duration-300 scale-95 lg:scale-100">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-pink-400 rounded-2xl blur-md opacity-20 group-hover:opacity-35 transition duration-300"></div>
            <div className="relative bg-white rounded-xl overflow-hidden border border-slate-100">
              {/* 브라우저 상단 바 모사 */}
              <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-2 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 bg-rose-400 rounded-full"></span>
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span className="text-4xs text-slate-400 font-mono ml-4 truncate">vibe-e49cd.web.app</span>
              </div>
              <img 
                src="/image.png" 
                alt="수행평가 실시간 모니터링 서비스 일러스트" 
                className="w-full h-auto max-h-[340px] object-cover"
              />
            </div>
          </div>
        </div>

      </main>

      {/* 하단 푸터 */}
      <footer className="w-full border-t border-slate-200/60 py-6 bg-white/40 text-center text-xs text-slate-400 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap justify-center gap-6 text-slate-400 text-2xs">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              <span>2인 3x4 총 24석 최적화</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>실시간 자동 저장 및 제출 관리</span>
            </div>
          </div>
          <div>&copy; 2026 대영중학교 정보 수업 수행평가. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
