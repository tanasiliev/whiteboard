(function (canvas) {

    var msgQueue = [];
    var arrayLineCoord = [];
    var arrayCoord = [];
    var gc = null;
    var mouseDown = false;
    var oldX = null;
    var oldY = null;
    var text = null;
    var canvasPic = null;
    var wb = {};
    wb.lineCap = "round";
    wb.lineJoin = "square";
    wb.color = "#000000";
    wb.lineWidth = 6;
    wb.selectedTool = null;
    wb.history = null;

    var History = function () {
        this._stack = [];
        this._queue = [];
    };

    History.prototype = {
        get: function () {
            return this._stack;
        },
        add: function (data) {
            this._stack.push(data);
            if (this._queue.length > 0) {
                this._queue = [];
            }
            return this._stack;
        },
        undo: function () {
            if (this._stack.length == 0) {
                return;
            }
            this._queue.push(this._stack.pop());
            updateWhiteboard();
        },
        redo: function () {
            if (this._queue.length == 0) {
                return;
            }
            this._stack.push(this._queue.pop());
            updateWhiteboard();
        }
    };

    var updateWhiteboard = function () {
        gc.clearRect(0, 0, canvas.width, canvas.height);
        var h = wb.history.get();
        for (var i = 0; i < h.length; i++) {
            var obj = h[i];
            processAction(obj);
        }
    };

    wb.history = new History();

    var pencilTool = {};

    pencilTool.paint = function (pos, op) { /* op: 0 down, 1 move, 2 up */
        if (op !== 2) {
            addCoord(1, oldX, oldY, pos.x, pos.y);
        }
        else if (op === 2) {
            addEnqueue(1);
        }
        drawLine(oldX, oldY, pos.x, pos.y);
    };

    var eraserTool = {};

    eraserTool.paint = function (pos, op) {
        if (op !== 2) {
            addCoord(2, pos.x, pos.y);
        }
        else if (op === 2) {
            addEnqueue(2);
        }
        drawEraser(pos.x, pos.y);
    };

    var textTool = {};

    textTool.paint = function (pos, op) {
        if (op !== 0) {
            addCoord(4, oldX, oldY, pos.x, pos.y);
            setTimeout(function () {
                var text_content = prompt("Enter text", "");
                if (text_content) {
                    text = text_content;
                    drawText(text, pos.x, pos.y);
                    addEnqueue(4);
                }
                else {
                    arrayCoord.pop();
                    arrayCoord.pop();
                    return;
                }
            }, 200);
        }
    };

    wb.selectedTool = pencilTool;

    var getMousePos = function (e) {
        var rect = canvas.getBoundingClientRect();
        var cursorX = e.clientX - rect.left;
        var cursorY = e.clientY - rect.top;
        return {x: cursorX, y: cursorY};
    };

    var onMouseDown = function (ev) {
        var e = ev || window.event;
        var pos = getMousePos(e);
        mouseDown = true;
        oldX = pos.x;
        oldY = pos.y;
        if (oldY == pos.y) {
            oldY += 0.1;
        }
        wb.selectedTool.paint(pos, 0);
        stopEventPropagation(e);
    };

    var onMouseMove = function (ev) {
        if (!mouseDown) {
            return false;
        }
        var e = ev || window.event;
        var pos = getMousePos(e);
        wb.selectedTool.paint(pos, 1);
        oldX = pos.x;
        oldY = pos.y;
    };

    var onMouseUp = function (ev) {
        if (!mouseDown) {
            return false;
        }
        var e = ev || window.event;
        var pos = getMousePos(e);
        wb.selectedTool.paint(pos, 2);
        mouseDown = false;
        oldX = null;
        oldY = null;
    };

    var stopEventPropagation = function (e) {
        e.cancelBubble = true;
        e.returnValue = false;
        if (typeof (e.preventDefault) === "function") {
            e.preventDefault();
        }
        if (typeof (e.stopPropagation) === "function") {
            e.stopPropagation();
        }
        return false;
    };

    var enqueue = function (message) {
        msgQueue.push(message);
        submitQueue();
    };

    var drawLine = function (x1, y1, x2, y2) {
        paintLine(wb.lineWidth, wb.color, x1, y1, x2, y2);
    };

    var paintLine = function (width, color, x1, y1, x2, y2) {
        gc.lineCap = wb.lineCap;
        gc.lineJoin = wb.lineJoin;
        gc.lineWidth = width || wb.lineWidth;
        gc.strokeStyle = color || wb.color;
        gc.beginPath();
        gc.moveTo(x1, y1);
        gc.lineTo(x2, y2);
        gc.stroke();
    };

    var drawEraser = function (x, y) {
        paintEraser(x, y);
    };

    var paintEraser = function (x, y) {
        gc.globalCompositeOperation = "destination-out";
        gc.beginPath();
        gc.arc(x, y, 25, 0, Math.PI * 2);
        gc.fill();
        gc.globalCompositeOperation = "source-over";
    };

    var drawText = function (text, x, y) {
        paintText(text, wb.color, x, y);
    };

    var paintText = function (text, color, x, y) {
        gc.fillStyle = color || wb.color;
        gc.font = "bold 14px sans-serif";
        gc.textBaseline = "middle";
        gc.fillText(text, x, y);
    };

    var paintRect = function (width, color, left, top, right, bottom) {
        gc.lineWidth = width || wb.lineWidth;
        gc.strokeStyle = color || wb.color;
        gc.beginPath();
        gc.rect(left, top, right - left, bottom - top);
        gc.stroke();
    };

    var clear = function () {
        paintClear();
        addCoord(5);
    };

    var paintClear = function () {
        gc.clearRect(0, 0, canvas.width, canvas.height);
    };

    var processAction = function (messageString) {
        var o = messageString;
        var i, coord;
        for (var j = 0; j < o.length; ++j) {
            if (o[j].type === "wb") {
                switch (o[j].msg.op) {
                    case "paintLine":
                        coord = o[j].msg.coord;
                        for ( i = 0; i < coord.length; ++i) {
                            if ((i) % 4 === 0) {
                                paintLine(o[j].msg.width, o[j].msg.color, coord[i], coord[i + 1], coord[i + 2], coord[i + 3]);
                            }
                        }
                        break;
                    case "paintEraser":
                        coord = o[j].msg.coord;
                        for ( i = 0; i < coord.length; ++i) {
                            if ((i) % 2 === 0) {
                                paintEraser(coord[i], coord[i + 1]);
                            }
                        }
                        break;
                    case "paintText":
                        coord = o[j].msg.coord;
                        for (i = 0; i < coord.length; ++i) {
                            if ((i) % 2 === 0) {
                                paintText(o[j].msg.text, o[j].msg.color, coord[i], coord[i + 1]);
                            }
                        }
                        break;
                    case "clear":
                        paintClear();
                        break;
                }
            }
        }
    };

    var onSocketMessage = function (messageString) {

        if(messageString[0].type === "wb"){
            wb.history.add(messageString);
            processAction(messageString);
        }
        else
        {
            for (var i = 0; i < messageString.length; ++i) {
                wb.history.add(messageString[i]);
                processAction(messageString[i]);
            }
        }
    };

    var submitQueue = function () {
        if (msgQueue.length === 0) {
            return;
        }
        wbSendMessage(msgQueue);
        msgQueue = [];
    };

    var addEnqueue = function (tool) {    /* tool : 1 paintLine, 2 paintEraser,  3 paintRect, 4 paintText */
        switch (tool) {
            case 1:
                if (arrayLineCoord.length === 0) {
                    return;
                }
                enqueue({type: "wb", msg: { op: "paintLine", width: wb.lineWidth, color: wb.color, coord: arrayLineCoord }});
                arrayLineCoord = [];
                break;
            case 2:
                if (arrayCoord.length === 0) {
                    return;
                }
                enqueue({type: "wb", msg: { op: "paintEraser", coord: arrayCoord }});
                arrayCoord = [];
                break;
            case 3:
                if (arrayCoord.length === 0) {
                    return;
                }
                enqueue({type: "wb", msg: { op: "paintRect", width: wb.lineWidth, color: wb.color, coord: arrayCoord }});
                arrayCoord = [];
                break;
            case 4:
                enqueue({type: "wb", msg: { op: "paintText", text: text, color: wb.color, coord: arrayCoord }});
                arrayCoord = [];
                break;
        }
    };

    var addCoord = function (tool, x1, y1, x2, y2) {      /* tool : 1 paintLine, 2 paintEraser,  3 paintRect , 4 paintText */
        switch (tool) {
            case 1:
                arrayLineCoord.push(x1);
                arrayLineCoord.push(y1);
                arrayLineCoord.push(x2);
                arrayLineCoord.push(y2);
                if (arrayLineCoord.length > 1500) {
                    enqueue({type: "wb", msg: {op: "paintLine", width: wb.lineWidth, color: wb.color, coord: arrayLineCoord}});
                    arrayLineCoord = [];
                }
                break;
            case 2:
                arrayCoord.push(x1);
                arrayCoord.push(y1);
                if (arrayCoord.length > 1500) {
                    enqueue({type: "wb", msg: { op: "paintEraser", coord: arrayCoord }});
                    arrayCoord = [];
                }
                break;
            case 3:
                arrayCoord.push(x1);
                arrayCoord.push(y1);
                arrayCoord.push(x2);
                arrayCoord.push(y2);
                break;
            case 4:
                arrayCoord.push(x1);
                arrayCoord.push(y1);
                break;
            case 5:
                arrayLineCoord = [];
                arrayCoord = [];
                enqueue({type: "wb", msg: { op: "clear"}});
                break;
        }
    };

    var drawImage = function (src) {
        var imgObject = new Image();
        var gc = canvasPic.getContext("2d");
        imgObject.onload = function () {
            if (imgObject.width >= canvas.width) {
                gc.drawImage(imgObject, 0, 0, canvas.width, canvas.height);
            }
            else {
                gc.drawImage(imgObject, 0, 0, imgObject.width, imgObject.height);
            }
        };
        imgObject.src = src;
    };

    var attach = function (canvas) {
        if ((screen.width > 800) && (screen.height > 600)) {
            canvas.width = 660;
            canvas.height = 480;
            gc = canvas.getContext("2d");
            canvas.addEventListener('mousedown', onMouseDown, false);
            canvas.addEventListener('mousemove', onMouseMove, false);
            canvas.addEventListener('mouseup', onMouseUp, false);
            var container = document.getElementById("span-container")
            canvasPic = document.createElement('canvas');
            canvasPic.id = "canvasPic";
            canvasPic.width = canvas.width;
            canvasPic.height = canvas.height;
            container.appendChild(canvasPic);
        }
        else
        {
            alert("Current Screen is too Small!")
        }
    };

    attach(canvas);

    if (!whiteboard) {
        var whiteboard = {
            tool: function (tool) {
                switch (tool) {
                    case "pencil":
                        wb.selectedTool = pencilTool;
                        break;
                    case "text":
                        wb.selectedTool = textTool;
                        break;
                    case "eraser":
                        wb.selectedTool = eraserTool;
                        break;
                }
            },
            toolColor: function (value) {
                wb.color = value;
            },
            lineWidth: function (value) {
                wb.lineWidth = value;
            },
            history: function () {
                return wb.history;
            },
            onSocketMessage: onSocketMessage,
            drawImage: drawImage
        };
        window.whiteboard = whiteboard;
    }

}(document.getElementById("canvas")));
