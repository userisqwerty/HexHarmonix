const audioToggle = document.getElementById('audio-toggle');
const pitchSlider = document.getElementById('pitch-slider');
const pitchValue = document.getElementById('pitch-value');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const waveType = document.getElementById('wave-type');

const statusLine = document.getElementById('status-line');
const routeLine = document.getElementById('route-line');
const waveLine = document.getElementById('wave-line');

const jackIn = document.getElementById('jack-in');
const jackOut = document.getElementById('jack-out');
const jackMod = document.getElementById('jack-mod');

const synthKeys = document.querySelectorAll('.synth-key');

let audioCtx = null;
let masterGainNode = null;
let isEngineOn = false;
let activeNotes = {};

const subHarmonicRatios = [1, 0.5, 1.5];

function updateHardwareTelemetry(status, wave) {
    if (status === "ACTIVE") {
        statusLine.innerText = `SYS.STATUS: ${status}`;
        routeLine.innerText = `SIGNAL.PATH: PERFORMANCE`;
        waveLine.innerText = `WAVEFORM: ${wave.toUpperCase()}`;
        statusLine.style.color = "#a3e57e";
        routeLine.style.color = "#a3e57e";
        waveLine.style.color = "#a3e57e";
        jackIn.style.backgroundColor = "#a3e57e";
        jackOut.style.backgroundColor = "#a3e57e";
        jackMod.style.backgroundColor = "#ffb834";
    } else {
        statusLine.innerText = `SYS.STATUS: STANDBY`;
        routeLine.innerText = `SIGNAL.PATH: LOCKED`;
        waveLine.innerText = `WAVEFORM: NONE`;
        statusLine.style.color = "#f28482";
        routeLine.style.color = "#a499be";
        waveLine.style.color = "#a499be";
        jackIn.style.backgroundColor = "#14110e";
        jackOut.style.backgroundColor = "#14110e";
        jackMod.style.backgroundColor = "#14110e";
    }
}

function startNote(frequency, keyIdentifier) {
    if (!isEngineOn) return;
    if (activeNotes[keyIdentifier]) return;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGainNode = audioCtx.createGain();
        masterGainNode.connect(audioCtx.destination);
    }

    const currentVolume = parseFloat(volumeSlider.value) / 100;
    const pitchOffset = parseFloat(pitchSlider.value);
    const finalBaseFreq = frequency + pitchOffset;

    const voiceGainNode = audioCtx.createGain();
    voiceGainNode.connect(masterGainNode);
    voiceGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    voiceGainNode.gain.linearRampToValueAtTime(currentVolume * 0.25, audioCtx.currentTime + 0.05);

    masterGainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

    const voiceOscillators = [];
    subHarmonicRatios.forEach((ratio) => {
        const osc = audioCtx.createOscillator();
        osc.type = waveType.value;
        osc.frequency.setValueAtTime(finalBaseFreq * ratio, audioCtx.currentTime);
        osc.connect(voiceGainNode);
        osc.start();
        voiceOscillators.push(osc);
    });

    activeNotes[keyIdentifier] = {
        gainNode: voiceGainNode,
        oscillators: voiceOscillators
    };

    const targetVisualButton = document.querySelector(`.synth-key[data-key="${keyIdentifier}"]`);
    if (targetVisualButton) {
        targetVisualButton.classList.add('key-active');
    }
}

function stopNote(keyIdentifier) {
    const noteInstance = activeNotes[keyIdentifier];
    if (!noteInstance) return;

    const gainNode = noteInstance.gainNode;
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.08);

    setTimeout(() => {
        noteInstance.oscillators.forEach(osc => {
            osc.stop();
            osc.disconnect();
        });
        gainNode.disconnect();
    }, 100);

    delete activeNotes[keyIdentifier];

    const targetVisualButton = document.querySelector(`.synth-key[data-key="${keyIdentifier}"]`);
    if (targetVisualButton) {
        targetVisualButton.classList.remove('key-active');
    }
}

audioToggle.addEventListener('click', () => {
    isEngineOn = !isEngineOn;
    if (isEngineOn) {
        audioToggle.innerText = "HALT MAIN ENGINE";
        audioToggle.style.backgroundColor = "#ffbb33";
        audioToggle.style.color = "#000000";
        updateHardwareTelemetry("ACTIVE", waveType.value);
    } else {
        Object.keys(activeNotes).forEach(key => stopNote(key));
        audioToggle.innerText = "POWER MAIN ENGINE";
        audioToggle.style.backgroundColor = "#f28482";
        audioToggle.style.color = "#ffffff";
        updateHardwareTelemetry("STANDBY", waveType.value);
    }
});

synthKeys.forEach(btn => {
    const noteFreq = parseFloat(btn.getAttribute('data-note'));
    const keyBind = btn.getAttribute('data-key');

    btn.addEventListener('mousedown', () => startNote(noteFreq, keyBind));
    btn.addEventListener('mouseup', () => stopNote(keyBind));
    btn.addEventListener('mouseleave', () => stopNote(keyBind));
});

window.addEventListener('keydown', (e) => {
    const pressedKey = e.key.toLowerCase();
    const matchingBtn = document.querySelector(`.synth-key[data-key="${pressedKey}"]`);
    if (matchingBtn) {
        const noteFreq = parseFloat(matchingBtn.getAttribute('data-note'));
        startNote(noteFreq, pressedKey);
    }
});

window.addEventListener('keyup', (e) => {
    const releasedKey = e.key.toLowerCase();
    stopNote(releasedKey);
});

pitchSlider.addEventListener('input', (e) => {
    pitchValue.innerText = e.target.value + 'Hz';
});

volumeSlider.addEventListener('input', (e) => {
    volumeValue.innerText = e.target.value + '%';
});

waveType.addEventListener('change', (e) => {
    if (isEngineOn) {
        updateHardwareTelemetry("ACTIVE", e.target.value);
    }
});

updateHardwareTelemetry("STANDBY", waveType.value);
