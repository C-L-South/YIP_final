# MoveNet exercise tracking

The page stays idle on load. Call these functions from the host app/WebView:

```js
window.startCamera("Squat"); // Prepare camera, exercise config, and MoveNet only.
// Later, when the user is ready:
window.startDetection();    // Begin pose detection and exercise tracking.
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
detection. Repeated calls do not create extra detection loops. Once the required
body points are visible, the existing `Detection Starting` signal and six-second
exercise countdown run as before.

`stopCamera()` cancels queued starts and loading sessions, stops camera tracks,
hides the preview, and sends the existing accuracy summary. A subsequent session
requires another `startCamera(type)` and `startDetection()` call. The loaded model
can be reused. Stop the current session before choosing another exercise.

Supported exercise types: `Squat`, `Bend`, `Lunge`, `Child`, `Circle`, `Butterfly`,
`Cobra`, `Raise`, `Curl`, and `March`.

## Startup regression tests

Run `node --test startup.test.cjs`. These tests mock the browser, camera, and model
to check startup ordering, readiness signals, blur, duplicate calls, cancellation,
and loading failure. Camera permission and real MoveNet inference still require
a browser/device check.
