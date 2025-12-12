export enum GameState {
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  CAUGHT = 'CAUGHT',
  FINISHED = 'FINISHED'
}

export enum PlayerAction {
  IDLE = 'IDLE',
  CHEAT_SHEET = 'CHEAT_SHEET',
  CHEAT_NEIGHBOR = 'CHEAT_NEIGHBOR'
}

export enum TeacherState {
  IDLE = 'IDLE',      // Creating ambient noise
  PREPARING = 'PREPARING', // Teacher is approaching (Warning!)
  SCANNING = 'SCANNING', // Looking at students (Danger!)
  ALERT = 'ALERT'     // Just caught someone
}

export interface DetectionResult {
  lookingDown: boolean;
  lookingRight: boolean;
  leftHandOpen: boolean;
}

export interface ExamQuestion {
  id: number;
  content: string;
}