RenderProgram.vertShader = `
    uniform mat4 u_ModelMatrix;
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;
    void main() {
      gl_Position = u_ModelMatrix * a_Position;
      gl_PointSize = 10.0;
      v_Color = a_Color;
    }`;

RenderProgram.fragShader = `
    precision mediump float;
    varying vec4 v_Color;
    void main() {
      gl_FragColor = v_Color;
    }`;


class Event {
  static mouseDrag = {x: 0, y: 0, currentlyDragging: false};
}

function main() {
  canvas = document.getElementById('webgl');

  if (!init(canvas)) {
    return;
  }

  initSceneGraph();

  maxVerts = initVertexBuffer(gl);
  if (maxVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  gl.clearColor(0.3, 0.3, 0.3, 1.0);

  window.addEventListener("mousedown", myMouseDown);
  window.addEventListener("mousemove", myMouseMove);
  window.addEventListener("mouseup", myMouseUp);

  tick();
}

function animate() {
  time = Date.now();

  xRot = document.getElementById("armRotation").value;
  Animation.nodes['l1'].rot = new Rot(xRot, 180 + 45 * Math.sin(time / 1000), 0.0);
  Animation.nodes['l2'].rot = new Rot(0.0, 45 * Math.sin(time / 500), 0.0);
  Animation.nodes['l3'].rot = new Rot(0.0, 45 * Math.sin(time / 250), 0.0);
  Animation.nodes['l4'].rot = new Rot(0.0, 45 * Math.sin(time / 125), 0.0);
  Animation.nodes['l5'].rot = new Rot(0.0, 45 * Math.sin(time / 62.5), 0.0);

  currPos = Animation.nodes['l1'].pos;
  Animation.nodes['l1'].pos = new Pos(Event.mouseDrag.x, Event.mouseDrag.y, currPos.z);

  Context.lastAnimationTick = time;
}

function tick() {
  animate();
  drawAll();
  requestAnimationFrame(tick, Context.canvas);
}

function initSceneGraph() {
  var numCircleParts = 100;

  circleVerts = [new Vertex(new Pos(0.0, 0.0, 0.0), new Color(1.0, 1.0, 1.0))];
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos = new Pos(Math.cos(rads), Math.sin(rads), 0.0);
    color = new Color(rgb.r, rgb.g, rgb.b);
    circleVerts.push(new Vertex(pos, color));
  }
  circleMesh = new Mesh();
  circleMesh.renderType = gl.TRIANGLE_FAN;
  circleMesh.verts = circleVerts;

  cyllinderVerts = []
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos1 = new Pos(Math.cos(rads), Math.sin(rads), 0.0);
    pos2 = new Pos(0.5 * Math.cos(rads), 0.5 * Math.sin(rads), 1.0);
    color = new Color(rgb.r, rgb.g, rgb.b);
    cyllinderVerts.push(new Vertex(pos1, color), new Vertex(pos2, color));
  }
  cyllinderMesh = new Mesh();
  cyllinderMesh.renderType = gl.TRIANGLE_STRIP;
  cyllinderMesh.verts = cyllinderVerts;

  topNode = new SceneGraph("root");

  var makeCyllinder = function(height, pos, rot, scale, name) {
    cylNode =       new SceneGraphNode(name,             pos,                       rot,              scale,                       null);
    cylTopNode =    new SceneGraphNode(name + "_Top",    new Pos(0.0, 0.0, 0),      new Rot(0, 0, 0), new Scale(1.0, 1.0, 1.0),    circleMesh);
    cylBotNode =    new SceneGraphNode(name + "_Bot",    new Pos(0.0, 0.0, height), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0),    circleMesh);
    cylMiddleNode = new SceneGraphNode(name + "_Middle", new Pos(0.0, 0.0, 0),      new Rot(0, 0, 0), new Scale(1.0, 1.0, height), cyllinderMesh);
    cylNode.children = [cylTopNode, cylBotNode, cylMiddleNode];
    return cylNode;
  }

  l1Node = makeCyllinder(4, new Pos(0.0, -1.0, 0.0), new Rot(90, 180, 0), new Scale(0.1, 0.1, 0.1), "l1");
  l2Node = makeCyllinder(2, new Pos(0.0, 0.0, 4.0), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0), "l2");
  l1Node.children.push(l2Node);
  l3Node = makeCyllinder(1, new Pos(0.0, 0.0, 2.0), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0), "l3");
  l2Node.children.push(l3Node);
  l4Node = makeCyllinder(0.5, new Pos(0.0, 0.0, 1.0), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0), "l4");
  l3Node.children.push(l4Node);
  l5Node = makeCyllinder(0.25, new Pos(0.0, 0.0, 0.5), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0), "l5");
  l4Node.children.push(l5Node);

  topNode.children = [l1Node];

  Context.sceneGraph = topNode;
  console.log("Full Graph: ",topNode);
  console.log("Name Graph: ", getNameGraph(topNode));
}

function getNameGraph(topNode) {
  var topNameNode = {};
  topNameNode[topNode.name] = getNameGraphHelper(topNode);
  return topNameNode;
}

function getNameGraphHelper(topNode) {
  var currNode = {};
  
  for (child of topNode.children) {
    currNode[child.name] = getNameGraphHelper(child);
  }
  
  return currNode;
}

function initVertexBuffer() {
  var bufferValues = buildBuffer(Context.sceneGraph);
  var buffer = new Float32Array(bufferValues);

  // Create a buffer object
  Context.vboId = gl.createBuffer();
  if (!Context.vboId) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, Context.vboId);
  gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);

  Vertex.primSize = buffer.BYTES_PER_ELEMENT;

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  Context.renderProgram.attribIds['a_Position'] = a_Position;
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, Vertex.primsPerPos, Vertex.primType, false /* Normalize */, Vertex.stride, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  Context.renderProgram.attribIds['a_Color'] = a_Color;
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, Vertex.primsPerColor, Vertex.primType, false /* Normalize */, Vertex.stride, Vertex.primSize * Vertex.primsPerPos);
  gl.enableVertexAttribArray(a_Color);
  
  modelMatrixId = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  Context.renderProgram.attribIds['u_ModelMatrix'] = modelMatrixId;
  if (!modelMatrixId) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  return bufferValues.length;
}

// HSV to RGB conversion from https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: r,
        g: g,
        b: b
    };
}

// Code adapted from ControlMulti.js
function getMouseEventCoords(ev) {
  var rect = Context.canvas.getBoundingClientRect();
  var xp = ev.clientX - rect.left;
  var yp = Context.canvas.height - (ev.clientY - rect.top);

  var x = (xp - Context.canvas.width/2) / (Context.canvas.width/2);
  var y = (yp - Context.canvas.height/2) / (Context.canvas.height/2);

  return {x: x, y: y};
}

function myMouseDown(ev) {
  coords = getMouseEventCoords(ev);

  console.log(coords);

  if (coords.x > 1 || coords.x < -1 || coords.y > 1 || coords.y < -1) {
    return;
  }

  Event.mouseDrag.x = coords.x;
  Event.mouseDrag.y = coords.y;
  Event.mouseDrag.currentlyDragging = true;
};

function myMouseMove(ev) {
  if(!Event.mouseDrag.currentlyDragging) return;

  coords = getMouseEventCoords(ev);

  Event.mouseDrag.x = coords.x;
  Event.mouseDrag.y = coords.y;
};

function myMouseUp(ev) {
  coords = getMouseEventCoords(ev);

  Event.mouseDrag.currentlyDragging = false;
};
