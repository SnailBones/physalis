# A modular library for kinect-powered games.

### These requrie Dendrobium:

__Staples__: Commonly used shader functions, including an efficient and flexible blur.
__Poltergeist__: Faking depth with the mouse for development
__Sensei__: Virtual sensors or "colliders."
	Currently supports only rectangles. Designed toward small numbers of large, uniquely sized colliders, not for a grid.
__Yoda__: Depth generates a "force" which can be used to push or pull objects

### These are self-contained:

__Vector__: Vector operations on 2d arrays and other helpful math.
__Kalimba__: Play sounds at dynamic volume and speed/pitch.
__Newton__: Physics objects, can be used wih Yoda
__Burdock__: Objects that follow people by sticking to depth. Best used with Yoda.
__Zenith__: Help with 1 point perspective.