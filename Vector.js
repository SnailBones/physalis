// some helpful math

// exports.Vector = Vector
const V = {

	// Float math functions

	clamp: (a, b, c) => Math.min(c, Math.max(b, a)),

	clamp01: (a) => V.clamp(a, 0, 1),

	mod: (x, n) => (x % n + n) % n,

	lerpVal: (start, goal, amt) => goal * amt + start * (1 - amt),

	// 2D Vector math

	sqMag: p => p[0] * p[0] + p[1] * p[1],

	mag: p => Math.sqrt(V.sqMag(p)),
	// mag: p => boop(p),

	dot: (a, b) => a[0] * b[0] + a[1] * b[1],
	// Set magnitude
	setMag: (p, new_mag) => {
		old = V.mag(p)
		return [p[0] * new_mag / old, p[1] * new_mag / old]
	},

	sum: (a, b) => [a[0] + b[0], a[1] + b[1]],

	dif: (a, b) => [a[0] - b[0], a[1] - b[1]],

	sqDist: (a, b) => V.sqMag(V.dif(a, b)),

	angle: ([x, y]) => Math.atan2(y, x),

	angleBetween: (a, b) => V.angle(V.dif(b, a)),

	//lerp a 2d vector
	lerp: (start, goal, amt) => {
		return [V.lerpVal(start[0], goal[0], amt), V.lerpVal(start[1], goal[1], amt)]
	},

	// lerp around a circle in the shortest direction
	lerpAngle: (start, goal, amt) => {
		if (Math.abs(goal - start) > Math.PI) {
			if (goal > start) {
				start += Math.PI * 2
			}
			else { goal += Math.PI * 2 }
		}
		return (goal * amt + start * (1 - amt)) % (Math.PI * 2)
	}
}
exports.V = V