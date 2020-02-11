// Simple Rectangular Colliders. Circular colliders are better handled as points.
// Each sensor performs multiple shader passes to check for collisions.
// Highly accurate but currently slow. Not reccomended for use with large numbers of sensors.

// TODO: getData() is slow even on very small texture
// I should handle multiple textures within the gpu like old colliders

const Staples = require("./Staples.js")

//
exports.init = (den) =>
{
	const ST = Staples.init(den)

	const cut = den.f4tex(); 

	class Sensor {

		// constructor([width, height], [x, y]) {
		constructor(size, center) {
			this.size = size
			this.center = center
			this.filled = null
		}
		// cut off everything that's not the center
		static debord(cut, tex, center, size) {
			// console.log("float", float)
			// let cut = den.f4tex(size); // TODO: don't create textures willy nilly like this, pass it in
			// return ST.debord(cut, tex, center, size)
			// let offset = center.minus(size.times(.5))
			// let offset = [center[0]-size[0]/2, tex.size.y-center[1]-size[1]/2]
			let offset = [center[0] - size[0] / 2, center[1] - size[1] / 2]
			return cut.frag(
			{
				tex: den.f4tex | den.input,
				offset: den.int2,
				render: `
					outColor = texelFetch(tex, texel + offset,0);
					// outColor = _thisTexel(image);
					`
			},
			{tex, offset}
			);
		}

		// put the missing border back on
		// TODO: port me
		static undebord(tex, cut, center){
			let offset = [center[0]-cut.size[0]/2, center[1]-cut.size[1]/2]
			// let offset = center.minus(tex.size.y-cut.size.times(.5))
			return tex.frag(
				{
				tex: den.f1tex | den.nxNearest,
				cut: den.f4tex | den.input | den.nxNearest,
				offset: den.int2,
				render: `
					outColor = texelFetch(image, texel, 0);
					outColor.x += texelFetch(cut, texel-offset, 0).x;
					`
				},
				{ cut, offset }
			);
		}

		// TODO: occasionally this fails with:
				// Uncaught RangeError: Invalid typed array length: -8196
				// at new Float32Array(<anonymous>)
				// at Object.getData (den.js:295)
		static slowCoverage(tex){ // Make sure the texture is as small as possible before calling this.
			// return Math.random() > .5;
			// let data = Sensor.lineSample(tex).getData()
			let data = tex.getData()
			let total = 0
			for (let i = 0; i < data.length; i++){
				total += data[i]
			}
			// console.log("data length is ", data.length)
			return total/data.length
		}

		// static halfSample(tex){
		// 	let small = v1tex(tex.size.times(.5))
		// 	Sensor.copy(small, tex)
		// 	return small
		// 	// return small.setTo(tex)
		// }

		// static copy (tex, role_model){
		// 	return tex.run({
		// 		image    : sampler | vec4 | nxNearest,
		// 		// outColor : fragOut | pattern,
		// 		role_model: sampler | vec4 | nxNearest,
		// 		main : `outColor = thisUV(role_model)`,
		// 	}, {role_model}
		// 	)	
		// }

		static downSample(tex, shrink = 32){ // Maintains average values, but not neccesarilly positions.
			// Compensation for extra pixels means that values can go over one.
			let remainder = [tex.size[0] % shrink, tex.size[1] % shrink] // dimensions of last pixel
			// console.log("remander: ", remainder)
			// let new_res = [(tex.size[0] - remainder[0])/shrink, (tex.size[1] - remainder[1])/shrink]
			let new_res = [Math.ceil(tex.size[0]/shrink), Math.ceil(tex.size[1]/shrink)]
			// let new_res = tex.size.times(1/shrink)
			let initial_pixels = (tex.size[0]*tex.size[1])
			let extra_pixels = (new_res[0]*new_res[1]*shrink*shrink-initial_pixels)/initial_pixels// Percentage of imaginary pixels introduced by the remainder, always black.
			let small = den.f1tex(new_res) // TODO: bad
			return small.frag({
				tex: den.f4tex | den.input| den.xyzClamp, // | nxNearest,
				shrink: den.int,
				remainder: den.int2,
				extra_pixels: den.float,
				render: `
					float sum = 0.;
					ivec2 iRes = textureSize(image, 0);
					int w = (texel.x == iRes.x-1)&&remainder.x>0?remainder.x:shrink;
					int h = (texel.y == iRes.y-1)&&remainder.y>0?remainder.y:shrink;
					for (int i = 0; i < w; i++){
						for (int j = 0; j < h; j++){
							ivec2 position = shrink*texel+ivec2(i,j);
							// sum += getTexel(tex, position).x;
							sum += texelFetch(tex, position, 0).x;
						}
					}
					// sum /= float(w*h);
					sum /= float(shrink*shrink);
					sum *= 1.+extra_pixels;
					outColor = sum
					`,
			}, {tex, shrink, remainder, extra_pixels})
		}

		// static downSample1D(tex, shrink = 64){
		// 	let remainder = tex.size.x % shrink// dimensions of last pixel. a bigger remainder lowers all values slightly.
		// 	// let new_res = tex.size.x/shrink
		// 	let new_res = Math.ceil(tex.size.x/shrink)
		// 	let small = v1tex([new_res, 1])
		// 	// console.log(new_res.y)
		// 	return small.run({
		// 		tex: sampler | vec4, //| xyzClamp, // | nxNearest,
		// 		shrink: uniform | int,
		// 		remainder: uniform | int,
		// 		render: `
		// 			// outColor = thisUV(tex);
		// 			int w = (texel.x == iRes.x-1)&&remainder>0?remainder:shrink;
		// 			float sum = 0.;
		// 			for (int i = 0; i < w; i++){
		// 				sum += getTexel(tex, ivec2(shrink*texel.x+i, 0)).x;
		// 			}
		// 			// sum = sum/float(w);
		// 			sum = sum/float(shrink);
		// 			// if (w != shrink){
		// 			// 	sum *=
		// 			// }
		// 			outColor.x = sum;
		// 			`,
		// 	}, {tex, shrink, remainder})
		// }

		// static lineSample(tex){ //Count pixels in two passes
		// 	let line = v1tex([tex.size.x, 1])
		// 	// console.log("line.size is", line.size)
		// 	return line.run({
		// 		tex: sampler | vec4 | xyzClamp, // | nxNearest,
		// 		render: `
		// 			float sum = 0.;
		// 			int h = textureSize(tex, 0).y;
		// 			for (int i = 0; i < h; i++) {
		// 				sum += getTexel(tex, ivec2(texel.x, i)).x;
		// 			}
		// 			outColor.x = sum/float(h);
		// 			`,
		// 	}, {tex})
		// }
		update(depth){
			cut.setData(this.size)
			// return ST.debord(cut, tex, center, size)
			Sensor.debord(cut, depth, this.center, this.size)
			// these numbers seem pretty fast
			const DOWNSAMPLE_BY = 2
			const DOWNSAMPLE_UNTIL = 2
			// let small = cut
			let small = Sensor.downSample(cut, DOWNSAMPLE_BY)
			while (Math.min(...small.size)>= DOWNSAMPLE_UNTIL){
				small = Sensor.downSample(small, DOWNSAMPLE_BY)
			}
			var d = new Date()
			// let start_time = performance.now()
			// console.log(performance.now())
			// for (let i = 0; i < 1000; i++){
			this.filled = Sensor.slowCoverage(small)
			// console.log(small.getData().length)
			// }
			// let end_time = performance.now()
			// console.log(performance.now())
			// console.log(end_time-start_time)

			// debug
			// Sensor.copy(cut, small)
			return cut
		}

		// helpful for debugging
		draw(cfx) {
			cfx.rgb(this.filled ? 0 : .1, this.filled + this.filled ? .1 : 0, 0)
			cfx.fillRect(this.center[0] - this.size[0] / 2, this.center[1] - this.size[1] / 2, this.size[0], this.size[1]);
		}

	}

	// Managers Sensors
	// TODO: do all the sensors in one fell glsl swoop
	class Sensei {
		constructor() {
			this.sensors = []
		}

	}
	return {Sensor, Sensei}
}
// exports.Sensor = Sensor
// exports.Sensei = Sensei