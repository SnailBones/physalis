// Shaders, Textures, Ar(ray)ithmetic Plus Little Easy Scripts.
// A small collection of my favorite shader functions,
// corn, rice, potatoes, and blur functions.

// TODO: keep track of different blurs for different functions

exports.init = (den, extend = true) => {
// var Staples = (() => {	
	const ST = {}
	const tempTex = den.f4tex([1, 1]);
	// var den

	class StaplesError extends Error {
		constructor(...params) {
			super(...params);
			if (Error.captureStackTrace) {
				Error.captureStackTrace(StaplesError);
			}

			this.name = "StaplesError";
		}
	}

	// Basic texture functions
	// TODO: Make these work on more texture types


	ST.rescale = (tex, role_model) => {
		return tex.frag({
			role_model: den.f4tex | den.input | den.xyzClamp,
			outColor: den.f4tex | den.output,
			render : `
				outColor = texture(role_model, pixel/res);
			`
			},{role_model});
	}

	ST.copy = (tex, model) => {
		return tex.frag({
			model: den.f4tex | den.input | den.xyzClamp,
			outColor: den.f4tex | den.output,
			render: `outColor = texture(model, pixel/res)`,
		},
			{ model }
		)
	}

	ST.add = (tex, inpt) => {
		return tex.io({ inpt }, `this=this+inpt`)
	}

	ST.drawOn = (tex, inpt) => {
		return tex.io({inpt}, `
			// this.a = 1.;
			this.rgb = this.rgb * (1.-inpt.a) + inpt.rgb*inpt.a
		`)
	}

	// Remove the borders and return a smaller texture.
	ST.debord = (cut, tex, offset) => {
		return cut.frag(
			{
				tex: den.f4tex | den.input,
				outColor: den.f4tex | den.output,
				offset: den.int2,
				render: `
					outColor = texelFetch(tex, texel + offset,0);`
			},
			{ tex, offset }
		);
	}
	ST.undebord = (tex, cut, offset) => {
		return tex.frag(
			{
				tex: den.f4tex | den.nxNearest,
				cut: den.f4tex | den.input | den.nxNearest,
				offset: den.int2,
				render: `
					outColor = texelFetch(cut, texel-offset, 0);
					`
			},
			{ cut, offset }
		);
	}


// BLUR STUFF

// some tiny functions. these take in a normalized value 0 to 1

	ST.gaussian = (i, exp = 0.2) =>
		// gaussian curve
		Math.exp(-(i * i) / exp);
		
	ST.sinusoid = (i) =>
		// Classic sinusoidal blur from ben.js
		Math.cos(i * Math.PI) / 2 + 0.5;

	ST.kernels = {}
	// makes a 1d kernel
	ST.kernel = (size, func) => {
		if (!(size in ST.kernels)){
			ST.kernels[size] = den.f1tex([size, 1], i => [func(i[0] / size)]);
			console.log("creating kernel of size", size, "with function", func)
		}
		return ST.kernels[size];
	}


	// int version
	ST.blurKernel1D = (tex, kernel, dir, stretch = 1) => {
		let radius = kernel.size[0];
		tex.frag(
			{
				kernel: den.f1tex | den.input,
				outColor: den.f4tex | den.output,
				radius: den.int,
				stretch: den.int,
				dir: den.int,
				render: `
						${tex.ctor} img = texelFetch(image,texel,0)${tex.swizzle};
						float total = 1.;
						for (int i = 1; i <= radius; i+= stretch){
								float kern = texelFetch(kernel, ivec2(i, 0), 0).x;
								if (dir == 0){
									img += texelFetch(image, texel + ivec2(i, 0), 0)${tex.swizzle}*kern;
									img += texelFetch(image, texel + ivec2(-i, 0), 0)${tex.swizzle}*kern;
								}
								else {
									img += texelFetch(image, texel + ivec2(0, i), 0)${tex.swizzle}*kern;
									img += texelFetch(image, texel + ivec2(0, -i), 0)${tex.swizzle}*kern;
								}
								total += kern*2.;
						}
						outColor${tex.swizzle} = img/total;`
			},
			{ radius, kernel, dir, stretch }
		);
	}

	// float version. TODO: make xyzclamp work
	ST.floatBlurKernel = (tex, kernel, dir, stretch = 1) => {
		let radius = kernel.size[0];
		tex.frag(
			{
				kernel: den.f1tex | den.input,
				outColor: den.f4tex | den.output | den.xyzMirror,
				radius: den.float,
				stretch: den.float,
				dir: den.int,
				render: `
						${tex.ctor} img = texelFetch(image,texel,0)${tex.swizzle};
						// float img = texelFetch(image,texel,0).x;
						float total = 1.;
						for (float i = 1.; i <= radius; i+= stretch){
								float kern = texelFetch(kernel, ivec2(i, 0), 0).x;
								if (dir == 0){
									img += texture(image, (pixel+vec2(i, 0))/res)${tex.swizzle}*kern;
									img += texture(image, (pixel+vec2(-i, 0))/res)${tex.swizzle}*kern;
								}
								else {
									img += texture(image, (pixel+vec2(0, i))/res)${tex.swizzle}*kern;
									img += texture(image, (pixel+vec2(0, -i))/res)${tex.swizzle}*kern;
								}
								total += kern*2.;
						}
						outColor${tex.swizzle} = img/total;`
			},
			{ radius, kernel, dir, stretch }
		);
	}


	ST.blurKernel = (tex, kernel, stretch = 1) => {
		ST.blurKernel1D(tex, kernel, 1, stretch);
		ST.blurKernel1D(tex, kernel, 0, stretch);
		// ST.floatBlurKernel(tex, kernel, 1, stretch);
		// ST.floatBlurKernel(tex, kernel, 1, stretch);
	}

	// A variation on the downsample blur form ben.js, but uses a kernel to precompute the function.
	// downsampling alone also has a blurring effect
	//TODO: get derivative in here

	ST.fastBlur = (tex, radius, curve, quality = 1) => { //
		radius = Math.floor(radius * quality);
		if (quality <= 0 || quality > 1) {
			throw new StaplesError("Can't blur with quality: " + quality);
		}
		if (!Number.isInteger(tex.size[0]) || !Number.isInteger(tex.size[1])){
			throw new StaplesError("Non integer texture size: "+ tex.size)
		}
		let kernel = ST.kernel(radius, curve);
		// Downsample if less than full quality
		if (quality < 1) {
			// TODO: temp texture, this is bad
			// let ds = den.f4tex([Math.ceil(tex.size[0]*quality), Math.ceil(tex.size[1]*quality)])
			tempTex.setData([Math.ceil(tex.size[0] * quality), Math.ceil(tex.size[1] * quality)])
			ST.rescale(tempTex, tex) // downsample
			ST.blurKernel(tempTex, kernel, 1);
			ST.rescale(tex, tempTex) // upsample. nearest neighbor keeps it smooth.
		} else {
			ST.blurKernel(tex, kernel, 1);
		}
		return tex
	}

	ST.blur = (tex, radius = 100, quality = 1) => {
			return ST.fastBlur(tex, radius, ST.sinusoid, quality);
		}

	ST.gaus = (tex, radius, quality = 1) => {
			return ST.fastBlur(tex, radius, ST.gaussian, quality);
	}

	// PHYSICS STUFF
	ST.dXdY = (tex, multiplier = 1) => {
		// TODO: make me
		return
	}

	ST.makeForce = (tex, force = 1000) => {
			// positive force to repel, negative to attract.   
			return ST.dXdY(tex, force)
	}

	// Speed testing utils
	let times = []
	let test_start
	
	// Testing functions

	ST.startTest = () => {
		test_start = performance.now()
	}

	ST.stopTest = () => {
		let time = performance.now() - test_start
		times.push(time)
		if (times.length > 1000) {
			times.shift()
		}
		let average = times.reduce((a, b) => a + b) / times.length
		console.log("time is", average)
	}

	// for accessibility testing
	ST.colorblind = (tex) => {
		return tex.io( `this.rg=vec2((this.r+this.g)/2.)`)
	}


	// ST.getDen = () => {
	// 	return den
	// }

	// Adds shortcuts to functions from within textures.

	if (extend) {
		let texture = den.Texture.prototype
		texture.Blur = function (radius, quality = 1) {
			return ST.fastBlur(this, radius, ST.sinusoid, quality);
		}
		texture.Gaus = function (radius, quality = 1) {
			return ST.fastBlur(this, radius, ST.gaussian, quality);
			// return ST.fastBlur(this, radius, i => 1-i, quality);
		}
		texture.SetTo = function(tex) { return ST.copy(this, tex)}
		texture.Plus = function(tex) { return ST.add(this, tex) }
		texture.SrcOver = function(tex) {return ST.drawOn(this, tex)}

		texture.BlurV = function (radius, curve = ST.sinusoid) {
			let kernel = ST.kernel(radius, curve);
			return ST.blurKernel1D(this, kernel, 1, 1);
		}

		texture.BlurH = function (radius, curve = ST.sinusoid) {
			let kernel = ST.kernel(radius, curve);
			return ST.blurKernel1D(this, kernel, 0, 1);
		}
	}

	return ST
} // End local scope

// exports.init = Staples.init


// that was easy