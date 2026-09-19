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
    const calls = { camera: 0, model: 0, inference: 0, stopped: 0, frames: 0 };
    const stream = { getTracks: () => [{ stop: () => calls.stopped++ }] };
    const video = {
        classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
        style: {}, readyState: 1, play: async () => {}, srcObject: null
    };
    const canvas = { style: {}, getContext: () => ({ clearRect() {} }) };
    const bar = { style: {} };
    const window = {
        innerWidth: 640, innerHeight: 480, addEventListener() {},
        AppInventor: { setWebViewString: text => signals.push(text) }
    };
    vm.runInNewContext(source, {
        window, document: { getElementById: id => ({ video, canvas, similarityBar: bar }[id]) },
        navigator: { mediaDevices: { getUserMedia: () => { calls.camera++; return camera.promise; } } },
        tf: { ready: async () => {} },
        poseDetection: {
            SupportedModels: { MoveNet: 'MoveNet' },
            movenet: { modelType: { SINGLEPOSE_THUNDER: 'thunder' } },
            createDetector: () => { calls.model++; return model.promise; }
        },
        getExeCfg: id => ({ id, ang_idx: [1, 2] }),
        requestAnimationFrame: () => ++calls.frames,
        cancelAnimationFrame() {}, console: { error() {} }
    });
    const detector = { estimatePoses: () => { calls.inference++; return inference.promise; } };
    return { window, calls, classes, signals, camera, model, inference, stream, detector, video };
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
