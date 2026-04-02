const inputLink = document.getElementById("link-input");
const playButton = document.querySelector(".play-btn");
const liveBadge = document.getElementById("liveBadge");
const liveBadgeText = document.getElementById("liveBadgeText");
const streamEndOverlay = document.querySelector(".stream-end-overlay");
const stopStreamButton = document.getElementById("stop-stream-btn");

const defaultManifestUri = "";

const streamingConfig = {
  streaming: {
    bufferingGoal: 10,
    rebufferingGoal: 1,
    bufferBehind: 10,
    lowLatencyMode: true,
    safeSeekOffset: 1,
  },
};

let player;
let video;
let controls;
let latencyInterval;
let liveStatusInterval;
let isStreamEnded = false;

function writeLog(...args) {
  const el = document.getElementById("log");
  el.textContent +=
    "\n" +
    args
      .map((x) => {
        if (typeof x === "object") {
          try {
            return JSON.stringify(x, null, 2);
          } catch {
            return String(x);
          }
        }
        return String(x);
      })
      .join(" ");
  console.log(...args);
}

function clearLog() {
  document.getElementById("log").textContent = "";
}

function onPlayerError(error) {
  writeLog("PLAYER ERROR CODE:", error.code);
  writeLog(error);
}

function onPlayerErrorEvent(event) {
  onPlayerError(event.detail);
}

function onUIErrorEvent(event) {
  writeLog("UI ERROR:", event.detail);
}

function showStreamEndOverlay() {
  writeLog("Stream has ended.");
  isStreamEnded = true;
  streamEndOverlay.classList.add("show");
}

function updateLiveBadge() {
  if (!player) return;

  if (player.isLive()) {
    liveBadge.style.display = "inline-flex";
  } else {
    liveBadge.style.display = "none";
  }
}

async function loadVideo(manifestUri) {
  if (!player) {
    writeLog("Player is not ready yet.");
    return;
  }

  try {
    if (latencyInterval) clearInterval(latencyInterval);
    if (liveStatusInterval) clearInterval(liveStatusInterval);

    clearLog();
    liveBadge.style.display = "none";

    writeLog("Loading:", manifestUri);

    await player.load(manifestUri);

    writeLog("Video loaded successfully");
    writeLog("isLive:", player.isLive());
    writeLog("Tracks:", player.getVariantTracks());

    updateLiveBadge();

    liveStatusInterval = setInterval(() => {
      updateLiveBadge();
    }, 1000);

    latencyInterval = setInterval(() => {
      const range = player.seekRange();
      const liveEdge = range.end;
      const current = video.currentTime;
      const approxLatencySec = Math.max(0, liveEdge - current);

      console.log("Is live:", player.isLive());
      console.log("Approx live latency (sec):", approxLatencySec);
    }, 3000);
  } catch (error) {
    onPlayerError(error);
  }
}

async function init() {
  writeLog("shaka-ui-loaded fired");

  video = document.getElementById("video");
  const ui = video["ui"];
  controls = ui.getControls();
  player = controls.getPlayer();

  ui.configure({
    controlPanelElements: [
      "play_pause",
      "time_and_duration",
      "spacer",
      "mute",
      "volume",
      "fullscreen",
      "overflow_menu",
    ],
    overflowMenuButtons: ["quality", "language", "captions", "playback_rate"],
    addSeekBar: true,
    addBigPlayButton: true,
  });

  player.configure(streamingConfig);

  window.player = player;
  window.ui = ui;

  player.addEventListener("error", onPlayerErrorEvent);
  controls.addEventListener("error", onUIErrorEvent);

  inputLink.value = defaultManifestUri;

  await loadVideo(defaultManifestUri);
}

function initFailed(event) {
  writeLog("Unable to load Shaka UI");
  writeLog(event.detail);
}

playButton.addEventListener("click", async () => {
  const manifestUri = inputLink.value.trim();

  if (!manifestUri) {
    clearLog();
    writeLog("Please insert a manifest link first.");
    return;
  }

  await loadVideo(manifestUri);
});

inputLink.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    await playButton.click();
  }
});
stopStreamButton.addEventListener("click", async () => {
  if (player) {
    showStreamEndOverlay();
    await player.unload();
  }
});

document.addEventListener("shaka-ui-loaded", init);
document.addEventListener("shaka-ui-load-failed", initFailed);
