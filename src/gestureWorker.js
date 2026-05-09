import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

let gestureRecognizer = null;

function serializeLandmark(landmark) {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  };
}

function serializeCategory(category) {
  if (!category) {
    return null;
  }
  return {
    categoryName: category.categoryName ?? "None",
    score: Number.isFinite(category.score) ? category.score : 0,
  };
}

self.addEventListener("message", async (event) => {
  const { type } = event.data ?? {};

  if (type === "init") {
    const { wasmPath, modelAssetPath, options } = event.data;
    try {
      const vision = await FilesetResolver.forVisionTasks(wasmPath);
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
        },
        runningMode: "VIDEO",
        ...options,
      });
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "error",
        stage: "init",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (type === "detect") {
    const { frame, timestamp } = event.data;
    try {
      if (!gestureRecognizer || !frame) {
        return;
      }
      const result = gestureRecognizer.recognizeForVideo(frame, timestamp);
      const hands = (result.landmarks ?? []).map((landmarks, index) => ({
        landmarks: landmarks.map(serializeLandmark),
        worldLandmarks: (result.worldLandmarks?.[index] ?? []).map(serializeLandmark),
        handedness: serializeCategory(result.handednesses?.[index]?.[0]),
        gesture: serializeCategory(result.gestures?.[index]?.[0]),
      }));
      self.postMessage({ type: "result", hands, timestamp });
    } catch (error) {
      self.postMessage({
        type: "error",
        stage: "detect",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      frame?.close?.();
    }
  }
});
