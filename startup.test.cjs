const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const source = readFileSync(`${__dirname}/scriptChanged.js`, 'utf8')
    .replace(/^import .*$/gm, '');
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness() {
    const model = deferred();
    const camera = deferred();
    const inference = deferred();
    const signals = [];
    const classes = new Set();
    const calls = { camera: 0, model: 0, inference: 0, stopped: 0, frames: 0, reps: 0 };
    const frames = new Map();
    const timers = new Map();
    let timerId = 0;
    const fills = [];
    let now = 100000;
    const stream = { getTracks: () => [{ stop: () => calls.stopped++ }] };
    const video = {
        classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
        style: {}, readyState: 1, play: async () => {}, srcObject: null
    };
    const canvas = { style: {}, getContext: () => ({ clearRect() {}, beginPath() {}, stroke() {}, arc() {}, fill() { fills.push(this.fillStyle); } }) };
    const bar = { style: {} };
    const scoreBox = { hidden: true };
    const loadingMessage = { hidden: false };
    const window = {
        innerWidth: 640, innerHeight: 480, addEventListener() {},
        AppInventor: { setWebViewString: text => signals.push(text) }
    };
    vm.runInNewContext(source, {
        window, document: { getElementById: id => ({ video, canvas, similarityBar: bar, similarityBox: scoreBox, loadingMessage }[id]) },
        navigator: { mediaDevices: { getUserMedia: () => { calls.camera++; return camera.promise; } } },
        tf: { ready: async () => {} },
        Date: { now: () => now },
        setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; },
        clearTimeout: id => timers.delete(id),
        poseDetection: {
            SupportedModels: { MoveNet: 'MoveNet' },
            movenet: { modelType: { SINGLEPOSE_THUNDER: 'thunder' } },
            util: { getAdjacentPairs: () => [] },
            createDetector: () => { calls.model++; return model.promise; }
        },
        getExeCfg: id => ({ id, ang_idx: [1, 2], template: [1, 1, 1, 1] }),
        formatPoints: pose => [now, ...Array(26).fill(pose.visible === false ? -1 : 1)],
        getAllAngles: () => ({ angX: [1, 1], angSigma: [1, 1], ang: [1, 1] }),
        similarityToScore: () => 1,
        countExerciseRep2: () => ({ count: ++calls.reps, fastSlowWarning: '' }),
        requestAnimationFrame: callback => { const id = ++calls.frames; frames.set(id, callback); return id; },
        cancelAnimationFrame: id => frames.delete(id), console: { error() {} }
    });
    const detector = { estimatePoses: () => { calls.inference++; return inference.promise; } };
    return { window, calls, classes, signals, camera, model, inference, stream, detector, video, fills, loadingMessage, pendingFrames: () => frames.size,
        advance: ms => {
            now += ms;
            for (const [id, timer] of timers) {
                if (timer.at <= now) { timers.delete(id); timer.callback(); }
            }
        },
        nextFrame: async () => {
            const entry = frames.entries().next().value;
            assert(entry, 'expected a scheduled frame');
            frames.delete(entry[0]);
            await entry[1]();
        }
    };
}

test('page load is idle; preparation signals readiness without running', async () => {
    const h = harness();
    assert.equal(h.calls.camera, 0);
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    await flush();
    assert(h.classes.has('blurred'));
    assert.equal(h.calls.inference, 0);
    assert.deepEqual(h.signals, []);
    h.model.resolve(h.detector);
    assert.equal(await prepared, true);
    assert.deepEqual(h.signals, ['Movenet Loaded']);
    assert.equal(h.calls.inference, 0);
    assert(h.classes.has('blurred'));
    h.window.startDetection();
    h.window.startDetection();
    assert.equal(h.calls.inference, 1);
    assert(!h.classes.has('blurred'));
});

test('early detection queues until both camera and model are ready; repeated starts share loading', async () => {
    const h = harness();
    h.window.startDetection();
    const prepared = h.window.startCamera('Bend');
    assert.equal(h.window.startCamera('Bend'), prepared);
    h.window.startDetection();
    assert.equal(h.calls.camera, 1);
    assert.equal(h.calls.inference, 0);
    h.camera.resolve(h.stream);
    await flush();
    assert(h.classes.has('blurred'));
    assert.equal(h.calls.inference, 0);
    h.model.resolve(h.detector);
    await prepared;
    assert.equal(h.calls.model, 1);
    assert.equal(h.calls.inference, 1);
    assert.deepEqual(h.signals, ['Movenet Loaded']);
    assert(!h.classes.has('blurred'));
});

test('stop during camera permission cancels queued detection and closes the late stream', async () => {
    const h = harness();
    const prepared = h.window.startCamera('Squat');
    h.window.startDetection();
    h.window.stopCamera();
    h.camera.resolve(h.stream);
    assert.equal(await prepared, false);
    assert.equal(h.calls.stopped, 1);
    assert.equal(h.calls.inference, 0);
    assert(!h.signals.includes('Movenet Loaded'));
});

test('stop during model loading cannot start later; a new session can reuse the loaded detector', async () => {
    const h = harness();
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    await flush();
    h.window.startDetection();
    h.window.stopCamera();
    h.model.resolve(h.detector);
    assert.equal(await prepared, false);
    assert.equal(h.calls.inference, 0);
    assert(!h.signals.includes('Movenet Loaded'));
    assert.equal(await h.window.startCamera('Bend'), true);
    assert.equal(h.calls.model, 1);
    assert.equal(h.calls.inference, 0);
    assert(h.classes.has('blurred'));
    h.window.startDetection();
    assert.equal(h.calls.inference, 1);
});

