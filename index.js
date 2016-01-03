//(function() {
	function Point(x, y) {
		this.x = x;
		this.y = y;
	}

	var PathComponentType = {
		MOVE: 0,
		LINE: 1,
		CURVE: 2,
		CLOSE: 3
	};

	function PathComponent(componentType, data) {
		this.componentType = componentType;
		this.data = data;
	}

	function Path() {
		this.components = [];
	}
	Path.prototype.clear = function() {
		this.components = [];
	}
	Path.prototype.moveTo = function(destination) {
		this.components.push(new PathComponent(PathComponentType.MOVE, destination));
	};
	Path.prototype.lineTo = function(destination) {
		this.components.push(new PathComponent(PathComponentType.LINE, destination));
	};
	Path.prototype.curveTo = function(cp1, cp2, destination) {
		this.components.push(new PathComponent(PathComponentType.CURVE, [cp1, cp2, destination]));
	}
	Path.prototype.close = function() {
		this.components.push(new PathComponent(PathComponentType.CLOSE, undefined));
	}
	Path.prototype.populateElement = function(element) {
		element.pathSegList.clear();
		for (component of this.components) {
			if (component.componentType == PathComponentType.MOVE) {
				element.pathSegList.appendItem(element.createSVGPathSegMovetoAbs(component.data.x, component.data.y));
			} else if (component.componentType == PathComponentType.LINE) {
				element.pathSegList.appendItem(element.createSVGPathSegLinetoAbs(component.data.x, component.data.y));
			} else if (component.componentType == PathComponentType.CURVE) {
				element.pathSegList.appendItem(element.createSVGPathSegCurvetoCubicAbs(component.data[0].x, component.data[0].y, component.data[1].x, component.data[1].y, component.data[2].x, component.data[2].y));
			} else if (component.componentType == PathComponentType.CLOSE) {
				element.pathSegList.appendItem(element.createSVGPathSegClosePath());
			}
		}
	}
	Path.prototype.createElement = function() {
		var result = document.createElementNS("http://www.w3.org/2000/svg", "path");
		this.populateElement(result);
		return result;
	}




	// Enums

	var Mode = {
		NOTHING: 0,
		CREATING_SHAPE: 1,
		SELECTING_HANDLE: 2,
		MOVING_HANDLES: 3,
		SAVE: 4,
		LOAD: 5
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

	var LOCAL_STORAGE_KEY_NAME = "SavedDesigns";




	// Model

	var iconMap = new Map();

	var shapeElementMap = new Map();
	var elementShapeMap = new Map();
	var mode = Mode.NOTHING;
	var tool = Tool.SELECTION;

	var contentElement;




	function reset(resetMode) {
		while (contentElement.childNodes.length > 0) {
			var node = contentElement.childNodes[0];
			node.parentNode.removeChild(node);
		}
		iconMap = new Map();
		shapeElementMap = new Map();
		elementShapeMap = new Map();
		if (resetMode) {
			mode = Mode.NOTHING;
		}
		selectTool(Tool.SELECTION);
	}

	function saveObject() {
		var shapes = [];
		for (pair of shapeElementMap) {
			shapes.push(pair[0]);
		}
		return {
			version: 1,
			shapes: shapes
		};
	}

	function saveData() {
		return JSON.stringify(saveObject());
	}

	function verifyLoadObject(obj) {
		if (typeof obj != "object") {
			return false;
		}
		if (!obj.version || obj.version != 1) {
			return false;
		}
		// FIXME: Add more verification logic.
		return true;
	}

	function loadObject(obj) {
		reset(false);
		for (shape of obj.shapes) {
			var path = new Path();
			path.components = shape.components;
			contentElement.appendChild(path.createElement());
		}
	}

	function load(data) {
		try {
			var obj = JSON.parse(data);
			if (!obj || !verifyLoadObject(obj)) {
				return false;
			}
			loadObject(obj);
			return true;
		} catch (e) {
			return false;
		}
	}

	function iterateLocalStorageSaveList(callback) {
		var designList = window.localStorage.getItem(LOCAL_STORAGE_KEY_NAME);
		if (!designList) {
			return;
		}
		try {
			var obj = JSON.parse(designList);
			if (!obj) {
				return;
			}
			// FIXME: Add more verification logic.
			for (save of obj) {
				if (!save.name || !save.data || !verifyLoadObject(save.data)) {
					continue;
				}
				callback(save.name, save.data);
			}
		} catch (e) {
			return;
		}
	}

	function populateLocalStorageSaveList() {
		var selectElement = document.getElementById("localStorageLoadData");
		while (selectElement.childNodes.length > 0) {
			selectElement.removeChild(selectElement.childNodes[0]);
		}
		iterateLocalStorageSaveList(function(name, data) {
			var optionElement = document.createElement("option");
			optionElement.textContent = save.name;
			optionElement.value = save.name;
			selectElement.appendChild(optionElement);
		});
	}

	function immediateLoad() {
		var textArea = document.getElementById("immediateLoadData")
		if (load(textArea.value)) {
			textArea.value = "";
			openIconClicked();
		}
	}

	function localStorageLoad() {
		var selectElement = document.getElementById("localStorageLoadData");
		var selectedIndex = selectElement.selectedIndex;
		if (selectedIndex == -1) {
			return;
		}
		var saveName = selectElement.childNodes[selectElement.selectedIndex].value;
		iterateLocalStorageSaveList(function(name, value) {
			if (name != saveName) {
				return;
			}
			loadObject(value);
		});
		openIconClicked();
	}

	function localStorageSave() {
		var baseObject = [];
		var designList = window.localStorage.getItem(LOCAL_STORAGE_KEY_NAME);
		if (designList) {
			try {
				var b = JSON.parse(designList);
				if (b && Array.isArray(b)) {
					baseObject = b;
				}
			} catch (e) {
			}
		}
		var nameSelectionField = document.getElementById("localStorageSaveName");
		var newName = nameSelectionField.value;
		baseObject = baseObject.filter(function(item) {
			return typeof item == "object" && item.name && item.name != newName;
		});
		baseObject.push({
			name: newName,
			data: saveObject()
		})
		window.localStorage.setItem(LOCAL_STORAGE_KEY_NAME, JSON.stringify(baseObject));
		nameSelectionField.value = "";
		document.getElementById("saveCheck").style.display = "inline";
		populateLocalStorageSaveList();
	}

	function openIconClicked() {
		var openDialog = document.getElementById("openDialog");
		if (mode != Mode.NOTHING) {
			openDialog.style.display = "none";
			mode = Mode.NOTHING;
			return;
		}
		openDialog.style.display = "block";
		mode = Mode.LOAD;
	}

	function saveIconClicked() {
		var saveDialog = document.getElementById("saveDialog");
		if (mode != Mode.NOTHING) {
			saveDialog.style.display = "none";
			document.getElementById("saveCheck").style.display = "none";
			mode = Mode.NOTHING;
			return;
		}
		saveDialog.style.display = "block";
		document.getElementById("saveData").textContent = saveData();
		mode = Mode.SAVE;
	}









/*	var initialShapeDetails;
	var selectionDetails = {
		handleElements: new Map(),
		selectedShapes: new Map(),
		gestureStartX: 0,
		gestureStartY: 0
	};






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
*/




	// Event Handlers

	function mouseDownContentEventHandler(event) {
		/*var clickedShape;
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
		}*/
	}

	function mouseMoveContentEventHandler(event) {
		/*if (mode == Mode.CREATING_SHAPE) {
			resizeInitialShape(event.offsetX, event.offsetY);
		} else if (mode == Mode.SELECTING_HANDLE || mode == Mode.MOVING_HANDLES) {
			mode = Mode.MOVING_HANDLES;
			moveSelectedComponents(event.offsetX - selectionDetails.gestureStartX, event.offsetY - selectionDetails.gestureStartY);
		}*/
	}

	function mouseUpContentEventHandler(event) {
		/*if (tool == Tool.SELECTION) {
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
		}*/
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

		document.getElementById("selectionIcon").addEventListener("click", function() {
			selectTool(Tool.SELECTION);
		});
		document.getElementById("directSelectionIcon").addEventListener("click", function() {
			selectTool(Tool.DIRECT_SELECTION);
		});
		document.getElementById("addControlPointIcon").addEventListener("click", function() {
			selectTool(Tool.ADD_CONTROL_POINT);
		});
		document.getElementById("addRectangleIcon").addEventListener("click", function() {
			selectTool(Tool.CREATE_RECTANGLE);
		});
		document.getElementById("addOvalIcon").addEventListener("click", function() {
			selectTool(Tool.CREATE_OVAL);
		});

		document.getElementById("openIcon").addEventListener("click", openIconClicked);
		document.getElementById("saveIcon").addEventListener("click", saveIconClicked);
		document.getElementById("immediateLoad").addEventListener("click", immediateLoad);
		document.getElementById("localStorageLoad").addEventListener("click", localStorageLoad);
		document.getElementById("localStorageSave").addEventListener("click", localStorageSave);
	}

	window.addEventListener("load", function(event) {
		populateIconMap();
		populateEventListeners();
		populateLocalStorageSaveList();
	});
//})();