
class Vec3 {
  x;
  y;
  z;

  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  get r() {
    return this.x;
  }

  get g() {
    return this.y;
  }

  get b() {
    return this.z;
  }
}

class Vertex {
  pos;
  color;

  constructor(pos, color) {
    this.pos = pos;
    this.color = color;
  }

  static primsPerVertex = 7;
  static primsPerPos = 4;
  static primsPerColor = 3;
  static primSize;
  static primType;
  static get stride() {
    return Vertex.primSize * Vertex.primsPerVertex;
  }
}

class Mesh {
  verts = [];
  renderType;

  // These get filled in after the vbo generation
  vboStart;
  vboCount;
}

class SceneGraphNode {
  name;
  pos;
  rot;
  scale;

  children = [];
  mesh;

  constructor(name, pos, rot, scale, mesh) {
    if (name === undefined || name === null) {
      throw 'Name for a SceneGraphNode is required!'
    }
    this.name = name;
    if (Animation.nodes[name] !== undefined && Animation.nodes[name] !== null) {
      throw 'Duplicate SceneGraphNode name: ' + name;
    }
    Animation.nodes[name] = this;

    if (pos === undefined || pos === null) {
      this.pos = new Vec3(0, 0, 0);
    } else {
      this.pos = pos;
    }

    if (rot === undefined || rot === null) {
      this.rot = new Vec3(0, 0, 0);
    } else {
      this.rot = rot;
    }

    if (scale === undefined || scale === null) {
      this.scale = new Vec3(1, 1, 1);
    } else {
      this.scale = scale;
    }

    if (mesh !== undefined && mesh !== null) {
      this.mesh = mesh;
    }
  }
}

var SceneGraph = SceneGraphNode;

class RenderProgram {
  vertShader = `
    uniform mat4 u_ModelMatrix;
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;
    void main() {
      gl_Position = u_ModelMatrix * a_Position;
      gl_PointSize = 10.0;
      v_Color = a_Color;
    }`;

  fragShader = `
    precision mediump float;
    varying vec4 v_Color;
    void main() {
      gl_FragColor = v_Color;
    }`;

  attribIds = {};
}

class Context {
  static canvas;
  static sceneGraph;
  static vboId;
  static renderProgram = new RenderProgram();
  static fps = 30;
  static lastAnimationTick = Date.now();
}

class Animation {
  static nodes = {};
}

class Event {
  static mouseDrag = {x: 0, y: 0, currentlyDragging: false};
}

// Allowing 1 global bc it makes things so much easier and gl is more of a namespace than a variable anyway
var gl;