test('failed model loading leaves no active camera, ready signal, or queued start', async () => {
    const h = harness();
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    await flush();
    h.window.startDetection();
    h.model.reject(new Error('model unavailable'));
    assert.equal(await prepared, false);
    assert.equal(h.calls.stopped, 1);
    assert.equal(h.calls.inference, 0);
    assert(!h.signals.includes('Movenet Loaded'));
    assert(h.classes.has('blurred'));
});

test('a stopped inference cannot emit exercise signals or schedule another frame', async () => {
    const h = harness();
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    h.model.resolve(h.detector);
    await prepared;
    h.window.startDetection();
    h.window.stopCamera();
    const signals = [...h.signals];
    h.inference.resolve([]);
    await flush();
    assert.deepEqual(h.signals, signals);
    assert.equal(h.calls.frames, 0);
});

test('new detection immediately warns when the first frame has no visible pose', async () => {
    const h = harness();
    const warning = 'Please move your body so it is visible in the camera.';
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    h.model.resolve(h.detector);
    await prepared;
    assert(!h.signals.includes(warning));
    h.window.startDetection();
    h.inference.resolve([]);
    await flush();
    assert.deepEqual(h.signals, ['Movenet Loaded', warning]);
    h.window.startDetection();
    await flush();
    assert.equal(h.signals.filter(signal => signal === warning).length, 1);

    h.window.stopCamera();
    await h.window.startCamera('Squat');
    h.window.startDetection();
    await flush();
    assert.equal(h.signals.filter(signal => signal === warning).length, 2);
});

test('pose updates during the visibility delay, then pauses until startExercise', async () => {
    const h = harness();
    assert.equal(h.window.startExercise(), false);
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    h.model.resolve(h.detector);
    await prepared;
    h.window.startDetection();
    assert.equal(h.window.startExercise(), false);
    h.inference.resolve([{ keypoints: [{ x: 1, y: 1, score: 1 }] }]);
    await flush();
    assert(h.fills.includes('#00ff8a'));
    assert.equal(h.loadingMessage.hidden, false);
    assert.deepEqual(h.signals, ['Movenet Loaded', 'playSound']);
    assert.equal(h.window.startExercise(), false);
    h.window.startDetection();
    assert.equal(h.calls.inference, 1);
    h.advance(500);
    await h.nextFrame();
    assert.equal(h.calls.inference, 2);
    assert.equal(h.fills.filter(c => c === '#00ff8a').length, 2);
    assert.equal(h.signals.filter(s => s === 'playSound').length, 1);
    h.advance(1499);
    assert.deepEqual(h.signals, ['Movenet Loaded', 'playSound']);
    h.advance(1);
    assert.deepEqual(h.signals, ['Movenet Loaded', 'playSound', 'Body Visible']);
    assert.equal(h.pendingFrames(), 0);
    assert.equal(h.calls.reps, 0);
    h.advance(60000);
    h.window.startDetection();
    await flush();
    assert.equal(h.calls.inference, 2);
    assert.equal(h.calls.stopped, 0);
    assert.equal(h.window.startExercise(), true);
    assert.equal(h.loadingMessage.hidden, true);
    assert.equal(h.window.startExercise(), false);
    await flush();
    assert.equal(h.calls.inference, 3);
    assert.equal(h.calls.reps, 0);
    assert.equal(h.signals.filter(s => s === 'Detection Starting').length, 1);
    h.advance(5999);
    await h.nextFrame();
    assert.equal(h.calls.reps, 0);
    h.advance(1);
    await h.nextFrame();
    assert.equal(h.calls.reps, 1);
    assert.equal(h.signals.filter(s => s === 'Body Visible').length, 1);
});

test('partial body visibility does not pause; stopping a paused session prevents resume', async () => {
    const h = harness();
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    h.model.resolve(h.detector);
    await prepared;
    h.window.startDetection();
    h.inference.resolve([{ keypoints: [], visible: false }]);
    await flush();
    assert(!h.signals.includes('Body Visible'));
    assert.equal(h.window.startExercise(), false);
    h.detector.estimatePoses = async () => [{ keypoints: [] }];
    await h.nextFrame();
    h.advance(2000);
    assert(h.signals.includes('Body Visible'));
    h.window.stopCamera();
    assert.equal(h.window.startExercise(), false);
    await h.window.startCamera('Squat');
    assert.equal(h.window.startExercise(), false);
    assert(!h.signals.includes('Detection Starting'));
});


test('stop cancels the delayed Body Visible signal', async () => {
    const h = harness();
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    h.model.resolve(h.detector);
    await prepared;
    h.window.startDetection();
    h.inference.resolve([{ keypoints: [] }]);
    await flush();
    h.window.stopCamera();
    h.advance(2000);
    assert(!h.signals.includes('Body Visible'));
    assert.equal(h.window.startExercise(), false);
});

test('an inference finishing after the signal cannot add a second resumed loop', async () => {
    const h = harness();
    const prepared = h.window.startCamera('Squat');
    h.camera.resolve(h.stream);
    h.model.resolve(h.detector);
    await prepared;
    h.window.startDetection();
    h.inference.resolve([{ keypoints: [] }]);
    await flush();
    const oldFrame = deferred();
    h.detector.estimatePoses = () => oldFrame.promise;
    const pendingFrame = h.nextFrame();
    h.advance(2000);
    h.detector.estimatePoses = async () => [{ keypoints: [] }];
    assert.equal(h.window.startExercise(), true);
    assert.equal(h.loadingMessage.hidden, true);
    await flush();
    assert.equal(h.pendingFrames(), 1);
    oldFrame.resolve([{ keypoints: [] }]);
    await pendingFrame;
    assert.equal(h.pendingFrames(), 1);
});
