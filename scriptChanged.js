import { formatPoints } from "./formatPoints.js";
import { getExeCfg } from "./getExeCfg.js"
import { getAllAngles } from "./getAllAngles.js"
import { countExerciseRep2 } from "./createCountExerciseRep2.js"
import { similarityToScore } from "./similarityToScore.js"
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

//angle to points mapping
const angPtsIdx = [
  [8, 2, 10], [12, 8, 2], [12, 8, 9], [12, 9, 8],
  [12, 9, 3], [11, 3, 9], [2, 8, 4], [3, 9, 5],
  [8, 4, 6], [8, 4, 5], [9, 5, 4], [9, 5, 7],
  [4, 6, 0], [4, 6, 7], [5, 7, 6], [5, 7, 1],
  [6, 0, 1], [7, 1, 0]
];

//accuracy 
let totalAccuracy = 0;
let accuracyFrames = 0;
//for alerting
let alertSent = false;
let ready = false;
let startRequested = false;
let initializationPromise = null;
let detectorPromise = null;
let sessionId = 0;
let cancelMetadataWait = null;
let detector = null;
let animationId = null;
let streamRef = null;
let running = false;
let detectionRunId = 0;
let waitingForExercise = false;
let bodyVisibleTimer = null;
let lastGoodPoseTime = null;

const LOGIC_DELAY_MS = 6000;
let exerciseStartTime = null;

let cfg;
let dt = 0;
let prevTime = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawKeypoints(keypoints, scale, offsetX, offsetY, warningColor) {
  const pointColor = warningColor || "#00ff8a";

  for (const kp of keypoints) {
    if (kp.score > 0.3) {
      const x = kp.x * scale + offsetX;
      const y = kp.y * scale + offsetY;

      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = pointColor;
      ctx.fill();
    }
  }
}

function drawSkeleton(keypoints, scale, offsetX, offsetY, warningColor) {
  const adjacentPairs = poseDetection.util.getAdjacentPairs(
    poseDetection.SupportedModels.MoveNet
  );

  ctx.strokeStyle = warningColor || "white";
  ctx.lineWidth = 5;

  for (const [i, j] of adjacentPairs) {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];

    if (kp1 && kp2 && kp1.score > 0.3 && kp2.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(kp1.x * scale + offsetX, kp1.y * scale + offsetY);
      ctx.lineTo(kp2.x * scale + offsetX, kp2.y * scale + offsetY);
      ctx.stroke();
    }
  }
}

