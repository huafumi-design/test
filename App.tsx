import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, PlayerAction, TeacherState, DetectionResult } from './types';
import { 
  GAME_DURATION, 
  SCORE_PER_TICK, 
  MAX_SCORE, 
  TEACHER_SCAN_MIN_INTERVAL, 
  TEACHER_SCAN_MAX_INTERVAL, 
  TEACHER_PRE_SCAN_DURATION,
  TEACHER_SCAN_DURATION,
  VOICE_LINES
} from './constants';
import { speakTeacherLine, playAlertSound, playSuccessSound, initAudio } from './services/audioService';
import WebcamDetector from './components/WebcamDetector';
import ExamPaper from './components/ExamPaper';

// Helper for random int
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [playerAction, setPlayerAction] = useState<PlayerAction>(PlayerAction.IDLE);
  
  // Teacher Logic
  const [teacherState, setTeacherState] = useState<TeacherState>(TeacherState.IDLE);
  const [showEye, setShowEye] = useState(false);
  const [randomMsg, setRandomMsg] = useState<string | null>(null);

  // Refs for timers
  const scanTimerRef = useRef<number | null>(null);

  // --- Detection Callback ---
  const handleDetection = useCallback((result: DetectionResult) => {
    if (gameState !== GameState.PLAYING) return;

    let newAction = PlayerAction.IDLE;

    if (result.lookingDown && result.leftHandOpen) {
      newAction = PlayerAction.CHEAT_SHEET;
    } else if (result.lookingRight) {
      newAction = PlayerAction.CHEAT_NEIGHBOR;
    }

    setPlayerAction(newAction);
  }, [gameState]);

  // --- Game Loop (Score & Catching) ---
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const loop = setInterval(() => {
      // 1. Scoring
      if (playerAction !== PlayerAction.IDLE) {
        setScore(prev => Math.min(prev + SCORE_PER_TICK, MAX_SCORE));
        if (Math.random() > 0.9) playSuccessSound(); // Play sound occasionally
      }

      // 2. Catch Logic (Only catch when actively SCANNING)
      if (teacherState === TeacherState.SCANNING && playerAction !== PlayerAction.IDLE) {
        handleCaught();
      }
    }, 100);

    return () => clearInterval(loop);
  }, [gameState, playerAction, teacherState]);

  // --- Timer Logic ---
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState(GameState.FINISHED);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // --- Teacher AI ---
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const scheduleNextScan = () => {
        // 1. Wait for IDLE duration
        const delay = randomInt(TEACHER_SCAN_MIN_INTERVAL, TEACHER_SCAN_MAX_INTERVAL);
        scanTimerRef.current = window.setTimeout(() => {
          
          // 2. Start PREPARING (Yellow Alert)
          setTeacherState(TeacherState.PREPARING);
          
          // Play random voice line during preparation to warn player
          if (Math.random() > 0.5) {
             const line = VOICE_LINES[randomInt(0, VOICE_LINES.length - 1)];
             setRandomMsg(line);
             speakTeacherLine(line);
             setTimeout(() => setRandomMsg(null), 3000);
          }

          // 3. Wait for PREPARING duration
          scanTimerRef.current = window.setTimeout(() => {
            
            // 4. Start SCANNING (Red Alert)
            setTeacherState(TeacherState.SCANNING);
            setShowEye(true);
            playAlertSound();

            // 5. Wait for SCANNING duration
            scanTimerRef.current = window.setTimeout(() => {
              
              // 6. Back to IDLE
              setTeacherState(TeacherState.IDLE);
              setShowEye(false);
              scheduleNextScan(); // Recurse
              
            }, TEACHER_SCAN_DURATION);
            
          }, TEACHER_PRE_SCAN_DURATION);

        }, delay);
    };

    scheduleNextScan();

    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [gameState]);

  const handleCaught = () => {
    setGameState(GameState.CAUGHT);
    setTeacherState(TeacherState.ALERT);
    speakTeacherLine("你已被发现！");
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  };

  const handleStartGame = async () => {
    await initAudio(); // Initialize audio context on user click
    setGameState(GameState.PLAYING);
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setTeacherState(TeacherState.IDLE);
    setCheatCount(0);
  };

  const [cheatCount, setCheatCount] = useState(0);

  const getBorderColor = () => {
     if (gameState !== GameState.PLAYING) return 'border-transparent';
     
     // Danger Zone
     if (teacherState === TeacherState.SCANNING) {
        return playerAction !== PlayerAction.IDLE ? 'border-red-600 animate-pulse' : 'border-red-600';
     }
     
     // Warning Zone
     if (teacherState === TeacherState.PREPARING) {
        return 'border-yellow-500 animate-pulse';
     }

     // Safe Zone
     return playerAction !== PlayerAction.IDLE ? 'border-green-500' : 'border-transparent';
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-neutral-900 ${gameState === GameState.CAUGHT ? 'shake-hard' : ''}`}>
      {/* Background Layer */}
      <div 
        className="absolute inset-0 opacity-40 grayscale"
        style={{
          backgroundImage: 'url("https://picsum.photos/1920/1080?grayscale&blur=2")',
          backgroundSize: 'cover'
        }}
      />
      <div className="vignette" />
      <div className="scanline" />

      {/* Screen Warning Border */}
      <div className={`absolute inset-0 border-[20px] pointer-events-none transition-colors duration-200 z-40 ${getBorderColor()}`} />

      {/* --- LAYER 2: Game Scene --- */}
      
      {/* Header Info */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-30 font-mono text-white pointer-events-none">
         <div className="bg-black/80 p-4 border border-white/20">
            <div className="text-xl">距离交卷: <span className={`${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>{timeLeft}s</span></div>
         </div>
         <div className="bg-black/80 p-4 border border-white/20 text-center">
            <div className="text-sm text-gray-400">当前得分</div>
            <div className="text-4xl font-bold text-green-400">{Math.floor(score)}</div>
         </div>
      </div>

      {/* Main Exam Paper */}
      {(gameState === GameState.PLAYING || gameState === GameState.CAUGHT) && <ExamPaper />}

      {/* Initial Player Thought */}
      {gameState === GameState.PLAYING && timeLeft > 57 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/80 text-white p-4 rounded border border-white/30 z-40 animate-bounce">
           "完了，怎么一道题都看不懂..."
        </div>
      )}

      {/* Teacher Approaching Warning Text */}
      {teacherState === TeacherState.PREPARING && (
         <div className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-yellow-600/90 text-black px-8 py-3 rounded border-2 border-yellow-300 z-50 text-2xl font-black shadow-[0_0_20px_rgba(255,255,0,0.5)] animate-pulse">
            ⚠ 监考老师正在走近...
         </div>
      )}

      {/* Random Teacher Message */}
      {randomMsg && (
         <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-8 py-4 rounded border-2 border-red-500 z-50 text-xl font-bold shadow-lg animate-pulse">
            {randomMsg}
         </div>
      )}

      {/* --- LAYER 3: Interaction Popups --- */}
      
      {/* Cheat Sheet (Bottom) */}
      <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 transition-all duration-300 z-30
         ${playerAction === PlayerAction.CHEAT_SHEET ? 'translate-y-[-10%]' : 'translate-y-[100%]'}
      `}>
         <div className="bg-[#fdf6e3] text-black p-6 w-[500px] h-[300px] shadow-2xl rounded-t-lg font-serif border-4 border-gray-800 rotate-2">
            <h3 className="font-bold border-b border-black mb-2">小抄 (公式大全)</h3>
            <p className="text-sm font-mono">
              f(ξ) + f'(ξ) = 0 <br/>
              e^x = 1 + x + x^2/2! + ... <br/>
              ∫udv = uv - ∫vdu <br/>
              (sin x)' = cos x <br/>
              ...
            </p>
            <div className="absolute bottom-2 right-2 text-green-700 font-bold">+ SCORE RISING</div>
         </div>
      </div>

      {/* Neighbor Answer (Right) */}
      <div className={`absolute top-1/2 right-10 transform -translate-y-1/2 transition-all duration-300 z-30 origin-right
         ${playerAction === PlayerAction.CHEAT_NEIGHBOR ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
      `}>
         <div className="bg-white text-blue-900 p-4 w-64 h-80 shadow-2xl font-handwriting transform -rotate-3 border border-gray-300">
            <div className="text-xs text-gray-500 mb-2">同学的试卷</div>
            <p className="font-cursive text-lg">
              1. A <br/>
              2. C <br/>
              3. 选C就对了 <br/>
              4. √ <br/>
              5. x=42 <br/>
            </p>
            <div className="absolute bottom-2 right-2 text-green-700 font-bold">+ SCORE RISING</div>
         </div>
      </div>

      {/* Teacher Eye (Center Warning) */}
      {teacherState === TeacherState.SCANNING && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
           <div className="w-64 h-64 bg-red-600/20 rounded-full flex items-center justify-center animate-ping absolute"></div>
           <svg viewBox="0 0 24 24" className="w-48 h-48 text-red-600 fill-current drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
             <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
           </svg>
        </div>
      )}

      {/* --- LAYER 1 (UI Overlays) --- */}

      {/* Intro Screen */}
      {gameState === GameState.INTRO && (
        <div className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center text-white">
           <h1 className="text-6xl font-serif mb-8 text-red-600 tracking-widest">作弊模拟器</h1>
           <div className="max-w-xl text-left space-y-4 bg-gray-900 p-8 border border-gray-700 rounded">
              <h2 className="text-2xl font-bold text-yellow-500">操作指南</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li><span className="text-green-400 font-bold">偷看小抄：</span> 低头 + 左手张开 (握住小抄)</li>
                <li><span className="text-blue-400 font-bold">偷看邻座：</span> 头部向右转</li>
                <li><span className="text-yellow-500 font-bold">警告提示：</span> 当屏幕边缘闪烁黄色且显示脚步声时，老师正在走近！</li>
                <li><span className="text-red-500 font-bold">高危预警：</span> 当屏幕边缘变红出现红眼时，绝对不能作弊！</li>
                <li><span className="text-white font-bold">目标：</span> 60秒内获得尽可能高的分数。</li>
              </ul>
           </div>
           <button 
             onClick={handleStartGame}
             className="mt-12 px-12 py-4 bg-red-800 hover:bg-red-700 text-white text-2xl font-bold rounded transition-colors animate-pulse"
           >
             开始考试
           </button>
        </div>
      )}

      {/* Game Over Screen (Caught) */}
      {gameState === GameState.CAUGHT && (
        <div className="absolute inset-0 bg-red-900/90 z-[100] flex flex-col items-center justify-center text-white text-center">
           <h1 className="text-8xl font-black mb-4 animate-bounce">GAME OVER</h1>
           <h2 className="text-4xl mb-8">你已被发现！</h2>
           <p className="text-xl max-w-2xl mb-12">"多大人了，不知道遵守考场纪律吗？你太让老师失望了，明天把你家长叫过来！"</p>
           <button 
             onClick={handleStartGame}
             className="px-8 py-3 border-2 border-white hover:bg-white hover:text-red-900 transition-colors text-xl"
           >
             再来一局
           </button>
        </div>
      )}

      {/* Finished Screen (Success/Timeout) */}
      {gameState === GameState.FINISHED && (
        <div className="absolute inset-0 bg-green-900/90 z-[100] flex flex-col items-center justify-center text-white text-center">
           <h1 className="text-6xl font-bold mb-8">考试结束</h1>
           <div className="text-8xl font-mono text-yellow-400 mb-4">{Math.floor(score)}分</div>
           <p className="text-xl mb-12 opacity-80">
             {score > 90 ? "作弊大师！哈佛没你我不去。" : 
              score > 60 ? "勉强及格，下次小心点。" : 
              "这点分还不如不抄..."}
           </p>
           <button 
             onClick={handleStartGame}
             className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded transition-colors text-xl"
           >
             再来一局
           </button>
        </div>
      )}

      {/* Webcam Feed */}
      <WebcamDetector onDetectionUpdate={handleDetection} isScanning={teacherState === TeacherState.SCANNING} />
    </div>
  );
};

export default App;