import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Average human interpupillary distance (IPD) in millimeters
const AVERAGE_IPD_MM = 63.0;

// Default camera focal length estimate in pixels (standard 60-70 degree FOV webcams)
const ESTIMATED_FOCAL_LENGTH_PX = 650;

/**
 * Custom hook to estimate distance between user face and webcam using MediaPipe FaceLandmarker
 * @param {Object} options Configuration options
 * @param {boolean} options.enabled - Whether webcam feed processing is active
 * @returns {Object} { distanceMm, isFaceDetected, videoRef, error, isLoading }
 */
export function useDistance({ enabled = true } = {}) {
  const [distanceMm, setDistanceMm] = useState(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // 1. Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let isSubscribed = true;

    async function initMediaPipe() {
      try {
        setIsLoading(true);
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        if (isSubscribed) {
          landmarkerRef.current = landmarker;
          setIsLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(`Failed to initialize MediaPipe: ${err.message}`);
          setIsLoading(false);
        }
      }
    }

    if (enabled) {
      initMediaPipe();
    }

    return () => {
      isSubscribed = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, [enabled]);

  // 2. Start Video Stream & Detection Loop
  const detectDistance = useCallback(() => {
    if (
      !enabled ||
      !videoRef.current ||
      !landmarkerRef.current ||
      videoRef.current.readyState < 2
    ) {
      animFrameIdRef.current = requestAnimationFrame(detectDistance);
      return;
    }

    const video = videoRef.current;
    const startTimeMs = performance.now();
    const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];

      // MediaPipe landmark indices for pupil / eye centers:
      // Index 468: Left pupil center | Index 473: Right pupil center
      const leftPupil = landmarks[468] || landmarks[33];
      const rightPupil = landmarks[473] || landmarks[263];

      // Convert normalized coordinates (0.0 to 1.0) to pixel dimensions
      const leftPx = { x: leftPupil.x * video.videoWidth, y: leftPupil.y * video.videoHeight };
      const rightPx = { x: rightPupil.x * video.videoWidth, y: rightPupil.y * video.videoHeight };

      // Calculate Euclidean pixel distance between pupils
      const pupilDistancePx = Math.hypot(rightPx.x - leftPx.x, rightPx.y - leftPx.y);

      if (pupilDistancePx > 0) {
        // Pinhole camera distance calculation in mm
        const calculatedDistance = (AVERAGE_IPD_MM * ESTIMATED_FOCAL_LENGTH_PX) / pupilDistancePx;

        setDistanceMm(Math.round(calculatedDistance));
        setIsFaceDetected(true);
      }
    } else {
      setIsFaceDetected(false);
      setDistanceMm(null);
    }

    animFrameIdRef.current = requestAnimationFrame(detectDistance);
  }, [enabled]);

  // 3. Attach MediaStream to Video Element
  useEffect(() => {
    if (!enabled || isLoading) return;

    let stream = null;

    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            animFrameIdRef.current = requestAnimationFrame(detectDistance);
          };
        }
      } catch (err) {
        setError(`Webcam access denied or unavailable: ${err.message}`);
      }
    }

    setupCamera();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [enabled, isLoading, detectDistance]);

  return {
    distanceMm,
    isFaceDetected,
    videoRef,
    isLoading,
    error,
  };
}