async function setupDetector() {
    if (detector) return detector;
    if (!detectorPromise) {
        detectorPromise = (async () => {
            await tf.ready();
            detector = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
            );
            return detector;
        })().finally(() => { detectorPromise = null; });
    }
    return detectorPromise;
}
async function detectPose() {
    if (!running) return;
    const currentSession = sessionId;
    const currentRun = detectionRunId;
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const poses = await detector.estimatePoses(video);
        if (!running || currentSession !== sessionId || currentRun !== detectionRunId) return;
        const hasPose = poses.length > 0;
        const keypoints = hasPose ? poses[0].keypoints : [];
      
        //visibility logic
        const now = Date.now();
        if (lastGoodPoseTime === null) {
            lastGoodPoseTime = now;
        }
        
        // formatPoints uses the same 13-point order as angPtsIdx.
        const row = hasPose ? formatPoints(poses[0]) : null;
        const requiredPoints = cfg.ang_idx.flatMap(i => angPtsIdx[i - 1]);
        
        const allPointsVisible =
            hasPose &&
            requiredPoints.every(i =>
                row[1 + 2 * i] >= 0 && row[2 + 2 * i] >= 0
            );
        
        if (allPointsVisible) {
            lastGoodPoseTime = now;
            alertSent = false;
        }
        const missingDuration = now - lastGoodPoseTime;
        const warningColor =
            missingDuration >= 500 ? "orange" : null;
        if (missingDuration >= 2000 && !alertSent && window.AppInventor) {
            alertSent = true;
            window.AppInventor.setWebViewString("Please move your body so it is visible in the camera.");
        }
        //do not do rest if pose is not visible
        if (!hasPose) {
            animationId = requestAnimationFrame(detectPose);
            return;
        }
        //drawing logic
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;
        const scale = Math.max(scaleX, scaleY);
        const offsetX = (canvas.width  - video.videoWidth  * scale) / 2;
        const offsetY = (canvas.height - video.videoHeight * scale) / 2;
        drawSkeleton(keypoints, scale, offsetX, offsetY, warningColor);
        drawKeypoints(keypoints, scale, offsetX, offsetY, warningColor);

        // Keep updating the pose for one second before signaling and pausing.
        if (allPointsVisible && exerciseStartTime === null && bodyVisibleTimer === null) {
            bodyVisibleTimer = setTimeout(() => {
                if (currentSession !== sessionId) return;
                bodyVisibleTimer = null;
                running = false;
                detectionRunId++;
                if (animationId !== null) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
                waitingForExercise = true;
                if (window.AppInventor) {
                    window.AppInventor.setWebViewString("Body Visible");
                }
            }, 1000);
        }

        const logicDelayFinished =
            exerciseStartTime !== null &&
            Date.now() >= exerciseStartTime;
        
        if (!logicDelayFinished) {
            animationId = requestAnimationFrame(detectPose);
            return;
        }

        
        //compute
        const template = cfg.template;
        const timeStamp = row[0] / 1000;
        if (prevTime !== null) {
        dt = timeStamp - prevTime;
        }
        const dataStruct = getAllAngles(row, dt, cfg.win_len );
        const featureVect = [];

        function norm(arr) {
        return Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0));
        }

        for (let n = 0; n < cfg.ang_idx.length; n++) {
        const idx = cfg.ang_idx[n] - 1; // MATLAB index → JS index

        featureVect.push(dataStruct.angX[idx]);
        
        featureVect.push(dataStruct.angSigma[idx]);
        }

        const templateNorm = norm(template);

        const normalizedFeatureVect = featureVect.map(v => v / templateNorm);
        const normalizedTemplate = template.map(v => v / templateNorm);

        const diff = normalizedFeatureVect.map(
        (v, i) => v - normalizedTemplate[i]
        );

        const similarity = norm(diff);

        const bestError = 0.01;
        const worstError = 0.3113;

        const accuracyScore = 100 * similarityToScore(similarity, cfg);
        totalAccuracy += accuracyScore;
        accuracyFrames++;
        const bar = document.getElementById("similarityBar");

        bar.style.height = `${accuracyScore}%`;

        if (accuracyScore >= 66.67) {
            bar.style.background = "lime";
        } else if (accuracyScore >= 33.33) {
            bar.style.background = "yellow";
        } else {
            bar.style.background = "red";
        }

        const angIn =
        0.5 *
        (
            dataStruct.ang[cfg.ang_idx[0] - 1] +
            dataStruct.ang[cfg.ang_idx[1] - 1]
        ) *
        180 / Math.PI;

        const {
            count,
            state,
            angleFilt,
            fastSlowWarning,
            repPeriod
        } = countExerciseRep2(
            timeStamp,
            angIn,
            0,
            dt,
            cfg
        );
        
        if (window.AppInventor) {
            window.AppInventor.setWebViewString(
                `${count} ${fastSlowWarning}`
            );
        }
        prevTime = timeStamp;
    animationId = requestAnimationFrame(detectPose);
    } catch (error) {
    if (currentSession !== sessionId || currentRun !== detectionRunId) return;
    console.error(error);
    stopCamera();
    }
}

