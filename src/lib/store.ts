import { db, isFirebaseConfigured } from './firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  writeBatch 
} from 'firebase/firestore';
import { Student, StudentStatus, ExamConfig, getSeatIds } from './types';

// 초기 상태 데이터 정의
const INITIAL_CONFIG: ExamConfig = {
  title: '2026학년도 1학기 고등학교 정보 수행평가',
  isActive: true,
};

// ----------------------------------------------------
// Mock (로컬 브라우저 간 동기화용) 스토어 구현
// ----------------------------------------------------

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined') {
  broadcastChannel = new BroadcastChannel('classroom_monitoring_channel');
}

// 로컬 탭 내 구독 콜백 리스트 (동일 탭 내 즉각 반응용)
const studentCallbacks: Array<(students: Student[]) => void> = [];
const configCallbacks: Array<(config: ExamConfig) => void> = [];

function getLocalStudents(): Student[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('monitoring_students');
  if (data) {
    return JSON.parse(data);
  }
  // 초기화되지 않았다면 빈 자리 리스트 생성
  const seatIds = getSeatIds();
  const initialStudents: Student[] = seatIds.map(seatId => ({
    seatId,
    studentId: '',
    name: '',
    status: 'offline',
    lastActive: 0,
    content: '',
    submitted: false,
    warningsCount: 0,
  }));
  localStorage.setItem('monitoring_students', JSON.stringify(initialStudents));
  return initialStudents;
}

function setLocalStudents(students: Student[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('monitoring_students', JSON.stringify(students));
  broadcastChannel?.postMessage({ type: 'STUDENTS_UPDATE', data: students });
  // 동일 탭 내 구독자들에게 실시간 통지
  studentCallbacks.forEach(cb => cb(students));
}

function getLocalConfig(): ExamConfig {
  if (typeof window === 'undefined') return INITIAL_CONFIG;
  const data = localStorage.getItem('monitoring_config');
  if (data) {
    return JSON.parse(data);
  }
  localStorage.setItem('monitoring_config', JSON.stringify(INITIAL_CONFIG));
  return INITIAL_CONFIG;
}

function setLocalConfig(config: ExamConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('monitoring_config', JSON.stringify(config));
  broadcastChannel?.postMessage({ type: 'CONFIG_UPDATE', data: config });
  // 동일 탭 내 구독자들에게 실시간 통지
  configCallbacks.forEach(cb => cb(config));
}

// ----------------------------------------------------
// 공통 인터페이스 (Firebase vs Mock)
// ----------------------------------------------------

// 1. 학생 데이터 실시간 구독
export function subscribeToStudents(callback: (students: Student[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, 'students');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const seatIds = getSeatIds();
      // 기본적으로 모든 자리 리스트를 만듦
      const studentMap = new Map<string, Student>();
      seatIds.forEach(seatId => {
        studentMap.set(seatId, {
          seatId,
          studentId: '',
          name: '',
          status: 'offline',
          lastActive: 0,
          content: '',
          submitted: false,
          warningsCount: 0,
        });
      });

      snapshot.forEach(doc => {
        const data = doc.data() as Omit<Student, 'seatId'>;
        studentMap.set(doc.id, {
          seatId: doc.id,
          ...data
        });
      });

      callback(Array.from(studentMap.values()));
    }, (error) => {
      console.error("Firestore students subscribe error, falling back to LocalStorage:", error);
      // Firestore 에러 발생시 로컬 폴백 작동
      fallbackSubscribeToStudents(callback);
    });
    return unsubscribe;
  } else {
    return fallbackSubscribeToStudents(callback);
  }
}

function fallbackSubscribeToStudents(callback: (students: Student[]) => void): () => void {
  studentCallbacks.push(callback);
  
  // 초기 데이터 전달
  callback(getLocalStudents());

  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.type === 'STUDENTS_UPDATE') {
      callback(e.data.data);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'monitoring_students') {
      callback(getLocalStudents());
    }
  };

  broadcastChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);

  return () => {
    const idx = studentCallbacks.indexOf(callback);
    if (idx !== -1) studentCallbacks.splice(idx, 1);
    
    broadcastChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
  };
}

// 2. 학생 정보 및 상태 업데이트
export async function updateStudent(seatId: string, updates: Partial<Student>): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'students', seatId);
      await setDoc(docRef, updates, { merge: true });
    } catch (error) {
      console.error("Firestore updateStudent error, updating locally:", error);
      await fallbackUpdateStudent(seatId, updates);
    }
  } else {
    await fallbackUpdateStudent(seatId, updates);
  }
}

