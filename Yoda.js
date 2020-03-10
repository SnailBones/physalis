// Exert a force now your depth will.
// Combine with Newton or Burdock for use with balls or tracking.

const Staples = require("./Staples.js")

exports.init = (den) =>
{
	const ST = Staples.init(den)

	// Helpful Vector Functions
	// Square of magnitude
	// let sqMag = p => p[0]*p[0]+p[1]*p[1]

	// // Set magnitude
	// let setMag = (p, mag) => {
	// 	old = Math.sqrt(sqMag(p))
	// 	return [p[0]*mag/old, p[1]*mag/old]
	// }
	// Puck / Ball / Planet / Follower // TODO: split this into another file: newton.js
	class Orb {
		constructor(rad, pos) {
			this.position = pos
			this.radius = rad
			this.velocity = [0, 0];
			this.speed = 0
		}
	}

	// World class


	class Force {
		static smallDepth = den.f1tex([1, 1]) // Used for downsampling, size adjusted dynamically.
		static smallField = den.f2tex([1, 1])
		constructor(full_size, range, curve = ST.sinusoid, quality = 1, margins = [0, 0, 0, 0]) {
			// this.size = size
			this.margin_l = margins[0]
			this.margin_r = margins[1]
			this.margin_t = margins[2]
			this.margin_b = margins[3]

			this.edge_b = full_size[1] - this.margin_b
			this.edge_r = full_size[0] - this.margin_r

			this.game_w = full_size[0] - this.margin_l - this.margin_r
			this.game_h = full_size[1] - this.margin_b - this.margin_t
			this.size = [this.game_w, this.game_h]


			this.depth = den.f1tex(this.size) // Depth: Lets us check for collision
			this.field = den.f2tex(this.size) // Derivative of depth, applied to objects as a force
			this.viz = den.f4tex(full_size) // for debugging or effects. big for easy output
			
			this.motions = den.f4tex([1, 1]); // Used to batch retrieve depth and direction at any number of points

			this.range = range // 180 is 3 feet with 5 ppi
			this.quality = quality

			this.curve = curve// TODO: set curve to gaussian for attraction


			// TODO: move these to child library
			// this.fric_touch = .95
			// this.fric_free = .95
			// this.orb_repel
		}

		orbPosition(orb,) { // Relative position of orbs TODO: remove negative?
			return [orb.position[0] - this.margin_l, this.edge_b - orb.position[1]]
		}
		// TODO: find a way to implement clamp_to_border so we can use texture() instead of texelFetch()
		// or just bite the bullet and do it manually
		
		// forceAt(positions) {
		// 	// return positions
		// 	if (!positions.length) {return positions}
		// 	// positions looks something like this: [[x, y], [x, y], [x, y]]
		// 	// we map it to this [x, y, 0, 0, x, y, 0, 0... ]
		// 	// TODO: find a more efficinet way, maybe use two textures
		// 	let data = positions.flatMap(p => [p[0], p[1], 0, 0]);
		// 	this.motions.setData([positions.length, 1], data)
		// 	// Get new accelerations
		// 	this.motions.frag({
		// 		depth: den.f1tex | den.input | den.xyzClamp,
		// 		field: den.f2tex | den.input | den.xyzClamp,
		// 		size: den.float2,
		// 		render: `
		// 			vec2 uv = texture(image, pixel/res).xy/size;
		// 			vec2 f = texture(field, uv).xy;
		// 			float d = texture(depth, uv).x;
		// 			outColor = vec4(f, d, 0);
		// 		`
		// 	}, { depth: this.depth, field: this.field, size: this.size });
		// 	return this.motions.getData();
		// }
		forceAt(positions) {
			// return positions
			if (!positions.length) { return positions }
			// positions looks something like this: [[x, y], [x, y], [x, y]]
			// we map it to this [x, y, 0, 0, x, y, 0, 0... ]
			// TODO: find a more efficient way, maybe use two textures
			let data = positions.flatMap(p => [p[0], p[1], 0, 0]);
			this.motions.setData([positions.length, 1], data)
			// Get new accelerations
			this.motions.frag({
				depth: den.f1tex | den.input | den.xyzClamp,
				field: den.f2tex | den.input | den.xyzClamp,
				size: den.float2,
				render: `
					ivec2 position = ivec2(texture(image, pixel/res).xy);
					vec2 f = texelFetch(field, position, 0).xy;
					float d = texelFetch(depth, position, 0).x;
					// vec2 f = texture(field, uv).xy;
					// float d = texture(depth, uv).x;
					outColor = vec4(f, d, 0);
				`
			}, { depth: this.depth, field: this.field, size: this.size });
			return this.motions.getData();
		}

		static dxy(tex, multiplier){
			return tex.frag({
				image: den.f2tex | den.input | den.xyzClamp, // this line means no loops
				mult: den.float,
				outColor: den.f2tex | den.output,
				render: `
					// Need to use pixel sampling instead of texels for xyzclamp to work
					// i. e. : texture(tex,(coord)/res), not texelFetch
					outColor.x = texture(image, (pixel + vec2(1, 0))/res).x - texture(image, (pixel + vec2(-1, 0))/res).x;
					outColor.y = texture(image, (pixel + vec2(0, 1))/res).x - texture(image, (pixel + vec2(0, -1))/res).x;
					// outColor = fwidth(pixel.xy);
					// float dx = dFdx(pixel.x);
					// float dy = dFdy(pixel.y);
					// outColor = vec2(dx, dy);
					outColor *= mult;
				`
			}, { mult: multiplier / 2 })
		}

		// an attempt using dFdx. doesn't work great. bottleneck is blur anyway.
		static fastDxy(tex, multiplier) {
			// return
			return tex.frag({
				image: den.f2tex | den.input | den.xyzClamp, // this line means no loops
				mult: den.float,
				outColor: den.f2tex | den.output,
				frag: `
					// # define GL_OES_standard_derivatives 1
					void render(){
						// Need to use pixel sampling instead of texels for xyzclamp to work
						// i. e. : texture(tex,(coord)/res), not texelFetch
						float val = texture(image, pixel/res).x;
						// outColor = fwidth(pixel.xy);
						float dx = dFdx(val);
						float dy = dFdy(val);
						outColor = vec2(dx, dy);
						// outColor.x = val;
						outColor *= mult;
					}
				`
			}, { mult: multiplier * 4 })
		}

		// blur and dxdy while downsampled
		static blurAndForce(depth, field, r, quality, multiplier, curve) {
			let radius = Math.floor(r * quality);
			if (radius <= 0){
				console.error("Cannot blur with radius ", r, "& quality", quality)
			}
			// let curve = ST.gaussian
			let kernel = ST.kernel(radius, curve); // TODO: push into ST?
			if (quality < 1) {
				let small = [depth.size[0] * quality, depth.size[1] * quality]
				Force.smallDepth.setData(small)
				Force.smallField.setData(small) // we could get away with only using 1
				ST.copy(Force.smallDepth, depth)
				ST.blurKernel(Force.smallDepth, kernel, 1)
				ST.copy(Force.smallField, Force.smallDepth)
				Force.dxy(Force.smallField, multiplier * quality)
				// Force.fastDxy(Force.smallField, multiplier * quality)

				// Scale back up, linear interpolation smooths both.
				ST.copy (depth, Force.smallDepth)
				ST.copy(field, Force.smallField)
			} else {
				// Don't bother downsampling if full quality
				ST.blurKernel(depth, kernel, 1);
				ST.copy(field, depth)
				Force.dxy(field, multiplier)
			}
		}

		update(depth, range = this.range, quality = this.quality) {
			// let curve = ST.gaussian
			// range = 400
			ST.debord(this.depth, depth, [this.margin_l, this.margin_t])

			// ST.debord(this.depth, depth, [0, 0])
			// this.depth = depth
			// let blur = Math.abs(range)
			let blur = this.range
			// let repel = Math.sign(range)
			// let quality = 1/2
			// ST.blur(this.depth, blur, 1 / 16)
			Force.blurAndForce(this.depth, this.field, blur, quality, -6 * range, this.curve)
			// Force.blurAndForce(this.depth, this.field, blur, quality, -10 * range)
			// bigger range gets a bigger multiplier to balance out the blur-induced fading.
		}
		getDepth() {
			return ST.undebord(this.viz, this.depth, [this.margin_l, this.margin_t])
		}
		getField(){
			return ST.undebord(this.viz, this.field, [this.margin_l, this.margin_t])
		}
		prettyField(mult = .1) {
			// TODO: xytohue
			return ST.undebord(this.viz, this.field, [this.margin_l, this.margin_t])._xy2hue(mult)
		}
	}
	return Force
}