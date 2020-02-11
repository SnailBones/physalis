// For when you need to put things in perspective.

// TODO: remove den
// TODO: experiment with organization.
// TODO: resolve how i'm handling scale

class ThingInSpace {
	constructor(scale, screen_w, [position_x, position_y]) {
		this.scale = scale
		let fitInScreen = 1 - this.scale[0] / screen_w
		// 100
		//
		//
		// 0         <O> <O> 
		//  -50         0        50
		this.position = [(position_x - .5) * fitInScreen * 100, position_y, 100]
	}
	flatSize() {
		return [this.scale[0], this.scale[1]]
	}
	sizeInPixels(pixelsPerFoot) {
		// return this.scale.times(pixelsPerFoot)
		return this.scale
	}
	// sizeInFeet(ppf = .01) { // TODO: make these actual feet?
	// 	// return this.scale.times(pixelsPerFoot)
	// 	return [this.scale[0] * ppf, this.scale[1] * ppf, this.scale[2] * ppf]
	// }

}

// exports.init = (den) => {	
	const Zenith = {}
	// var den

	drawRect = (cfx, center, dimensions) => { // center is bottom
		cfx.strokeRect(center[0] - dimensions[0] / 2, center[1] - dimensions[1], dimensions[0], dimensions[1]);
	}

	fillRect = (cfx, center, dimensions) => {
		cfx.fillRect(center[0] - dimensions[0] / 2, center[1] - dimensions[1], dimensions[0], dimensions[1]);
	}

	class Perspective{
		constructor(screen_size, vanishing_point, eye_distance = 4) {
			this.screen = screen_size
			this.vp = vanishing_point
			this.horizon = this.vp[1]
			this.eye_distance = eye_distance
		}
		zToScale(z) {
			// z in in feet
			z *= 50
			let wy = Math.max(z, -this.eye_distance * .9) // cannot be behind the eye
			return this.eye_distance / (wy + this.eye_distance);

		}
		pointToScreen(wx, wy, wz) {
			// wx = wx / 100
			// wz *= 50
			let scale = this.zToScale(wz);
			let sy = this.horizon * (1 - scale)
			sy += scale * wy * this.screen[0]
			let sx = wx * (scale) * this.screen[0] + this.vp[0]
			if (!scale) {
				console.log("input is", [wx, wy, wz])
				console.log("output is", [sx, this.screen[1] - sy, scale] )
			}
			return [sx, this.screen[1] - sy, scale]
		}
		ThingToScreen(thing){
			return pointToScreen(thing.sizeInScreens())

		}
		drawBox(cfx, box, opacity = 0) {
			// box is a ThingInSpace
			// box.position is a point describing the center of the bottom front corner.
			// let depth = box.sizeInFeet()[2];
			let depth = box.sizeInScreens()[2]
			// console.log("box size is", box.scale)
			// console.log("box.sizeInScreens is", box.sizeInScreens())
			// let depth = box.sizeInScreens()[2];
			// let depth = box.sizeInScreens()[2]
			// console.log("size in feet is", box.sizeInFeet())
			let position = box.positionInScreens() // TODO: correct units
			// let back_position = [position[0], position[1], position[2] + depth]
			let z = position[2] // Distance
			cfx.hsv(box.hue, 1 - z / 200, 1 - z / 150)
			// console.log("box position is", box.position)
			// console.log("normalized is", position)
			// console.log("depth is", depth)
			// depth = 100
			let [fx, fy, fscale] = this.pointToScreen(...position)
			// console.log([fx, fy, fscale])
			// let [fx, fy, fscale] = this.pointToScreen(...box.position)
			let front_dim = box.flatSize()
			front_dim[0]*=fscale
			front_dim[1]*=fscale
			// let [back_x, back_y, bscale] = this.pointToScreen(box.position[0], box.position[1], box.position[2]+depth)
			let [back_x, back_y, bscale] = this.pointToScreen(position[0], position[1], position[2] + depth)
			let back_dim = box.flatSize()
			back_dim[0]*=bscale
			back_dim[1]*=bscale

			// console.log("z is", z, "depth is", depth, "eye_distance is", this.eye_distance)
			// fillRect(cfx, [fx, fy], front_dim)
			// console.log([fx, fy], front_dim)
			// draw back
			if (z + depth > -this.eye_distance) {
				drawRect(cfx, [back_x, back_y], back_dim)
				cfx.line(back_x - back_dim[0] / 2, back_y, fx - front_dim[0] / 2, fy)
				cfx.line(back_x + back_dim[0] / 2, back_y, fx + front_dim[0] / 2, fy)
				cfx.line(back_x - back_dim[0] / 2, back_y - back_dim[1], fx - front_dim[0] / 2, fy - front_dim[1])
				cfx.line(back_x + back_dim[0] / 2, back_y - back_dim[1], fx + front_dim[0] / 2, fy - front_dim[1])
			}
			// draw front
			if (z > -this.eye_distance) {
				drawRect(cfx, [fx, fy], front_dim)
			}
			if (opacity >= 0) {
				cfx.setAlpha(opacity * cfx.alpha)
				// if (z > -this.eye_distance) {
				// 	fillRect(cfx, [fx, fy], front_dim)
				// }
				// if (z + depth > -this.eye_distance) {
				// 	fillRect(cfx, [back_x, back_y], back_dim)
				// }
				if (z > 0) {
					fillRect(cfx, [fx, fy], front_dim)
				}
				if (z + depth > 0) {
					fillRect(cfx, [back_x, back_y], back_dim)
				}
			}
		}
		// scaleTex(tex, scale) {
		// 	// console.log("scale is", scale)
		// 	tex.run({
		// 		// todo: clamp to border
		// 		image: sampler | vec4 | xyzClamp, // no looping
		// 		scale: uniform | float,
		// 		horizon: uniform | float,
		// 		main: `
        //         vec2 p = (uv-(1.-scale)*vec2(.5, horizon))/scale;
        //         if (p.x > 1. || p.y > 1. || p.x < 0. || p.y < 0.){
        //             return;
        //         }
        //         outColor = texture(image, p);
        //         // outColor += texture(foreground, p).xxxy * opacity;
        //     `
		// 	}, {
		// 		scale,
		// 		tex,
		// 		horizon: this.vp.y / this.screen.y
		// 	})
		// }
		// addScaled(scene, foreground, scale, opacity) {
		// 	// console.log("scale is", scale)
		// 	scene.run({
		// 		foreground: sampler | vec4 | xyzClamp, // no looping
		// 		// image : sampler | vec4 | xyzClamp, // no looping
		// 		scale: uniform | float,
		// 		horizon: uniform | float,
		// 		opacity: uniform | float,
		// 		main: `
        //         vec2 p = (uv-(1.-scale)*vec2(.5, horizon))/scale;
        //         // outColor = texture(foreground, p);
        //         outColor = thisTexel(image);
        //         if (p.x > 1. || p.y > 1. || p.x < 0. || p.y < 0.){
        //             return;
        //         }
        //         outColor += texture(foreground, p).xxxy * opacity;
        //     `
		// 	}, {
		// 		scale,
		// 		horizon: this.vp.y / this.screen.y,
		// 		foreground,
		// 		opacity
		// 	})
		// }
	}
	// Zenith.Perspective = Perspective
	// Zenith.ThingInSpace = ThingInSpace
	exports.Perspective = Perspective
	exports.ThingInSpace = ThingInSpace

	// return Zenith
// }