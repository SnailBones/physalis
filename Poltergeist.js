// Faking depth for development

exports.init = (den) =>
{
	const Ghost = {} 
	m_pos = null
	mouse_down = false
	window.addEventListener("mousedown" , () => {mouse_down = true})
	window.addEventListener("mouseup"   , () => {mouse_down = false})

	window.addEventListener("mousemove", (event) => {
		if (!mouse_down){
			m_pos = null
		}
		else{
			m_pos = [event.clientX, event.clientY]
		}

	})

	Ghost.getDen = () => {
		return den
	}


	Ghost.fakeDepth = (tex, radius = 100) => {
		// return this.mouseCircle(tex, radius)
		if (m_pos)	{
			tex.frag({
				m_pos: den.float2,
				radius: den.float,
				render: `
					// outColor = distance(m_pos, pixel)/1000.;
					outColor = texelFetch(image,texel,0).x + (distance(m_pos, pixel)<radius?1.:0.); // circle
					// outColor = abs(m_pos.x - pixel.x)+abs(m_pos.y-pixel.y)<radius?1.:0.; // diamond
					// outColor = max(abs(m_pos.x - pixel.x),abs(m_pos.y-pixel.y))<radius?1.:0.; // square
			`
			}, { m_pos, radius})
		}
		return tex
	}
	console.log("boo! ghost mode activated.")
	return Ghost
}
