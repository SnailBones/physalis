// kalimba.js
// A wrapper on audiocontext for loading and playing sounds relatively easilly.
// TODO: Clean up, include list of sounds.

class SoundPlayer {
	constructor(path = "visualization/dev_team/Aidan/Assets/Sound/") {
		this.sounds = []
		this.ctx = new AudioContext();
		this.volume = 1 // snake sounds were way too loud // TODO: change this
		this.path = path
		this.tune = 0
	}

	loadFile(file) {
		return fetch(this.path + file)
			.then(response => response.arrayBuffer())
			.then(arrayBuffer => this.ctx.decodeAudioData(arrayBuffer));
	}

	// a broken promise... maybe not the best practice?
	// but a holdover until loading sounds is part of the engine
	startLoading(path) {
		let id = this.sounds.length
		this.sounds[id] = null // better no sound than the wrong sound
		this.loadFile(path).then(result => {
				this.sounds[id] = result
			})
			.catch(e => console.error("Can't load file: ", e));
		return id
	}
	
	// sound, pitch, volume
	play(id, note = 0, volume = 1) {
		// this.sounds[id]
		let buffer = this.sounds[id]
		if (!buffer) {
			console.warn("SoundPlayer: No sound found with id", id + ". It may need time to load")
			return
		}
		let source = this.ctx.createBufferSource();
		source.buffer = buffer;
		note += this.tune
		let rate = Math.pow(2, note / 12);
		source.playbackRate.value = rate

		let gainNode = this.ctx.createGain();
		gainNode.gain.value = this.volume * volume / rate; // compensating for apparantly quieter notes at lower pitches

		source.connect(gainNode)
		gainNode.connect(this.ctx.destination);
		source.start();
	}
}

exports.SoundPlayer = SoundPlayer