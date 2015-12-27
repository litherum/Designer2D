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

	var Mode = {
		NOTHING: 0,
		CREATING_SHAPE: 1
	};

	var Tool = {
		SELECTION: 0,
		CREATE_RECTANGLE: 1,
		CREATE_OVAL: 2
	};

	var InitialShape = {
		RECTANGLE: 0,
		OVAL: 1
	}

	var iconMap;

	var model = {
		shapes: [],
		mode: Mode.NOTHING,
		tool: Tool.SELECTION
	};
	var initialShapeDetails;

	// Elements
	var content;
	var initialShape;

	function addPath(path) {
		model.shapes.push(path);
		var element = document.createElementNS("http://www.w3.org/2000/svg", "path");
		element.setAttribute("d", path.svgData());
		element.setAttribute("fill", "red");
		content.appendChild(element);
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

	}

	function appendInitialRectangle(startX, startY) {
		initialShapeDetails = {
			type: InitialShape.RECTANGLE,
			initialMouseX: startX,
			initialMouseY: startY
		};
		initialShape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		initialShape.setAttribute("x", startX.toString());
		initialShape.setAttribute("y", startY.toString());
		initialShape.setAttribute("width", "0");
		initialShape.setAttribute("height", "0");
		initialShape.setAttribute("fill", "teal");
		content.appendChild(initialShape);
	}

	function appendInitialOval(startX, startY) {
		initialShapeDetails = {
			type: InitialShape.OVAL,
			initialMouseX: startX,
			initialMouseY: startY
		};
		initialShape = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
		initialShape.setAttribute("cx", startX.toString());
		initialShape.setAttribute("cy", startY.toString());
		initialShape.setAttribute("rx", "0");
		initialShape.setAttribute("ry", "0");
		initialShape.setAttribute("fill", "teal");
		content.appendChild(initialShape);
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
			initialShape.setAttribute("x", x.toString());
			initialShape.setAttribute("y", y.toString());
			initialShape.setAttribute("width", width.toString());
			initialShape.setAttribute("height", height.toString());
		} else if (initialShapeDetails.type == InitialShape.OVAL) {
			initialShape.setAttribute("cx", (x + width / 2).toString());
			initialShape.setAttribute("cy", (y + height / 2).toString());
			initialShape.setAttribute("rx", (width / 2).toString());
			initialShape.setAttribute("ry", (height / 2).toString());
		}
	}

	function commitInitialShape(finalX, finalY) {
		content.removeChild(initialShape);
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

	function mouseDownEventHandler(event) {
		if (model.tool == Tool.SELECTION) {
			// FIXME: Implement rectangular selection
		} else if (model.tool == Tool.CREATE_RECTANGLE) {
			model.mode = Mode.CREATING_SHAPE;
			appendInitialRectangle(event.offsetX, event.offsetY);
		} else if (model.tool == Tool.CREATE_OVAL) {
			model.mode = Mode.CREATING_SHAPE;
			appendInitialOval(event.offsetX, event.offsetY);
		}
	}

	function mouseUpEventHandler(event) {
		if (model.tool == Tool.SELECTION) {
			// FIXME: Implement rectangular selection
		} else if (model.tool == Tool.CREATE_RECTANGLE) {
			model.mode = Mode.NOTHING;
			commitInitialShape(event.offsetX, event.offsetY);
		} else if (model.tool == Tool.CREATE_OVAL) {
			model.mode = Mode.NOTHING;
			commitInitialShape(event.offsetX, event.offsetY);
		}
	}

	function mouseMoveEventHandler(event) {
		if (model.mode == Mode.CREATING_SHAPE) {
			resizeInitialShape(event.offsetX, event.offsetY);
		}
	}

	function populateIconMap() {
		iconMap = new Map();
		iconMap.set(Tool.SELECTION, {
			"identifier": "selectionIcon",
			"on": "cursor.svg",
			"off": "cursorbase.svg"
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

	function selectTool(tool) {
		if (tool == model.tool)
			return;

		var element = document.getElementById(iconMap.get(model.tool).identifier);
		element.src = iconMap.get(model.tool).off;
		model.tool = tool;
		element = document.getElementById(iconMap.get(model.tool).identifier);
		element.src = iconMap.get(model.tool).on;
	}

	function populateEventListeners() {
		content = document.getElementById("content");
		content.addEventListener("mousedown", mouseDownEventHandler);
		content.addEventListener("mouseup", mouseUpEventHandler);
		content.addEventListener("mousemove", mouseMoveEventHandler);

		var selectionIcon = document.getElementById("selectionIcon");
		selectionIcon.addEventListener("click", function() {
			selectTool(Tool.SELECTION);
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