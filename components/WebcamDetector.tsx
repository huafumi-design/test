import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceLandmarker, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { DetectionResult } from '../types';

interface WebcamDetectorProps {
  onDetectionUpdate: (result: DetectionResult) => void;
  isScanning: boolean;
}

const WebcamDetector: React.FC<WebcamDetectorProps> = ({ onDetectionUpdate, isScanning }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>("INITIALIZING...");
  const [error, setError] = useState<string | null>(null);
  
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  
  // Use a ref to store the latest callback to prevent stale closures
  const callbackRef = useRef(onDetectionUpdate);

  useEffect(() => {
    callbackRef.current = onDetectionUpdate;
  }, [onDetectionUpdate]);

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        // Using CPU delegate explicitly to match XNNPACK logs and ensure stability
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "CPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numHands: 2 
        });
        
        setStatus("MODELS LOADED. STARTING CAMERA...");
        startWebcam();
      } catch (err: any) {
        console.error(err);
        setError("AI LOAD FAILED: " + err.message);
      }
    };

    initMediaPipe();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startWebcam = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Start the loop once data is loaded
          videoRef.current.addEventListener('loadeddata', () => {
             setStatus("");
             predictWebcam();
          });
        }
      } catch (err: any) {
        console.error("Webcam access error:", err);
        setError("CAMERA DENIED: " + err.message);
      }
    } else {
        setError("CAMERA NOT SUPPORTED");
    }
  };

  const predictWebcam = () => {
    // Schedule next frame IMMEDIATELY to ensure loop never dies
    requestRef.current = requestAnimationFrame(predictWebcam);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Safety check
    if (!faceLandmarkerRef.current || !handLandmarkerRef.current || !video || !canvas) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to video size
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const startTimeMs = performance.now();
    const faceResult = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
    const handResult = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(ctx);

    // --- LOGIC ---
    let lookingDown = false;
    let lookingRight = false;
    let leftHandOpen = false;

    // Face Logic
    if (faceResult.faceLandmarks.length > 0) {
      const landmarks = faceResult.faceLandmarks[0];
      const nose = landmarks[1];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const eyeY = (leftEye.y + rightEye.y) / 2;

      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });

      // 1. LOOKING DOWN
      if (nose.y > eyeY + 0.05) { 
           lookingDown = true;
      }

      // 2. LOOKING RIGHT
      const distToLeftEye = Math.abs(nose.x - leftEye.x);
      const distToRightEye = Math.abs(nose.x - rightEye.x);
      
      if (distToRightEye < distToLeftEye * 0.7) {
           lookingRight = true;
      }
    }

    // Hand Logic
    if (handResult.landmarks.length > 0) {
      for (const landmarks of handResult.landmarks) {
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
          drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 1 });
          
          const indexTip = landmarks[8];
          const pinkyTip = landmarks[20];
          const spread = Math.hypot(indexTip.x - pinkyTip.x, indexTip.y - pinkyTip.y);
          
          if (spread > 0.12) {
              leftHandOpen = true; // Any open hand triggers it
          }
      }
    }

    // Draw Debug Info (Mirrored)
    ctx.save();
    ctx.scale(-1, 1); 
    ctx.translate(-canvas.width, 0);
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, 160, 80);
    
    ctx.fillStyle = lookingDown ? "#00FF00" : "#FF5555";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Down:  ${lookingDown ? 'YES' : 'NO'}`, 10, 20);
    
    ctx.fillStyle = lookingRight ? "#00FF00" : "#FF5555";
    ctx.fillText(`Right: ${lookingRight ? 'YES' : 'NO'}`, 10, 40);
    
    ctx.fillStyle = leftHandOpen ? "#00FF00" : "#FF5555";
    ctx.fillText(`Hand:  ${leftHandOpen ? 'YES' : 'NO'}`, 10, 60);
    
    ctx.restore();

    callbackRef.current({ lookingDown, lookingRight, leftHandOpen });
  };

  const borderColor = isScanning ? 'border-red-600' : 'border-green-500';

  return (
    <div className={`fixed bottom-4 right-4 w-64 h-48 z-[60] border-4 ${borderColor} bg-black shadow-2xl rounded-lg overflow-hidden transition-colors duration-300`}>
       <div className="absolute top-0 left-0 bg-black/50 text-white text-[10px] p-1 font-mono z-10">
          SENSOR_FEED_V3 (CPU)
       </div>
       
       {status && !error && (
         <div className="absolute inset-0 flex items-center justify-center text-green-500 font-mono text-xs p-4 text-center bg-black/80 z-20">
           {status}
         </div>
       )}

       {error && (
         <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold font-mono text-xs p-4 text-center bg-black/90 z-20 border border-red-500">
           {error}
         </div>
       )}

      <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]" />
    </div>
  );
};

export default WebcamDetector;