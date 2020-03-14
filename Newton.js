// Do you like bouncing, hitting, catching throwing things?


// No need for GLSL, this all happens on the CPU.

// Helpful Vector Functions
// Square of magnitude

// TODO: move these into a math library?
const sqMag = p => p[0] * p[0] + p[1] * p[1]

const mag = p => Math.sqrt(sqMag(p))

const dot = (a, b) => a[0]*b[0]+a[1]*b[1]
// Set magnitude
const setMag = (p, new_mag) => {
	old = mag(p)
	return [p[0] * new_mag / old, p[1] * new_mag / old]
}

const clamp = (a, b, c) => Math.min(c, Math.max(b, a))



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
	fossilize() {
		this.active = false
		this.speed = 0
		this.velocity = [0, 0]
	}
}

class Newton {
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

		this.force = 5000 // force from depth
		this.fric_touch = .95
		this.fric_free = .95
		// this.gravity = 5000 // force downward
		this.gravity = 0
		this.bounce_strength = .96 // between 0 and 1
		// this.fric_touch = 1
		// this.fric_free = 1
		this.fig_repel = 2 // repel one another
	}

	// Override these functions to add sounds, win events, etc.
	onHit(fig, pome, force) { return }
	onHitWall(fig, wall) { return } // wall is string: "left", "bottom", "right". force can be deduced from speed of fig.
	onHitDepth(fig, force) { return }

	positions() { // Convert global (canvas) space to local (shader) space.
		// TODO: only get active figs. // TODO: also only get figs in valid place to be hit.
		return this.figs.map(fig => [fig.position[0] - this.margin_l, fig.position[1] - this.margin_t])
		// return this.figs.map(fig => [fig.position[0] - this.margin_l, this.edge_b - fig.position[1]])
		// return this.figs.flatMap(fig => [fig.position[0] - this.margin_l, this.edge_b - fig.position[1], 0, 0])
	}

	// TODO: should time be included?
	updateSpeeds(data, time) { // Ingests ugly GLSL array
		for (let i = 0; i < this.figs.length; i++) {
			let fig = this.figs[i]
			fig.depth = data[i * 4 + 2]
			if (!fig.active) { continue }
			let force = [...data.slice(i * 4, i * 4 + 2)]

			if (force[0] != 0 || force[1] != 0)
			{
				let new_velocity = [fig.velocity[0] + force[0] * this.force * time, fig.velocity[1] + force[1] * this.force * time]
				let old_velocity = fig.velocity
				let old_speed = mag(old_velocity)
				let new_speed = mag(new_velocity)
				let angle_between = Math.acos(dot(old_velocity, new_velocity) / (old_speed * new_speed))
				if (angle_between > Math.PI / 8) {
					let change = mag([new_velocity[0]-old_velocity[0], new_velocity[1]-old_velocity[1]])
					this.onHitDepth(fig, change)
				}
				fig.velocity = new_velocity
				// fig.speed = mag(new_speed)
				fig.speed = new_speed
			}
		}

	}

	applyFriction(fig, time){
		// A model of gaseous air friction, meaning friction increases at high speeds and is negligable at low speeds.
		let speed_squared = fig.velocity[0] * fig.velocity[0] + fig.velocity[1] * fig.velocity[1]
		let speed = Math.sqrt(speed_squared)
		fig.speed = speed
		// let impact = force_squared ? 1 : 0

		let friction = fig.depth ? this.fric_touch : this.fric_free
		// let friction = .00001
		// let friction = this.fric_free
		if (speed > 0) {
			// normalized friction direction
			let norm = [-fig.velocity[0] / fig.speed, -fig.velocity[1] / fig.speed]
			let multiplier = friction * speed_squared*time
			multiplier = Math.min(multiplier, speed) // Friction can at most stop it, no going negative.
			let friction_force = [norm[0] * multiplier, norm[1] * multiplier]
			// console.log("speed is", speed)
			// console.log("friction force relative to speed is", [norm[0] * friction * speed, norm[1] * friction * speed])
			// console.log("friction force is", friction_force)
			fig.velocity[0] += friction_force[0]
			fig.velocity[1] += friction_force[1]
		}
	}

	bounceOffWalls(fig, time){
		let bounce = this.bounce_strength
		let snap_back = .1 // 1 is instantly snap back into bounds
		if (fig.position[0] < this.margin_l + fig.radius) {
			if (fig.velocity[0] < 0) {
				this.onHitWall(fig, "left")
				fig.velocity[0] = -fig.velocity[0] * bounce
			}
			// fig.position[0] = this.margin_l+fig.radius
			let out_distance = this.margin_l + fig.radius - fig.position[0]
			// console.log("out by ", out_distance, "snap_back is", snap_back)
			fig.position[0] += out_distance * snap_back
			// console.log("position is", fig.position, "velocity is", fig.velocity)
			// console.log("position is", fig.position, "velocity is", fig.velocity)

		}
		else if (fig.position[0] > this.edge_r - fig.radius) {
			if (fig.velocity[0] > 0) {
				this.onHitWall(fig, "right")
				fig.velocity[0] = -fig.velocity[0] * bounce
			}
			// fig.position[0] = this.edge_r-fig.radius
			let out_distance = this.edge_r - fig.radius - fig.position[0]
			fig.position[0] += out_distance * snap_back
		}
		// bounce off bottom
		if (fig.position[1] > this.edge_b - fig.radius) {
			if (fig.velocity[1] > 0) {
				this.onHitWall(fig, "bottom")
				fig.velocity[1] = -fig.velocity[1] * bounce
				// console.log("velocity is", fig.velocity[1])
			}
			let out_distance = fig.position[1] - (this.edge_b - fig.radius)
			fig.position[1] -= out_distance * snap_back
		}
	}

	// Lossless collision
	collide(fig, pome) {

		// exchange velocities along the normal vector
		// let normal = pome.position.minus(fig.position).norm // unit vector. velocities change along here
		let normal = setMag([pome.position[0] - fig.position[0], pome.position[1]- fig.position[1]], 1)
		// console.log("normal is", normal.times(12))
		let tangent = [-normal[1], normal[0]] // vector tangent to surface of collision. velocities do not change.

		// vector projections
		let speed_normal_1 = dot(fig.velocity, normal) // these change
		let speed_normal_2 = dot(pome.velocity, normal)

		// Don't bounce toward eachother and get stuck
		if (speed_normal_1 - speed_normal_2 < 0) { return }

		let speed_tangent_1 = dot(fig.velocity, tangent) // these don't
		let speed_tangent_2 = dot(pome.velocity, tangent)


		let new_speed_1 = speed_normal_2
		let new_speed_2 = speed_normal_1

		// 1d collision formula
		new_speed_1 = (speed_normal_1 * (fig.mass - pome.mass) + speed_normal_2 * 2 * pome.mass) / (fig.mass + pome.mass)
		new_speed_2 = (speed_normal_2 * (pome.mass - fig.mass) + speed_normal_1 * 2 * fig.mass) / (fig.mass + pome.mass)

		// fig.velocity = tangent.times(speed_tangent_1).plus(normal.times(new_speed_1))
		// pome.velocity = tangent.times(speed_tangent_2).plus(normal.times(new_speed_2))
		fig.velocity[0] = tangent[0] * speed_tangent_1 + normal[0] * new_speed_1
		fig.velocity[1] = tangent[1] * speed_tangent_1 + normal[1] * new_speed_1
		pome.velocity[0] = tangent[0] * speed_tangent_2 + normal[0] * new_speed_2
		pome.velocity[1] = tangent[1] * speed_tangent_2 + normal[1] * new_speed_2
		// fig.velocity = tangent.times(speed_tangent_1).plus(normal.times(new_speed_1))
		// pome.velocity = tangent.times(speed_tangent_2).plus(normal.times(new_speed_2))

		// console.log("speed normals is", speed_normal_1, " and ", speed_normal_2)
		let collision_force = Math.abs(speed_normal_1 - speed_normal_2)
		this.onHit(fig, pome, collision_force)
	}

	collideWithStone(fig, stone){
		let normal = setMag([stone.position[0] - fig.position[0], stone.position[1] - fig.position[1]], 1)
		let tangent = [-normal[1], normal[0]]

		let speed_normal = dot(fig.velocity, normal)
		let speed_tangent = dot(fig.velocity, tangent)
		// let speed_normal = puck.velocity.dot(normal)
		// let speed_tangent = puck.velocity.dot(tangent)

		// puck.velocity = tangent.times(speed_tangent).plus(normal.times(-speed_nosrmal))

		fig.velocity[0] = tangent[0] * speed_tangent + normal[0] * -speed_normal
		fig.velocity[1] = tangent[1] * speed_tangent + normal[1] * -speed_normal
		this.onHitStone(fig, stone, speed_normal)
	}

	bounce(time) { // bounce off eachother
		for (let i = 0; i < this.figs.length; i++) {
			let fig = this.figs[i]

			// collision between figs
			for (let j = i + 1; j < this.figs.length; j++) {
				let pome = this.figs[j]
				let dif = [fig.position[0] - pome.position[0], fig.position[1] - pome.position[1]]
				let sqDist = sqMag(dif)
				let colDist = fig.radius + pome.radius;
				if (sqDist <= colDist * colDist) {
					this.collide(fig, pome) 
					// this handles cases where they get stuck together
					let dist = Math.sqrt(sqDist);
					let repel = setMag(dif, (colDist - dist) * this.fig_repel * time)
					fig.position[0] += repel[0]
					fig.position[1] += repel[1]
					pome.position[0] -= repel[0]
					pome.position[1] -= repel[1]
				}
			}
			// collision with stone
			for (let j = 0; j < this.stones.length; j++) {
				// console.log("checking figs[", i,"] and rocks[", j, "]")
				let stone = this.stones[j]
				let dif = [fig.position[0] - stone.position[0], fig.position[1] - stone.position[1]]
				let sqDist = sqMag(dif)
				let colDist = fig.radius + stone.radius
				if (sqDist <= colDist * colDist) {
					// console.log("figs [", i, "] hit stones [", j, "]")
					this.collideWithStone(fig, stone)
					let dist = Math.sqrt(sqDist);
					let repel = setMag(dif, (colDist - dist) * this.fig_repel * time)
					fig.position[0] += repel[0]
					fig.position[1] += repel[1]
				}
			}
		}
	}

	each(fig, time){

	}

	move(time) {
		for (let i = 0; i < this.figs.length; i++) {
			let fig = this.figs[i]
			this.each(fig, time)

			this.bounceOffWalls(fig, time) // keep inactive figs in game even if they get pushed
			if (!fig.active) {continue}

			if (!fig.depth && fig.position[1] + fig.radius < this.edge_b) // make figs easier to lift by having no gravity when touching
				fig.velocity[1] += this.gravity * time

			this.applyFriction(fig, time)
			
			fig.position[0] += fig.velocity[0] * time
			fig.position[1] += fig.velocity[1] * time
		}
		this.bounce(time)
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
			if (this.samePuck(plum, this.stones[i])) {
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
			// cfx.hsv(fig.depth, 1, 1)
			cfx.hsv(fig.speed/7000, 1, 1)
			this.drawBagel(cfx, fig.position, fig.radius)
		}
	}

}
// exports.Fig = Fig
exports.Newton = Newton

// It's well known that bouncing was invented by Sir Isaac Newton, when a fig fell on his head.