async function fallbackUpdateStudent(seatId: string, updates: Partial<Student>): Promise<void> {
  const students = getLocalStudents();
  const index = students.findIndex(s => s.seatId === seatId);
  if (index !== -1) {
    students[index] = {
      ...students[index],
      ...updates,
    };
    setLocalStudents(students);
  }
}

// 3. 학생 로그인 (학번/이름 입력 및 자리 연결)
export async function loginStudent(seatId: string, studentId: string, name: string): Promise<void> {
  const updates: Partial<Student> = {
    studentId,
    name,
    status: 'active',
    lastActive: Date.now(),
    content: '',
    submitted: false,
    warningsCount: 0,
  };
  await updateStudent(seatId, updates);
}

// 4. 학생 로그아웃 (자리 비우기 / 강제 로그아웃)
export async function logoutStudent(seatId: string): Promise<void> {
  const updates: Partial<Student> = {
    studentId: '',
    name: '',
    status: 'offline',
    lastActive: 0,
    content: '',
    submitted: false,
    warningsCount: 0,
  };
  await updateStudent(seatId, updates);
}

// 5. 수행평가 답안 최종 제출
export async function submitExam(seatId: string): Promise<void> {
  const updates: Partial<Student> = {
    submitted: true,
    submittedAt: Date.now(),
    status: 'offline', // 제출하면 오프라인 처리
  };
  await updateStudent(seatId, updates);
}

// 6. 전체 학생 데이터 초기화 (모든 자리 리셋)
export async function resetAllStudents(): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'students');
      const batch = writeBatch(db);
      const seatIds = getSeatIds();
      
      seatIds.forEach(seatId => {
        const docRef = doc(db, 'students', seatId);
        batch.set(docRef, {
          studentId: '',
          name: '',
          status: 'offline',
          lastActive: 0,
          content: '',
          submitted: false,
          warningsCount: 0,
        });
      });
      await batch.commit();
    } catch (error) {
      console.error("Firestore resetAllStudents error, resetting locally:", error);
      await fallbackResetAllStudents();
    }
  } else {
    await fallbackResetAllStudents();
  }
}

async function fallbackResetAllStudents(): Promise<void> {
  const seatIds = getSeatIds();
  const resetStudents = seatIds.map(seatId => ({
    seatId,
    studentId: '',
    name: '',
    status: 'offline' as StudentStatus,
    lastActive: 0,
    content: '',
    submitted: false,
    warningsCount: 0,
  }));
  setLocalStudents(resetStudents);
}

// 7. 시험 관리 설정 구독
export function subscribeToConfig(callback: (config: ExamConfig) => void): () => void {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'config', 'exam');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as ExamConfig);
      } else {
        // 설정이 존재하지 않으면 초기 설정 생성 후 콜백 호출
        setDoc(docRef, INITIAL_CONFIG);
        callback(INITIAL_CONFIG);
      }
    }, (error) => {
      console.error("Firestore config subscribe error, falling back to LocalStorage:", error);
      fallbackSubscribeToConfig(callback);
    });
    return unsubscribe;
  } else {
    return fallbackSubscribeToConfig(callback);
  }
}

function fallbackSubscribeToConfig(callback: (config: ExamConfig) => void): () => void {
  configCallbacks.push(callback);
  
  callback(getLocalConfig());

  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.type === 'CONFIG_UPDATE') {
      callback(e.data.data);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'monitoring_config') {
      callback(getLocalConfig());
    }
  };

  broadcastChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);

  return () => {
    const idx = configCallbacks.indexOf(callback);
    if (idx !== -1) configCallbacks.splice(idx, 1);
    
    broadcastChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
  };
}

// 8. 시험 관리 설정 업데이트
export async function updateConfig(updates: Partial<ExamConfig>): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'config', 'exam');
      await setDoc(docRef, updates, { merge: true });
    } catch (error) {
      console.error("Firestore updateConfig error, updating locally:", error);
      await fallbackUpdateConfig(updates);
    }
  } else {
    await fallbackUpdateConfig(updates);
  }
}

async function fallbackUpdateConfig(updates: Partial<ExamConfig>): Promise<void> {
  const config = getLocalConfig();
  const updatedConfig = {
    ...config,
    ...updates,
  };
  setLocalConfig(updatedConfig);
}
