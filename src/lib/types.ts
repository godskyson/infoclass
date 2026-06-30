export type StudentStatus = 'active' | 'idle' | 'tab-left' | 'offline';

export interface Student {
  seatId: string;      // e.g. "seat_0_0_left"
  studentId: string;   // 학번 (Student Number)
  name: string;        // 이름 (Name)
  status: StudentStatus;
  lastActive: number;  // timestamp (ms)
  content: string;     // 수행평가 작성 내용 (performance assessment text)
  submitted: boolean;
  submittedAt?: number;
  warningsCount: number;
  lastWarningAt?: number;
}

export interface ExamConfig {
  title: string;
  isActive: boolean;
}

// 3 rows, 4 columns of double desks
export const ROWS = 3;
export const COLS = 4;
export const POSITIONS = ['left', 'right'] as const;

export function getSeatIds(): string[] {
  const ids: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const p of POSITIONS) {
        ids.push(`seat_${r}_${c}_${p}`);
      }
    }
  }
  return ids;
}

export function parseSeatId(seatId: string) {
  const match = seatId.match(/^seat_(\d+)_(\d+)_(left|right)$/);
  if (!match) return { row: 0, col: 0, pos: 'left' as const };
  return {
    row: parseInt(match[1], 10),
    col: parseInt(match[2], 10),
    pos: match[3] as 'left' | 'right'
  };
}
