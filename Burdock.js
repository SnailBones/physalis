// Burdock.js

// Objects stick to and follow moving depth.

// IMPORTANT: Works much better with sinusoid than gaussian.

const { V } = require("./Vector.js");

// TODO: remove these, use vector
const sqMag = p => p[0] * p[0] + p[1] * p[1]

const mag = p => Math.sqrt(sqMag(p))

const dot = (a, b) => a[0]*b[0]+a[1]*b[1]
// Set magnitude
const setMag = (p, new_mag) => {
	old = mag(p)
	return [p[0] * new_mag / old, p[1] * new_mag / old]
}

const clamp = (a, b, c) => Math.min(c, Math.max(b, a))

// for debugging

let avg = 0
let count = 0

class Circle {
	constructor(radius, position) {
		this.position = position
		this.radius = radius
	}
}

class Stone extends Circle { // A static body. Effectively a puck with infinite mass.
	constructor(rad, pos) {
		super(rad, pos)
	}
}
// fig // Ball // Planet // Tracker // Fig
class Fig extends Circle {
	constructor(rad, pos, active) {
		super(rad, pos)
		this.velocity = [0, 0]
		this.speed = 0
		this.depth = 0
		this.active = active
		this.mass = 1
	}
}

class Burdock {
	constructor(full_size, margins = [0, 0, 0, 0]) {
		this.margin_l = margins[0]
		this.margin_r = margins[1]
		this.margin_t = margins[2]
		this.margin_b = margins[3]

		this.edge_b = full_size[1] - this.margin_b
		this.edge_r = full_size[0] - this.margin_r

		this.game_w = full_size[0] - this.margin_l - this.margin_r
		this.game_h = full_size[1] - this.margin_b - this.margin_t
		this.size = [this.game_w, this.game_h]

		this.figs = []
		this.stones = []

		// this.force = 5000 // force from depth
		// this.force = -5000
		this.force = -80000/60
		// this.fric_touch = 1
		// this.fric_free = 1
		// this.repel = 32 // repel one another
		this.repel = 32
	}

	positions() { // Convert global (canvas) space to local (shader) space.
		// TODO: only get active figs. // TODO: also only get figs in valid place to be hit.
		return this.figs.map(fig => [fig.position[0] - this.margin_l, fig.position[1] - this.margin_t])
		// return this.figs.map(fig => [fig.position[0] - this.margin_l, this.edge_b - fig.position[1]])
		// return this.figs.flatMap(fig => [fig.position[0] - this.margin_l, this.edge_b - fig.position[1], 0, 0])
	}

	// TODO: should time be included?
	updateSpeeds(data, time) { // Ingests ugly GLSL array

		// console.log("time is", time)
		for (let i = 0; i < this.figs.length; i++) {

			let fig = this.figs[i]
			fig.depth = data[i * 4 + 2]
			if (!fig.active) { continue }
			let force = [...data.slice(i * 4, i * 4 + 2)]

			if (force[0] != 0 || force[1] != 0)
			// if (true)
			{
				// let new_velocity = [fig.velocity[0] + force[0] * this.force * time, fig.velocity[1] + force[1] * this.force * time]
				let new_velocity = [force[0] * this.force, force[1] * this.force]
				let old_velocity = fig.velocity
				let new_speed = mag(new_velocity)
				fig.velocity = new_velocity
				fig.speed = new_speed
				// fig.speed = 0
				// console.log("raw data returns ", force)
				// console.log("new_velocity is ", new_velocity)
				// console.log("new_speed is ", new_speed
				// let multiplier = new_speed/mag(force)
				// let multiplier = (this.force * time)
				// let avg_me = multiplier
				// count += 1
				// avg = avg * (1-(1/count)) + avg_me / count
				// console.log("val is " , avg_me, " avg is", avg)
			}
		}

	}


	move(time) {
		// time = Math.min(time, 1/50) // prevents too much jitter
		time = 1/20
		for (let i = 0; i < this.figs.length; i++) {
			let fig = this.figs[i]
			if (!fig.active) {continue} // an active one can still push inactive burs
			
			if (fig.velocity[0] != 0) {
				console.log("velocity is", fig.velocity)
				// console.log("moving distance", fig.velocity[0] * time, fig.velocity[1] * time)
			}

			fig.position[0] += fig.velocity[0] * time
			fig.position[1] += fig.velocity[1] * time
			// collision between burs
			for (let j = i + 1; j < this.figs.length; j++) {
				let bur = this.figs[j]
				if (!bur.active) {continue}
				let diff = V.dif(fig.position, bur.position);
				let sqDist = V.sqMag(diff);
				let colDist = fig.radius + bur.radius;
				if (sqDist <= colDist * colDist) {
					let dist = Math.sqrt(sqDist);
					// let repel = diff.setMag((colDist - dist) * REPEL_POWER * time);
					let repel = V.setMag(diff, (colDist - dist) * this.repel * time)
					fig.position = V.sum(fig.position, repel);
					// if (bur.active){
					bur.position = V.dif(bur.position, repel);
					// }
				}
			}
			fig.velocity = [0, 0]
			fig.position[0] = V.clamp(fig.position[0], this.margin_l + fig.radius, this.edge_r - fig.radius)
			fig.position[1] = V.clamp(fig.position[1], this.margin_t + fig.radius, this.edge_b - fig.radius)
		}
	}

	add(size, position, active = true) {
		let fig = new Fig(size, position, active)
		this.figs.push(fig)
		return fig
	}

	addStone(size, position) {
		let plum = new Stone(size, position)
		this.stones.push(plum)
		return plum
	}

	random(size) { // TODO: avoid collisions with edge or other figs
		let position = [Math.random() * this.game_w + this.margin_l, Math.random() * this.game_h + this.margin_t]
		return this.add(size, position)
	}
	// FIXME: In theory, if two figs somehow occupy the same space, it can remove the wrong one.
	// ALso this is strangely unreliable for some reason.
	// Figs should be given ids and stored in a dictionary.
	same(fig, pome) {
		return fig === pome
		return (fig.position[0] == pome.position[0] && fig.position[1] == pome.position[1])
	}

	eat(fig) {
		for (let i = 0; i < this.figs.length; i++) {
			if (this.same(fig, this.figs[i])) {
				return this.figs.splice(i, 1)
			}
		}
		console.error("Fig cannot be found!", fig)
		console.log("fig is", fig)
		console.log("is not in:", this.figs)
	}

	eatStone(plum) {
		for (let i = 0; i < this.stones.length; i++) {
			if (this.same(plum, this.stones[i])) {
				return this.stones.splice(i, 1)
			}
		}
		console.error("stone cannot be found!", plum)
	}

	eatAll() {
		this.figs = []
		this.stones = []
	}

	drawBagel(cfx, center, r) {
		// console.log("drawing fig at center", center, "radius", r)
		cfx.strokeCircle(center[0], center[1], r - cfx.context.lineWidth / 2);
		cfx.strokeCircle(center[0], center[1], 8);
	}

	draw(cfx) {

		// console.log("this figs is", this.figs)
		for (let fig of this.figs) {
			// console.log("fig is", fig)
			// console.log("speed is", fig.speed)
			// cfx.hsv(fig.depth, 1, 1)
			cfx.hsv(fig.speed/7000, 1, 1)
			this.drawBagel(cfx, fig.position, fig.radius)
		}
	}

}
// exports.Fig = Fig
exports.Burdock = Burdock

// It's well known that bouncing was invented by Sir Isaac Newton, when a fig fell on his head.