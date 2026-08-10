import { formatPoints } from "./formatPoints.js";
import { getExeCfg } from "./getExeCfg.js"
import { getAllAngles } from "./getAllAngles.js"
import { countExerciseRep2 } from "./createCountExerciseRep2.js"
import { similarityToScore } from "./similarityToScore.js"
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
//accuracy 
let totalAccuracy = 0;
let accuracyFrames = 0;
//for alerting
let alertSent = false;
let startSignal=false;
let detector = null;
let animationId = null;
let streamRef = null;
let running = false;
let lastGoodPoseTime = Date.now();

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
    await tf.ready();
    detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
    );
    return detector;
}
async function detectPose() {
    if (!running) return;
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const poses = await detector.estimatePoses(video);
        const hasPose = poses.length > 0;
        const keypoints = hasPose ? poses[0].keypoints : [];
      
        //visibility logic
        const now = Date.now();
        const allPointsVisible = hasPose && keypoints.every(kp => kp.score > 0.3);
        if (allPointsVisible) {
            lastGoodPoseTime = now;
            alertSent = false;
        }
        const missingDuration = now - lastGoodPoseTime;
        console.log(missingDuration);
        const warningColor =
            missingDuration >= 500 ? "orange" : null;
        if (missingDuration >= 2000 && !alertSent && window.AppInventor) {
            alertSent = true;
            window.AppInventor.setWebViewString("Please move your body so it is visible in the camera.");
            console.log("Please move your body so it is visible in the camera.");
        }
        //starting logic
        if (!startSignal) {
            if (window.AppInventor) {
                window.AppInventor.setWebViewString("Movenet Loaded");
            }
            video.classList.remove("blurred");
            startSignal = true;
        }
        //do not do rest if pose is not visible
        if (!hasPose) {
            animationId = requestAnimationFrame(detectPose);
            return;
        }
        // starting countdown
        if (startSignal && allPointsVisible && exerciseStartTime === null) {
            // Start missing-pose timer from when detection starts
            lastGoodPoseTime = now;
            alertSent = false;
        
            if (window.AppInventor) {
                window.AppInventor.setWebViewString("Detection Starting");
            }
        
            exerciseStartTime = now + LOGIC_DELAY_MS;
        }
        
        //drawing logic
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;
        const scale = Math.max(scaleX, scaleY);
        const offsetX = (canvas.width  - video.videoWidth  * scale) / 2;
        const offsetY = (canvas.height - video.videoHeight * scale) / 2;
        drawSkeleton(keypoints, scale, offsetX, offsetY, warningColor);
        drawKeypoints(keypoints, scale, offsetX, offsetY, warningColor);

        const logicDelayFinished =
            exerciseStartTime !== null &&
            Date.now() >= exerciseStartTime;
        
        if (!logicDelayFinished) {
            animationId = requestAnimationFrame(detectPose);
            return;
        }

        
        //compute
        const row = formatPoints(poses[0]);
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

        bar.style.width = `${accuracyScore}%`;

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
    console.error(error);
    stopCamera();
    }
}

async function startCamera(type) {
    if (running) return;
    try {
    video.classList.add("blurred");
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    });
    streamRef = stream;
    video.srcObject = stream;
    await new Promise((resolve) => { video.onloadedmetadata = resolve; });
    await video.play();
    video.style.display = "block";
    canvas.style.display = "block";
    resizeCanvas();

    await setupDetector();
    
    running = true;
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

    //starts detection
    detectPose();
    } catch (error) {
    console.error(error);
    }
}

function stopCamera() {
    running = false;

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
window.stopCamera = stopCamera;
startCamera("Squat");
