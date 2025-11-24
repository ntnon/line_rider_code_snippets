window.store.dispatch({
  type: "SET_PLAYBACK_DIMENSIONS",
  payload: { width: 1920, height: 1080 },
});

window.store.dispatch({
  type: "SET_VIEW_OPTION",
  payload: { key: "playbackPreview", value: true },
});

window.store.dispatch({
  type: "SET_AUDIO_OFFSET",
  payload: 0,
});

window.store.dispatch({
  type: "SET_AUDIO_VOLUME",
  payload: 0.25,
});

window.store.dispatch({
  type: "SET_INTERPOLATE",
  payload: false, // Smooth = true; 40 fps = false; 60 fps = 60;
});

getLayerVisibleAtTime = (id, ind) => {
  if (!window.idToIndex) {
    window.idToIndex = [];

    const getSimulatorTrack = (state) => state.simulator.engine;
    const getTrackLayers = (state) =>
      getSimulatorTrack(state).engine.state.layers;

    for (let [i, layer] of [
      ...getTrackLayers(window.store.getState()),
    ].entries()) {
      window.idToIndex[layer.id] = i;
    }
  }

  id = window.idToIndex[id];

  return true;
};

store.dispatch({
  type: "SET_PLAYBACK_FOLLOWER_SETTINGS",
  payload: {
    maxZoom: 32,
    // area: 1,
    pull: 0.8,
    push: 0.01,
    roundness: 0.5,
    squareness: 0,
  },
});

getCamFocus = createFocuser([[0, [1, 0, 0]]], 0);

getCamBounds = createBoundsPanner([[0, { w: 0.4, h: 0.4, x: 0, y: 0 }]], 0);

timeRemapper = createTimeRemapper([[0, 1]], false);

getAutoZoom = createZoomer([[0, 1]], 0);

setCustomRiders([
  ``,
  `.flag { fill: #FD4F38; opacity: 0.4; }
  .scarfOdd { fill: #FD4F38; }`,
  `.flag { fill: #06A725; opacity: 0.4; }
  .scarfOdd { fill: #06A725; }`,
  `.flag { fill: #3995FD; opacity: 0.4; }
  .scarfOdd { fill: #3995FD; }`,
  `.flag { fill: #FFD54B; opacity: 0.4; }
  .scarfOdd { fill: #FFD54B; }`,
  `.flag { fill: #62DAD4; opacity: 0.4; }
  .scarfOdd { fill: #62DAD4; }`,
  `.flag { fill: #D171DF; opacity: 0.4; }
  .scarfOdd { fill: #D171DF; }`,
]);

window.store.getState().camera.playbackFollower._frames.length = 0;
window.store.getState().simulator.engine.engine._computed._frames.length = 1;
