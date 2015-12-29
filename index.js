(function() {
	var PathComponent = {
		MOVE: 0,
		LINE: 1,
		CLOSE: 2
	};
	function Path() {
		this.components = [];
	}
	Path.prototype.moveTo = function(x, y) {
		this.components.push({
			type: PathComponent.MOVE,
			data: [x, y]
		})
	};
	Path.prototype.lineTo = function(x, y) {
		this.components.push({
			type: PathComponent.LINE,
			data: [x, y]
		})
	};
	Path.prototype.close = function() {
		this.components.push({
			type: PathComponent.CLOSE
		})
	};
	Path.prototype.svgData = function() {
		// FIXME: Do this with SVGPathSegList OM.
		var result = ""
		for (var i = 0; i < this.components.length; ++i) {
			var element = this.components[i];
			if (element.type == PathComponent.MOVE) {
				result += "M " + element.data[0] + " " + element.data[1];
			} else if (element.type == PathComponent.LINE) {
				result += "L " + element.data[0] + " " + element.data[1];
			} else if (element.type == PathComponent.CLOSE) {
				result += "Z";
			}
		}
		return result;
	}




	// Enums

	var Mode = {
		NOTHING: 0,
		CREATING_SHAPE: 1,
		SELECTING_HANDLE: 2,
		MOVING_HANDLES: 3
	};

	var Tool = {
		SELECTION: 0,
		DIRECT_SELECTION: 1,
		ADD_CONTROL_POINT: 2,
		CREATE_RECTANGLE: 3,
		CREATE_OVAL: 4
	};

	var InitialShape = {
		RECTANGLE: 0,
		OVAL: 1
	}




	// Model

	var iconMap = new Map();

	var shapeElementMap = new Map();
	var elementShapeMap = new Map();
	var mode = Mode.NOTHING;
	var tool = Tool.SELECTION;
	var initialShapeDetails;
	var selectionDetails = {
		handleElements: new Map(),
		selectedShapes: new Map(),
		gestureStartX: 0,
		gestureStartY: 0
	};


	var contentElement;




	function updateHandle(shape, index) {
		var info = selectionDetails.selectedShapes.get(shape).get(index);
		var element = info.handle;
		if (info.selected) {
			element.style.fill = "white";
			element.style.stroke = "none";
		} else {
			element.style.fill = "transparent";
			element.style.stroke = "white";
		}
	}

	function toggleHandleSelection(handle) {
		var info = selectionDetails.handleElements.get(handle);
		var shape = info.shape;
		var index = info.index;
		var selectedInfo = selectionDetails.selectedShapes.get(shape).get(index);
		selectedInfo.selected = !selectedInfo.selected;
		updateHandle(shape, index);
	}

	function moveSelectedComponents(dx, dy) {
		selectionDetails.selectedShapes.forEach(function(indexMap, shape) {
			indexMap.forEach(function(info, index) {
				if (!info.selected) {
					return;
				}
				info.handle.x.baseVal.value += dx;
				info.handle.y.baseVal.value += dy;
				var component = shape.components[index];
				if (component.type == PathComponent.MOVE) {
					component.data[0] += dx;
					component.data[1] += dy;
				} else if (component.type == PathComponent.LINE) {
					component.data[0] += dx;
					component.data[1] += dy;
				} else if (component.type == PathComponent.CLOSE) {
				}
			});
			updateElement(shape);
		});
		selectionDetails.gestureStartX += dx;
		selectionDetails.gestureStartY += dy;
	}

	function selectShape(shape) {
		function addHandle(x, y) {
			var handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			handle.x.baseVal.value = x - 4;
			handle.y.baseVal.value = y - 4;
			handle.width.baseVal.value = 8;
			handle.height.baseVal.value = 8;
			handle.style.fill = "white";
			handle.style.stroke = "none";
			contentElement.appendChild(handle);
			return handle;
		}
		var indexMap = new Map();
		for (var i = 0; i < shape.components.length; ++i) {
			var component = shape.components[i];
			if (component.type == PathComponent.MOVE) {
				var handle = addHandle(component.data[0], component.data[1]);
				indexMap.set(i, {
					handle: handle,
					selected: true
				});
			} else if (component.type == PathComponent.LINE) {
				var handle = addHandle(component.data[0], component.data[1]);
				indexMap.set(i, {
					handle: handle,
					selected: true
				});
			} else if (component.type == PathComponent.CLOSE) {
			}
		}

		indexMap.forEach(function(handleInfo, index) {
			selectionDetails.handleElements.set(handleInfo.handle, {
				shape: shape,
				index: index
			});
		});
		selectionDetails.selectedShapes.set(shape, indexMap);
	}

	function clearSelection() {
		selectionDetails.handleElements.forEach(function(info, handle) {
			handle.parentNode.removeChild(handle);
		});
		selectionDetails.handleElements.clear();
		selectionDetails.selectedShapes.clear();
	}

	function updateElement(path) {
		var element = shapeElementMap.get(path);
		element.setAttribute("d", path.svgData());
		element.style.fill = "red";
	}

	function addPath(path) {
		var element = document.createElementNS("http://www.w3.org/2000/svg", "path");
		contentElement.appendChild(element);
		elementShapeMap.set(element, path);
		shapeElementMap.set(path, element);
		updateElement(path);
	}

	function createRectangle(x, y, width, height) {
		var path = new Path();
		path.moveTo(x, y);
		path.lineTo(x, y + height);
		path.lineTo(x + width, y + height);
		path.lineTo(x + width, y);
		path.close();
		addPath(path);
	}

	function createOval(x, y, width, height) {
		// FIXME: Implement ovals
	}




	// Initial shape functions

	function appendInitialRectangle(startX, startY) {
		var initialShape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		initialShape.x.baseVal.value = startX;
		initialShape.y.baseVal.value = startY;
		initialShape.width.baseVal.value = 0;
		initialShape.height.baseVal.value = 0;
		initialShape.style.fill = "teal";
		contentElement.appendChild(initialShape);
		initialShapeDetails = {
			type: InitialShape.RECTANGLE,
			initialMouseX: startX,
			initialMouseY: startY,
			element: initialShape
		};
	}

	function appendInitialOval(startX, startY) {
		var initialShape = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
		initialShape.cx.baseVal.value = startX;
		initialShape.cy.baseVal.value = startY;
		initialShape.rx.baseVal.value = 0;
		initialShape.ry.baseVal.value = 0;
		initialShape.style.fill = "teal";
		contentElement.appendChild(initialShape);
		initialShapeDetails = {
			type: InitialShape.OVAL,
			initialMouseX: startX,
			initialMouseY: startY,
			element: initialShape
		};
	}

	function computeRectangleBounds(x1, y1, x2, y2) {
		var minX = Math.min(x1, x2);
		var minY = Math.min(y1, y2);
		var maxX = Math.max(x1, x2);
		var maxY = Math.max(y1, y2);
		var width = maxX - minX;
		var height = maxY - minY;
		return [minX, minY, width, height];
	}

	function resizeInitialShape(currentX, currentY) {
		var details = computeRectangleBounds(currentX, currentY, initialShapeDetails.initialMouseX, initialShapeDetails.initialMouseY);
		var x = details[0];
		var y = details[1];
		var width = details[2];
		var height = details[3];
		if (initialShapeDetails.type == InitialShape.RECTANGLE) {
			var element = initialShapeDetails.element;
			element.x.baseVal.value = x;
			element.y.baseVal.value = y;
			element.width.baseVal.value = width;
			element.height.baseVal.value = height;
		} else if (initialShapeDetails.type == InitialShape.OVAL) {
			var element = initialShapeDetails.element;
			element.cx.baseVal.value = x + width / 2;
			element.cy.baseVal.value = y + height / 2;
			element.rx.baseVal.value = width / 2;
			element.ry.baseVal.value = height / 2;
		}
	}

	function commitInitialShape(finalX, finalY) {
		contentElement.removeChild(initialShapeDetails.element);
		var details = computeRectangleBounds(finalX, finalY, initialShapeDetails.initialMouseX, initialShapeDetails.initialMouseY);
		var x = details[0];
		var y = details[1];
		var width = details[2];
		var height = details[3];
		if (initialShapeDetails.type == InitialShape.RECTANGLE) {
			createRectangle(x, y, width, height);
		} else if (initialShapeDetails.type == InitialShape.OVAL) {
			createOval(x, y, width, height);
		}
	}




	// Event Handlers

	function mouseDownContentEventHandler(event) {
		var clickedShape;
		var clickedHandle;
		if (tool == Tool.SELECTION) {
			if (event.target == contentElement) {
				clearSelection();
			} else if (clickedShape = elementShapeMap.get(event.target)) {
				// FIXME: Only clear the selection if the shift key is not held down.
				clearSelection();
				selectShape(clickedShape);
			} else if (selectionDetails.handleElements.has(event.target)) {
				mode = Mode.SELECTING_HANDLE;
				selectionDetails.gestureStartX = event.offsetX;
				selectionDetails.gestureStartY = event.offsetY;
			}
		} else if (tool == Tool.CREATE_RECTANGLE) {
			mode = Mode.CREATING_SHAPE;
			appendInitialRectangle(event.offsetX, event.offsetY);
		} else if (tool == Tool.CREATE_OVAL) {
			mode = Mode.CREATING_SHAPE;
			appendInitialOval(event.offsetX, event.offsetY);
		}
	}

	function mouseMoveContentEventHandler(event) {
		if (mode == Mode.CREATING_SHAPE) {
			resizeInitialShape(event.offsetX, event.offsetY);
		} else if (mode == Mode.SELECTING_HANDLE || mode == Mode.MOVING_HANDLES) {
			mode = Mode.MOVING_HANDLES;
			moveSelectedComponents(event.offsetX - selectionDetails.gestureStartX, event.offsetY - selectionDetails.gestureStartY);
		}
	}

	function mouseUpContentEventHandler(event) {
		if (tool == Tool.SELECTION) {
			if (mode == Mode.SELECTING_HANDLE) {
				mode = Mode.NOTHING;
				toggleHandleSelection(event.target);
			} else if (mode == Mode.MOVING_HANDLES) {
				mode = Mode.NOTHING;
			}
		} else if (tool == Tool.CREATE_RECTANGLE) {
			mode = Mode.NOTHING;
			commitInitialShape(event.offsetX, event.offsetY);
		} else if (tool == Tool.CREATE_OVAL) {
			mode = Mode.NOTHING;
			commitInitialShape(event.offsetX, event.offsetY);
		}
	}




	// Initial Setup

	function populateIconMap() {
		iconMap.set(Tool.SELECTION, {
			"identifier": "selectionIcon",
			"on": "cursor.svg",
			"off": "cursorbase.svg"
		});
		iconMap.set(Tool.DIRECT_SELECTION, {
			"identifier": "directSelectionIcon",
			"on": "directcursor.svg",
			"off": "directcursorbase.svg"
		});
		iconMap.set(Tool.ADD_CONTROL_POINT, {
			"identifier": "addControlPointIcon",
			"on": "addcontrolpoint.svg",
			"off": "addcontrolpointbase.svg"
		});
		iconMap.set(Tool.CREATE_RECTANGLE, {
			"identifier": "addRectangleIcon",
			"on": "addrect.svg",
			"off": "addrectbase.svg"
		});
		iconMap.set(Tool.CREATE_OVAL, {
			"identifier": "addOvalIcon",
			"on": "addoval.svg",
			"off": "addovalbase.svg"
		});
	}

	function selectTool(newTool) {
		if (newTool == tool)
			return;

		var element = document.getElementById(iconMap.get(tool).identifier);
		element.src = iconMap.get(tool).off;
		tool = newTool;
		element = document.getElementById(iconMap.get(tool).identifier);
		element.src = iconMap.get(tool).on;
	}

	function populateEventListeners() {
		contentElement = document.getElementById("content");
		contentElement.addEventListener("mousedown", mouseDownContentEventHandler);
		contentElement.addEventListener("mouseup", mouseUpContentEventHandler);
		contentElement.addEventListener("mousemove", mouseMoveContentEventHandler);

		var selectionIcon = document.getElementById("selectionIcon");
		selectionIcon.addEventListener("click", function() {
			selectTool(Tool.SELECTION);
		});
		var directSelectionIcon = document.getElementById("directSelectionIcon");
		directSelectionIcon.addEventListener("click", function() {
			selectTool(Tool.DIRECT_SELECTION);
		});
		var addControlPointIcon = document.getElementById("addControlPointIcon");
		addControlPointIcon.addEventListener("click", function() {
			selectTool(Tool.ADD_CONTROL_POINT);
		});
		var addRectangleIcon = document.getElementById("addRectangleIcon");
		addRectangleIcon.addEventListener("click", function() {
			selectTool(Tool.CREATE_RECTANGLE);
		});
		var addOvalIcon = document.getElementById("addOvalIcon");
		addOvalIcon.addEventListener("click", function() {
			selectTool(Tool.CREATE_OVAL);
		});
	}

	window.addEventListener("load", function(event) {
		populateIconMap();
		populateEventListeners();
	});
})();