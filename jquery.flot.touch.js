(function($) {

	function init(plot) {
		var isReady = false,
			isPanning = false,
			isZooming = false,
			lastTouchPosition = {
				x: -1,
				y: -1
			},
			lastTouchDistance = 0,
			relativeOffset = {
				x: 0,
				y: 0
			},
			relativeScale = 1.0,
			scaleOrigin = {
				x: 50,
				y: 50
			},
			redrawTimeout,
			options = plot.getOptions(),
			placeholder = plot.getPlaceholder();

		function pan(delta) {
			relativeOffset.x -= delta.x;
			relativeOffset.y -= delta.y;
			// console.log('> pan: '+options.touch.pan.toLowerCase()+' '+relativeOffset.x+'/'+relativeOffset.y);

			if (!options.touch.css) {
				return; // no css updates
			}

			switch (options.touch.pan.toLowerCase()) {
				case 'x':
					placeholder.children('div.flot-touch-container').css('transform', 'translateX(' + relativeOffset.x + 'px)');
					break;
				case 'y':
					placeholder.children('div.flot-touch-container').css('transform', 'translateY(' + relativeOffset.y + 'px)');
					break;
				default:
					placeholder.children('div.flot-touch-container').css('transform', 'translate(' + relativeOffset.x + 'px,' + relativeOffset.y + 'px)');
					break;
			}
		}

		function scale(delta) {
			var container = placeholder.children('div.flot-touch-container');

			relativeScale *= 1 + (delta / 100);
			// console.log('> scale: '+options.touch.scale.toLowerCase()+' '+relativeScale);

			if (!options.touch.css) {
				return; // no css updates
			}

			switch (options.touch.scale.toLowerCase()) {
				case 'x':
					container.css('transform', 'scaleX(' + relativeScale + ')');
					break;
				case 'y':
					container.css('transform', 'scaleY(' + relativeScale + ')');
					break;
				default:
					container.css('transform', 'scale(' + relativeScale + ')');
					break;
			}
		}

		function processOptions(plot, options) {
			if (options.touch.autoWidth) {
				placeholder.css('width', '100%');
			}

			if (options.touch.autoHeight) {
				var placeholderParent = placeholder.parent(),
					height = 0;

				placeholderParent.siblings().each(function() {
					height -= $(this).outerHeight();
				});

				height -= parseInt(placeholderParent.css('padding-top'), 10);
				height -= parseInt(placeholderParent.css('padding-bottom'), 10);
				height += window.innerHeight;

				placeholder.css('height', (height <= 0) ? 100 : height + 'px');
			}
		}

		function updateAxesMinMax() {
			// console.log('> updateAxesMinMax');

			// apply the pan
			if (relativeOffset.x !== 0 || relativeOffset.y !== 0) {
				$.each(plot.getAxes(), function(index, axis) {
					if (axis.direction === options.touch.pan.toLowerCase() || options.touch.pan.toLowerCase() == 'xy') {
						var min = axis.c2p(axis.p2c(axis.touch.min) - relativeOffset[axis.direction]),
							max = axis.c2p(axis.p2c(axis.touch.max) - relativeOffset[axis.direction]);

						axis.options.min = min;
						axis.options.max = max;
					}
				});
			}

			// apply the scale
			if (relativeScale !== 1.0) {
				var width = plot.width(),
					height = plot.height(),
					scaleOriginPixel = {
						x: Math.round((scaleOrigin.x / 100) * width),
						y: Math.round((scaleOrigin.y / 100) * height)
					},
					range = {
						x: {
							min: scaleOriginPixel.x - (scaleOrigin.x / 100) * width / relativeScale,
							max: scaleOriginPixel.x + (1 - (scaleOrigin.x / 100)) * width / relativeScale
						},
						y: {
							min: scaleOriginPixel.y - (scaleOrigin.y / 100) * height / relativeScale,
							max: scaleOriginPixel.y + (1 - (scaleOrigin.y / 100)) * height / relativeScale
						}
					};

				$.each(plot.getAxes(), function(index, axis) {
					if (axis.direction === options.touch.scale.toLowerCase() || options.touch.scale.toLowerCase() == 'xy') {
						var min = axis.c2p(range[axis.direction].min);
						var max = axis.c2p(range[axis.direction].max);

						if (min > max) {
							var temp = min;
							min = max;
							max = temp;
						}

						axis.options.min = min;
						axis.options.max = max;
					}
				});
			}
		}

		function redraw() {
			updateAxesMinMax();

			if (typeof options.callback == 'function') {
				options.callback();
			}
			else {
				plot.setupGrid();
				plot.draw();
			}
		}

		function bindEvents(plot, eventHolder) {
			// console.log("> bindEvents");
			var container = $('<div class="flot-touch-container">');

			placeholder.css({
				overflow: 'hidden'
			}).children('canvas').wrapAll(container);


			placeholder.bind('touchstart', function(evt) {
				// console.log("> touchstart");
				var touches = evt.originalEvent.touches,
					container = placeholder.children('div.flot-touch-container');

				// remember initial axis dimensions
				$.each(plot.getAxes(), function(index, axis) {
					if (axis.direction === options.touch.scale.toLowerCase() || options.touch.scale.toLowerCase() == 'xy') {
						axis.touch = {
							min: axis.min,
							max: axis.max,
						}
					}
				});

				if (touches.length === 1) {
					isPanning = true;
					lastTouchPosition = {
						x: touches[0].pageX,
						y: touches[0].pageY
					};
					lastTouchDistance = 0;
				}
				else if (touches.length === 2) {
					isZooming = true;
					lastTouchPosition = {
						x: (touches[0].pageX + touches[1].pageX) / 2,
						y: (touches[0].pageY + touches[1].pageY) / 2
					};
					lastTouchDistance = Math.sqrt(Math.pow(touches[1].pageX - touches[0].pageX, 2) + Math.pow(touches[1].pageY - touches[0].pageY, 2));
				}

				var offset = placeholder.offset(),
					rect = {
						x: offset.left,
						y: offset.top,
						width: placeholder.width(),
						height: placeholder.height()
					},
					normalizedTouchPosition = {
						x: lastTouchPosition.x,
						y: lastTouchPosition.y
					};

				if (normalizedTouchPosition.x < rect.x) {
					normalizedTouchPosition.x = rect.x;
				}
				else if (normalizedTouchPosition.x > rect.x + rect.width) {
					normalizedTouchPosition.x = rect.x + rect.width;
				}

				if (normalizedTouchPosition.y < rect.y) {
					normalizedTouchPosition.y = rect.y;
				}
				else if (normalizedTouchPosition.y > rect.y + rect.height) {
					normalizedTouchPosition.y = rect.y + rect.height;
				}

				scaleOrigin = {
					x: Math.round((normalizedTouchPosition.x / rect.width) * 100),
					y: Math.round((normalizedTouchPosition.y / rect.height) * 100)
				};

				container.css('transform-origin', scaleOrigin.x + '% ' + scaleOrigin.y + '%');

				redrawTimeout = window.setInterval(function() {
					redraw();
				}, options.touch.interval);

				// return false to prevent touch scrolling.
				return false;
			});

			placeholder.bind('touchmove', function(evt) {
				// console.log("> touchmove");
				var touches = evt.originalEvent.touches,
					position, distance, delta;

				if (isPanning && touches.length === 1) {
					position = {
						x: touches[0].pageX,
						y: touches[0].pageY
					};
					delta = {
						x: lastTouchPosition.x - position.x,
						y: lastTouchPosition.y - position.y
					};

					// transform via the delta
					pan(delta);

					lastTouchPosition = position;
					lastTouchDistance = 0;
				}
				else if (isZooming && touches.length === 2) {
					distance = Math.sqrt(Math.pow(touches[1].pageX - touches[0].pageX, 2) + Math.pow(touches[1].pageY - touches[0].pageY, 2));
					position = {
						x: (touches[0].pageX + touches[1].pageX) / 2,
						y: (touches[0].pageY + touches[1].pageY) / 2
					};
					delta = distance - lastTouchDistance;

					// scale via the delta
					scale(delta);

					lastTouchPosition = position;
					lastTouchDistance = distance;
				}
			});

			placeholder.bind('touchend', function(evt) {
				var container = placeholder.children('div.flot-touch-container');

				window.clearInterval(redrawTimeout);
				redraw();

				isPanning = isZooming = false;
				lastTouchPosition = {
					x: -1,
					y: -1
				};
				lastTouchDistance = 0;
				relativeOffset = {
					x: 0,
					y: 0
				};
				relativeScale = 1.0;
				scaleOrigin = {
					x: 50,
					y: 50
				};

				container.css({
					'transform': 'translate(' + relativeOffset.x + 'px,' + relativeOffset.y + 'px) scale(' + relativeScale + ')',
					'transform-origin': scaleOrigin.x + '% ' + scaleOrigin.y + '%'
				});
			});
		}

		function processDatapoints(plot, series, datapoints) {
			if (window.devicePixelRatio) {
				placeholder.children('canvas').each(function(index, canvas) {
					var context = canvas.getContext('2d'),
						width = $(canvas).attr('width'),
						height = $(canvas).attr('height');

					$(canvas).attr('width', width * window.devicePixelRatio);
					$(canvas).attr('height', height * window.devicePixelRatio);
					$(canvas).css('width', width + 'px');
					$(canvas).css('height', height + 'px');

					context.scale(window.devicePixelRatio, window.devicePixelRatio);
				});
			}
		}

		function shutdown(plot, eventHolder) {
			placeholder.unbind('touchstart').unbind('touchmove').unbind('touchend');
		}

		plot.hooks.processOptions.push(processOptions);
		plot.hooks.bindEvents.push(bindEvents);
		plot.hooks.processDatapoints.push(processDatapoints);
		plot.hooks.shutdown.push(shutdown);

		// if (!isReady) {
		// 	$(document).bind('ready orientationchange', function(evt) {
		// 		window.scrollTo(0, 1);

		// 		setTimeout(function() {
		// 			$.plot(placeholder, plot.getData(), plot.getOptions());
		// 		}, 50);
		// 	});

		// 	isReady = true;
		// }
	}

 	var _options = {
		touch: {
			pan: 'xy',
			scale: 'xy',
			css: false,
			autoWidth: true,
			autoHeight: true,
			interval: 100,
			callback: null,
		}
	};

	$.plot.plugins.push({
		init: init,
		options: _options,
		name: 'touch',
		version: '2.0'
	});
})(jQuery);