// Prepare the camera and model without starting pose inference or exercise timers.
function startCamera(type) {
    if (initializationPromise) return initializationPromise;
    if (ready || running) return Promise.resolve(true);
    const currentSession = ++sessionId;
    video.classList.add("blurred");
    initializationPromise = (async () => {
        try {
            if (type === "Squat") {
                cfg = getExeCfg(1);
            } else if (type === "Bend") {
                cfg = getExeCfg(2);
            } else if (type === "Lunge") {
                cfg = getExeCfg(3);
            } else if (type === "Child") {
                cfg = getExeCfg(4);
            } else if (type === "Circle") {
                cfg = getExeCfg(5);
            } else if (type === "Butterfly") {
                cfg = getExeCfg(6);
            } else if (type === "Cobra") {
                cfg = getExeCfg(7);
            } else if (type === "Raise") {
                cfg = getExeCfg(8);
            } else if (type === "Curl") {
                cfg = getExeCfg(9);
            } else if (type === "March") {
                cfg = getExeCfg(10);
            } else {
                throw new Error(`Unknown exercise type: ${type}`);
            }

            totalAccuracy = 0;
            accuracyFrames = 0;
            exerciseStartTime = null;
            waitingForExercise = false;
            lastGoodPoseTime = null;
            alertSent = false;
            prevTime = null;
            dt = 0;
            document.getElementById("similarityBar").style.height = "0%";

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            if (currentSession !== sessionId) {
                stream.getTracks().forEach(t => t.stop());
                return false;
            }
            streamRef = stream;
            await new Promise((resolve) => {
                const finish = () => {
                    video.onloadedmetadata = null;
                    cancelMetadataWait = null;
                    resolve();
                };
                cancelMetadataWait = finish;
                video.onloadedmetadata = finish;
                video.srcObject = stream;
                if (video.readyState >= 1) finish();
            });
            if (currentSession !== sessionId) return false;
            await video.play();
            if (currentSession !== sessionId) return false;
            video.style.display = "block";
            canvas.style.display = "block";
            resizeCanvas();
            await setupDetector();
            if (currentSession !== sessionId) return false;

            ready = true;
            if (window.AppInventor) {
                window.AppInventor.setWebViewString("Movenet Loaded");
            }
            beginDetectionIfReady();
            return true;
        } catch (error) {
            if (currentSession === sessionId) {
                console.error(error);
                stopCamera();
            }
            return false;
        }
    })();
    const pending = initializationPromise;
    pending.finally(() => {
        if (initializationPromise === pending) initializationPromise = null;
    });
    return pending;
}

function beginDetectionIfReady() {
    if (!startRequested || !ready || running || waitingForExercise || bodyVisibleTimer !== null) return;
    // Prompt on the first missing-pose frame instead of waiting after startup.
    // Date.now() uses milliseconds; backdate by more than 2,000 seconds.
    lastGoodPoseTime = Date.now() - 2001 * 1000;
    alertSent = false;
    running = true;
    video.classList.remove("blurred");
    detectPose();
}

// May be called before loading completes (or even before startCamera).
// The request stays queued and the preview stays blurred until ready.
function startDetection() {
    startRequested = true;
    beginDetectionIfReady();
}

// Only an explicit call after "Body Visible" can start the exercise countdown.
// Early or repeated calls are ignored and return false.
function startExercise() {
    if (!ready || !waitingForExercise || running) return false;
    waitingForExercise = false;
    document.getElementById("similarityBox").hidden = false;
    exerciseStartTime = Date.now() + LOGIC_DELAY_MS;
    lastGoodPoseTime = Date.now();
    alertSent = false;
    prevTime = null;
    dt = 0;
    running = true;
    if (window.AppInventor) {
        window.AppInventor.setWebViewString("Detection Starting");
    }
    detectPose();
    return true;
}

function stopCamera() {
    document.getElementById("similarityBox").hidden = true;
    sessionId++;
    if (bodyVisibleTimer !== null) {
        clearTimeout(bodyVisibleTimer);
        bodyVisibleTimer = null;
    }
    running = false;
    waitingForExercise = false;
    exerciseStartTime = null;
    ready = false;
    startRequested = false;
    initializationPromise = null;
    if (cancelMetadataWait) cancelMetadataWait();
    video.classList.add("blurred");

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (streamRef) {
        streamRef.getTracks().forEach(t => t.stop());
        streamRef = null;
    }

    const averageAccuracy =
        accuracyFrames > 0
            ? totalAccuracy / accuracyFrames
            : 0;

    if (window.AppInventor) {
      window.AppInventor.setWebViewString(
          `Accuracy: ${averageAccuracy.toFixed(0)}`
      );
    }
    totalAccuracy = 0;
    accuracyFrames = 0;
    video.srcObject = null;

    video.style.display = "none";
    canvas.style.display = "none";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
window.startCamera = startCamera;
window.startDetection = startDetection;
window.startExercise = startExercise;
window.stopCamera = stopCamera;
