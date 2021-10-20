
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
}

class Animation {
  static nodes = {};
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

  tick();
}

function animate() {
  timeVal = (new Date().getTime() / 10) % 360
  Animation.nodes['square2'].rot = new Vec3(timeVal, timeVal, timeVal);
  Animation.nodes['tetraParent'].rot = new Vec3((new Date().getTime() / 100) % 360, 0, 0);
}

function tick() {
  animate();
  drawAll();
  requestAnimationFrame(tick, Context.canvas);
}

function initSceneGraph() {
  var c30 = Math.sqrt(0.75); // cos(30deg) == sqrt(3) / 2 == sqrt(3/4)
  var sq2 = Math.sqrt(2.0);

  tetraMesh = new Mesh();
  tetraMesh.renderType = gl.TRIANGLES;
  tetraMesh.verts = [
    new Vertex(new Vec3( 0.0,  0.0, sq2), new Vec3(1.0, 1.0, 1.0)),
    new Vertex(new Vec3( c30, -0.5, 0.0), new Vec3(0.0, 0.0, 1.0)),
    new Vertex(new Vec3( 0.0,  1.0, 0.0), new Vec3(1.0, 0.0, 0.0)),
    new Vertex(new Vec3( 0.0,  0.0, sq2), new Vec3(1.0, 1.0, 1.0)),
    new Vertex(new Vec3( 0.0,  1.0, 0.0), new Vec3(1.0, 0.0, 0.0)),
    new Vertex(new Vec3(-c30, -0.5, 0.0), new Vec3(0.0, 1.0, 0.0)),
    new Vertex(new Vec3( 0.0,  0.0, sq2), new Vec3(1.0, 1.0, 1.0)),
    new Vertex(new Vec3(-c30, -0.5, 0.0), new Vec3(0.0, 1.0, 0.0)),
    new Vertex(new Vec3( c30, -0.5, 0.0), new Vec3(0.0, 0.0, 1.0)),
    new Vertex(new Vec3(-c30, -0.5, 0.0), new Vec3(0.0, 1.0, 0.0)),
    new Vertex(new Vec3( 0.0,  1.0, 0.0), new Vec3(1.0, 0.0, 0.0)),
    new Vertex(new Vec3( c30, -0.5, 0.0), new Vec3(0.0, 0.0, 1.0))
  ];

  wedgeMesh = new Mesh();
  wedgeMesh.renderType = gl.TRIANGLES;
  wedgeMesh.verts = [
    new Vertex(new Vec3( 0.0,  0.0, sq2), new Vec3(1.0, 1.0, 1.0)),
    new Vertex(new Vec3(-c30, -0.5, 0.0), new Vec3(0.0, 1.0, 0.0)),
    new Vertex(new Vec3( c30, -0.5, 0.0), new Vec3(0.0, 0.0, 1.0)),
    new Vertex(new Vec3(-c30, -0.5, 0.0), new Vec3(0.0, 1.0, 0.0)),
    new Vertex(new Vec3( 0.0,  1.0, 0.0), new Vec3(1.0, 0.0, 0.0)),
    new Vertex(new Vec3( c30, -0.5, 0.0), new Vec3(0.0, 0.0, 1.0))
  ];

  squareMesh = new Mesh();
  squareMesh.renderType = gl.TRIANGLE_FAN
  squareMesh.verts = [
    new Vertex(new Vec3(-0.5, -0.5, 0.0), new Vec3(1.0, 0.0, 0.0)),
    new Vertex(new Vec3(-0.5,  0.5, 0.0), new Vec3(0.0, 1.0, 0.0)),
    new Vertex(new Vec3( 0.5,  0.5, 0.0), new Vec3(0.0, 0.0, 1.0)),
    new Vertex(new Vec3( 0.5, -0.5, 0.0), new Vec3(1.0, 1.0, 1.0))
  ];

  triangleMesh = new Mesh();
  triangleMesh.renderType = gl.TRIANGLES;
  triangleMesh.verts = [
    new Vertex(new Vec3(-0.5, -0.5, 0.0), new Vec3(0.0, 1.0, 1.0)),
    new Vertex(new Vec3(-0.5,  0.5, 0.0), new Vec3(1.0, 0.0, 1.0)),
    new Vertex(new Vec3( 0.5,  0.5, 0.0), new Vec3(1.0, 1.0, 0.0))
  ];

  topNode = new SceneGraph("root");

  tetraParentNode = new SceneGraphNode("tetraParent", new Vec3(-0.4, -0.4, 0.0),   new Vec3(0, 0, 0),        new Vec3(0.5, 0.5, 0.5),  null);
  tetraNode       = new SceneGraphNode("tetra",       null,                        null,                     null,                     tetraMesh);
  square1Node     = new SceneGraphNode("square1",     new Vec3(-1.1, -0.75, 0.0),  new Vec3(-50, 50, -100),  new Vec3(0.5, 0.5, 0.5),  squareMesh);
  square2Node     = new SceneGraphNode("square2",     new Vec3(1.5, -.75, 0.0),    new Vec3(90, 90, -100),   new Vec3(0.5, 0.5, 0.5),  squareMesh);
  square3Node     = new SceneGraphNode("square3",     new Vec3(1.1, -0.75, 0.0),   new Vec3(50, 50, -100),   new Vec3(0.5, 0.5, 0.5),  squareMesh);

  dragObjNode   = new SceneGraphNode("dragObj",       new Vec3(0, 0.5, 0.0),  null,                     new Vec3(0.2, 0.2, 0.2),  null);
  dragTetraNode = new SceneGraphNode("dragTetra",     null,                   null,                     null,                     wedgeMesh);
  triangleNode  = new SceneGraphNode("triangle",      null,                   new Vec3(-25, -25, 135),  null,                     triangleMesh);

  topNode.children = [tetraParentNode, dragObjNode];
  tetraParentNode.children = [tetraNode, square1Node, square2Node, square3Node];
  dragObjNode.children = [dragTetraNode, triangleNode];

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
