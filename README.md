# flot.touch

A plugin for the Flot charting library for adding multi-touch gesture support for panning and zooming

## Usage

Add the plugin to your html and add touch support to the flot chart options:

	touch: {
		pan: 'x',			// allowed direction (x, y, or xy)
		scale: 'x', 		// allowed direction (x, y, or xy)
		css: false,			// use css to immediately show touch result (visually not attractive)
		interval: 100,		// plot redraw interval in ms
		callback: null,		// callback for custom plot redraw function
		autoWidth: true,
		autoHeight: true,
	}

## Authors

Original version: http://justindarc.github.io/flot.touch/
Rewrite:	Andreas Goetz <cpuidle@gmx.de>
