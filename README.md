# MoveNet exercise tracking

The page stays idle on load. Call these functions from the host app/WebView:

```js
window.startCamera("Squat"); // Prepare camera, exercise config, and MoveNet only.
// Later, when the user is ready:
window.startDetection();    // Check body visibility, then pause.
// After receiving "Body Visible", when the user is ready:
window.startExercise();     // Resume detection and start the six-second countdown.
// When finished:
window.stopCamera();
```

`startCamera(type)` returns a promise resolving to `true` when preparation succeeds,
or `false` if it fails or is cancelled. The camera preview stays blurred while
preparing and while waiting for `startDetection()`. Preparation does not run pose
inference, start the exercise countdown, or count repetitions.

When the camera and MoveNet detector are ready, the page sends the existing exact
App Inventor message `Movenet Loaded` through `setWebViewString`, once per successful
preparation. This signal is sent even if detection has not been requested.

`startDetection()` can be called during preparation or before `startCamera(type)`.
It queues the request until preparation succeeds, then removes the blur and starts
the body visibility check. Repeated calls do not create extra detection loops.
The first frame with all required body points visible sends `Body Visible` and
pauses pose inference. No countdown, scoring, repetition counting, or visibility
warnings run while paused. The camera preview remains live and the model stays
loaded. Calling `startDetection()` again does not bypass this pause.

Call `startExercise()` after `Body Visible` to resume pose inference, send
`Detection Starting`, and begin a fresh six-second countdown. Scoring and counting
begin only after those six seconds have elapsed. The first-visible-body pause
happens only once per session. `startExercise()` returns `true` when it starts;
early calls (before the pause), repeated calls, and calls after `stopCamera()`
return `false` without starting or queuing anything.

`stopCamera()` cancels queued starts and loading sessions, stops camera tracks,
hides the preview, and sends the existing accuracy summary. A subsequent session
requires another `startCamera(type)`, `startDetection()`, and then `startExercise()` call. The loaded model
can be reused. Stop the current session before choosing another exercise.

Supported exercise types: `Squat`, `Bend`, `Lunge`, `Child`, `Circle`, `Butterfly`,
`Cobra`, `Raise`, `Curl`, and `March`.

## Startup regression tests

Run `node --test startup.test.cjs`. These tests mock the browser, camera, and model
to check startup ordering, readiness signals, blur, duplicate calls, cancellation,
loading failure, first-visible-body pause, explicit resume, and countdown timing. Camera permission and real MoveNet inference still require
a browser/device check.