function main() {
  Context.canvas = document.getElementById('webgl');
  gl = getWebGLContext(Context.canvas);
  Vertex.primType = gl.FLOAT;
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(gl, Context.renderProgram.vertShader, Context.renderProgram.fragShader)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  initSceneGraph();

  maxVerts = initVertexBuffer(gl);
  if (maxVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  gl.clearColor(0.3, 0.3, 0.3, 1.0);

  gl.depthFunc(gl.GREATER);
  gl.clearDepth(0.0);
  gl.enable(gl.DEPTH_TEST);

  modelMatrixId = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  Context.renderProgram.attribIds['u_ModelMatrix'] = modelMatrixId;
  if (!modelMatrixId) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  window.addEventListener("mousedown", myMouseDown);
  window.addEventListener("mousemove", myMouseMove);
  window.addEventListener("mouseup", myMouseUp);

  tick();
}

function animate() {
  time = Date.now();

  xRot = document.getElementById("armRotation").value;
  Animation.nodes['l1'].rot = new Vec3(xRot, 180 + 45 * Math.sin(time / 1000), 0.0);
  Animation.nodes['l2'].rot = new Vec3(0.0, 45 * Math.sin(time / 500), 0.0);
  Animation.nodes['l3'].rot = new Vec3(0.0, 45 * Math.sin(time / 250), 0.0);
  Animation.nodes['l4'].rot = new Vec3(0.0, 45 * Math.sin(time / 125), 0.0);
  Animation.nodes['l5'].rot = new Vec3(0.0, 45 * Math.sin(time / 62.5), 0.0);

  currPos = Animation.nodes['l1'].pos;
  Animation.nodes['l1'].pos = new Vec3(Event.mouseDrag.x, Event.mouseDrag.y, currPos.z);

  Context.lastAnimationTick = time;
}

function tick() {
  animate();
  drawAll();
  requestAnimationFrame(tick, Context.canvas);
}

function initSceneGraph() {
  var numCircleParts = 100;

  circleVerts = [new Vertex(new Vec3(0.0, 0.0, 0.0), new Vec3(1.0, 1.0, 1.0))];
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos = new Vec3(Math.cos(rads), Math.sin(rads), 0.0);
    color = new Vec3(rgb.r, rgb.g, rgb.b);
    circleVerts.push(new Vertex(pos, color));
  }
  circleMesh = new Mesh();
  circleMesh.renderType = gl.TRIANGLE_FAN;
  circleMesh.verts = circleVerts;

  cyllinderVerts = []
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos1 = new Vec3(Math.cos(rads), Math.sin(rads), 0.0);
    pos2 = new Vec3(0.5 * Math.cos(rads), 0.5 * Math.sin(rads), 1.0);
    color = new Vec3(rgb.r, rgb.g, rgb.b);
    cyllinderVerts.push(new Vertex(pos1, color), new Vertex(pos2, color));
  }
  cyllinderMesh = new Mesh();
  cyllinderMesh.renderType = gl.TRIANGLE_STRIP;
  cyllinderMesh.verts = cyllinderVerts;

  topNode = new SceneGraph("root");

  var makeCyllinder = function(height, pos, rot, scale, name) {
    cylNode =       new SceneGraphNode(name,             pos,                        rot,               scale,                          null);
    cylTopNode =    new SceneGraphNode(name + "_Top",    new Vec3(0.0, 0.0, 0),      new Vec3(0, 0, 0), new Vec3(1.0, 1.0, 1.0),        circleMesh);
    cylBotNode =    new SceneGraphNode(name + "_Bot",    new Vec3(0.0, 0.0, height), new Vec3(0, 0, 0), new Vec3(0.5, 0.5, 1.0),        circleMesh);
    cylMiddleNode = new SceneGraphNode(name + "_Middle", new Vec3(0.0, 0.0, 0),      new Vec3(0, 0, 0), new Vec3(1.0, 1.0, height), cyllinderMesh);
    cylNode.children = [cylTopNode, cylBotNode, cylMiddleNode];
    return cylNode;
  }

  l1Node = makeCyllinder(4, new Vec3(0.0, -1.0, 0.0), new Vec3(90, 180, 0), new Vec3(0.1, 0.1, 0.1), "l1");
  l2Node = makeCyllinder(2, new Vec3(0.0, 0.0, 4.0), new Vec3(0, 0, 0), new Vec3(0.5, 0.5, 1.0), "l2");
  l1Node.children.push(l2Node);
  l3Node = makeCyllinder(1, new Vec3(0.0, 0.0, 2.0), new Vec3(0, 0, 0), new Vec3(0.5, 0.5, 1.0), "l3");
  l2Node.children.push(l3Node);
  l4Node = makeCyllinder(0.5, new Vec3(0.0, 0.0, 1.0), new Vec3(0, 0, 0), new Vec3(0.5, 0.5, 1.0), "l4");
  l3Node.children.push(l4Node);
  l5Node = makeCyllinder(0.25, new Vec3(0.0, 0.0, 0.5), new Vec3(0, 0, 0), new Vec3(0.5, 0.5, 1.0), "l5");
  l4Node.children.push(l5Node);

  topNode.children = [l1Node];

  Context.sceneGraph = topNode;
  console.log("Full Graph: ",topNode);
}

function buildBuffer(graphNode, currBuffer) {
  if (graphNode.mesh) {
    graphNode.mesh.vboStart = currBuffer.length / Vertex.primsPerVertex;
    for (vertex of graphNode.mesh.verts) {
      if (vertex.color === undefined) {
        console.log(vertex);
      }
      currBuffer.push(vertex.pos.x, vertex.pos.y, vertex.pos.z, 1.0, vertex.color.r, vertex.color.g, vertex.color.b);
    }
    graphNode.mesh.vboCount = currBuffer.length / Vertex.primsPerVertex - graphNode.mesh.vboStart;
  }

  for (child of graphNode.children) {
    buildBuffer(child, currBuffer);
  }

  return currBuffer;
}

function initVertexBuffer() {
  var bufferValues = buildBuffer(Context.sceneGraph, []);
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

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return bufferValues.length;
}

function drawNode(modelMatrix, node, scale) {
  // Gotta do all these scaling hacks because scaling and rotation don't play nice
  if (scale === undefined) {
    scale = new Vec3(1.0, 1.0, 1.0);
  }

  pushMatrix(modelMatrix);
  modelMatrix.translate(scale.x * node.pos.x, scale.y * node.pos.y, scale.z * node.pos.z);
  modelMatrix.rotate(node.rot.x, 1, 0, 0);
  modelMatrix.rotate(node.rot.y, 0, 1, 0);
  modelMatrix.rotate(node.rot.z, 0, 0, 1);

  scale = new Vec3(scale.x * node.scale.x, scale.y * node.scale.y, scale.z * node.scale.z);

  if (node.mesh) {
    pushMatrix(modelMatrix);
    modelMatrix.scale(scale.x, scale.y, scale.z);
    gl.uniformMatrix4fv(Context.renderProgram.attribIds['u_ModelMatrix'], false, modelMatrix.elements);
    gl.drawArrays(node.mesh.renderType, node.mesh.vboStart, node.mesh.vboCount);
    modelMatrix = popMatrix();
  }

  for (child of node.children) {
    modelMatrix = drawNode(modelMatrix, child, scale);
  }
  return popMatrix();
}

function drawAll() {
  // First, fix canvas size if the user resized the window
  var canvas = Context.canvas;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  var aspect_ratio = canvas.width / canvas.height;
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Now clear and draw
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  modelMatrix = new Matrix4();
  drawNode(modelMatrix, Context.sceneGraph);
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
