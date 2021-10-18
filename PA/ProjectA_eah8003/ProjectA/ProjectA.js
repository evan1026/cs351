
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
  static primType = gl.FLOAT;
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
  position;
  rotation;
  scale;

  children = [];
  mesh;

  constructor(pos, rot, scale, mesh) {
    if (pos === undefined) {
      this.position = new Vec3(0, 0, 0);
    } else {
      this.position = pos;
    }

    if (rot === undefined) {
      this.rotation = new Vec3(0, 0, 0);
    } else {
      this.rotation = rot;
    }

    if (scale === undefined) {
      this.scale = new Vec3(1, 1, 1);
    } else {
      this.scale = scale;
    }

    if (mesh !== undefined) {
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
  static gl;
  static canvas;
  static sceneGraph;
  static vboId;
  static renderProgram = new RenderProgram();
}

function main() {
  Context.canvas = document.getElementById('webgl');
  Context.gl = getWebGLContext(canvas);
  if (!Context.gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(Context.gl, Context.vertShader, Context.fragShader)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  initSceneGraph();

  maxVerts = initVertexBuffer(gl);
  if (maxVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  Context.gl.clearColor(0.3, 0.3, 0.3, 1.0);

  Context.gl.depthFunc(gl.GREATER);
  Context.gl.clearDepth(0.0);
  Context.gl.enable(gl.DEPTH_TEST);

  modelMatrixId = Context.gl.getUniformLocation(Context.gl.program, 'u_ModelMatrix');
  Context.renderProgram.attribIds['u_ModelMatrix'] = modelMatrixId;
  if (!initUniformPointer('u_ModelMatrix') {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
}

function initSceneGraph() {
  tetraMesh = new Mesh();
  tetraMesh.renderType = gl.TRIANGLES;
  tetraMesh.verts = [
    new Vertex({.pos = new Vec3( 0.0,  0.0, 0.0), .color = new Vec3(1.0, 1.0, 1.0)}),
    new Vertex({.pos = new Vec3( c30, -0.5, 0.0), .color = new Vec3(0.0, 0.0, 1.0)}),
    new Vertex({.pos = new Vec3( 0.0,  1.0, 0.0), .color = new Vec3(1.0, 0.0, 0.0)}),
    new Vertex({.pos = new Vec3( 0.0,  1.0, sq2), .color = new Vec3(1.0, 1.0, 1.0)}),
    new Vertex({.pos = new Vec3( 0.0,  1.0, 0.0), .color = new Vec3(1.0, 0.0, 0.0)}),
    new Vertex({.pos = new Vec3(-c30, -0.5, 0.0), .color = new Vec3(1.0, 1.0, 0.0)}),
    new Vertex({.pos = new Vec3( 0.0,  0.0, sq2), .color = new Vec3(1.0, 1.0, 1.0)}),
    new Vertex({.pos = new Vec3(-c30, -0.5, 0.0), .color = new Vec3(0.0, 1.0, 0.0)}),
    new Vertex({.pos = new Vec3( c30, -0.5, 0.0), .color = new Vec3(0.0, 0.0, 1.0)}),
    new Vertex({.pos = new Vec3(-c30, -0.5, 0.0), .color = new Vec3(0.0, 1.0, 0.0)}),
    new Vertex({.pos = new Vec3( 0.0,  1.0, 0.0), .color = new Vec3(1.0, 0.0, 0.0)}),
    new Vertex({.pos = new Vec3( c30, -0.5, 0.0), .color = new Vec3(0.0, 0.0, 1.0)})
  ];

  wedgeMesh = new Mesh();
  wegdeMesh.renderType = gl.TRIANGLES;
  wedgeMesh.verts = [
    new Vertex({.pos = new Vec3( 0.0,  0.0, sq2), .color = new Vec3(1.0, 1.0, 1.0)}),
    new Vertex({.pos = new Vec3(-c30, -0.5, 0.0), .color = new Vec3(0.0, 1.0, 0.0)}),
    new Vertex({.pos = new Vec3( c30, -0.5, 0.0), .color = new Vec3(0.0, 0.0, 1.0)}),
    new Vertex({.pos = new Vec3(-c30, -0.5, 0.0), .color = new Vec3(0.0, 1.0, 0.0)}),
    new Vertex({.pos = new Vec3( 0.0,  1.0, 0.0), .color = new Vec3(1.0, 0.0, 0.0)}),
    new Vertex({.pos = new Vec3( c30, -0.5, 0.0), .color = new Vec3(0.0, 0.0, 1.0)})
  ];

  squareMesh = new Mesh();
  squareMesh.renderType = gl.TRIANGLE_FAN
  squareMesh.verts = [
    new Vertex({.pos = new Vec3(-0.5, -0.5, 0.0), .color = new Vec3(1.0, 0.0, 0.0)}),
    new Vertex({.pos = new Vec3(-0.5,  0.5, 0.0), .color = new Vec3(0.0, 1.0, 0.0)}),
    new Vertex({.pos = new Vec3( 0.5,  0.5, 0.0), .color = new Vec3(0.0, 0.0, 1.0)}),
    new Vertex({.pos = new Vec3( 0.5, -0.5, 0.0), .color = new Vec3(1.0, 1.0, 1.0)})
  ];

  triangleMesh = new Mesh();
  triangleMesh.renderType = gl.TRIANGLES;
  triangleMesh.verts = [
    new Vertex({.pos = new Vec3(-0.5, -0.5, 0.0), .color = new Vec3(0.0, 1.0, 1.0)}),
    new Vertex({.pos = new Vec3(-0.5,  0.5, 0.0), .color = new Vec3(1.0, 0.0, 1.0)}),
    new Vertex({.pos = new Vec3( 0.5,  0.5, 0.0), .color = new Vec3(1.0, 1.0, 0.0)}),
  ];

  topNode = new SceneGraph();

  tetraParentNode = new SceneGraphNode();
  tetraNode = new SceneGraphNode();
  squareNode = new SceneGraphNode();

  dragObjNode = new SceneGraphNode();
  dragTetraNode = new SceneGraphNode();
  triangleNode = new SceneGraphNode();

  topNode.children = [tetraParentNode, dragObjNode];
  tetraParentNode.children = [tetraNode, squareNode];
  dragObjNode.children = [dragTetraNode, triangleNode];

  tetraNode.mesh = tetraMesh;
  dragTetraNode.mesh = wedgeMesh;
  squareNode.mesh = squareMesh;
  triangleNode.mesh = triangleMesh;

  Context.sceneGraph = topNode;
}

function buildBuffer(graphNode, currBuffer) {
  if (graphNode.mesh) {
    mesh.vboStart = currBuffer.length;
    for (vertex in graphNode.mesh.verts) {
      currBuffer.append(vertex.pos.x);
      currBuffer.append(vertex.pos.y);
      currBuffer.append(vertex.pos.z);
      currBuffer.append(1.0);
      currBuffer.append(vertex.color.r);
      currBuffer.append(vertex.color.g);
      currBuffer.append(vertex.color.b);
    }
    mesh.vboCount = (currBuffer.length - mesh.vboStart) / Vertex.primsPerVertex;
  }

  for (child in graphNode.children) {
    buildBuffer(child, currBuffer);
  }

  return currBuffer;
}

function initVertexBuffer() {
  var bufferValues = buildBuffer(Context.sceneGraph, []);
  var buffer = new Float32Array(bufferValues);

  // Create a buffer object
  var Context.vboId = gl.createBuffer();
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
  gl.vertexAttribPointer(a_Position, Vertex,primsPerPos, Vertex.primType, false /* Normalize */, Vertex.stride, 0);
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

function drawNode(modelMatrix, node) {
  pushMatrix(modelMatrix);
  modelMatrix.translate(node.pos.x, node.pos.y, node.pos.z);
  modelMatrix.scale(node.scale.x, node.scale.y, node.scale.z);
  modelMatrix.rotate(node.rot.x, 1, 0, 0);
  modelMatrix.rotate(node.rot.y, 0, 1, 0);
  modelMatrix.rotate(node.rot.z, 1, 0, 0);

  if (node.mesh) {
    Context.gl.uniformMatrix4fv(Context.renderProgram.attribIds['u_ModelMatrix'], false, modelMatrix.elements);
    Context.gl.drawArrays(node.mesh.renderType, node.mesh.vboStart, node.mesh.vboCount);
  }

  for (child in node.children) {
    modelMatrix = drawNode(modelMatrix, node);
  }
  return popMatrix();
}

function drawAll() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  modelMatrix = new Matrix4();
  drawNode(modelMatrix, Context.sceneGraph);

  g_modelMatrix.setTranslate(-0.4,-0.4, 0.0);
  g_modelMatrix.scale(1,1,-1);
  g_modelMatrix.scale(0.5, 0.5, 0.5);
  g_modelMatrix.rotate(g_angle01, 0, 1, 0);
  g_modelMatrix.rotate(g_angle02, 1, 0, 0);

  gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
  drawTetra();

  pushMatrix(g_modelMatrix);
  g_modelMatrix.scale(0.5, 0.5, 0.5);
  g_modelMatrix.translate(2.2, -1.3, 0.0);
  g_modelMatrix.rotate(100, 0, 0, 1);
  g_modelMatrix.rotate(50, 1, 1, 0);
  gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
  drawSquare();
  g_modelMatrix = popMatrix();

  pushMatrix(g_modelMatrix);
  g_modelMatrix.scale(0.5, 0.5, 0.5);
  g_modelMatrix.translate(-2.2, -1.3, 0.0);
  g_modelMatrix.rotate(-100, 0, 0, 1);
  g_modelMatrix.rotate(50, -1, 1, 0);
  gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
  drawSquare();
  g_modelMatrix = popMatrix();

  pushMatrix(g_modelMatrix);
  g_modelMatrix.scale(0.5, 0.5, 0.5);
  g_modelMatrix.translate(0, 0, 3.5);
  //g_modelMatrix.rotate(-100, 0, 0, 1);
  g_modelMatrix.rotate(90, 1, 1, 0);
  gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
  drawSquare();
  g_modelMatrix = popMatrix();

  g_modelMatrix.setTranslate(0.4, 0.4, 0.0);
  g_modelMatrix.scale(1,1,-1);
  g_modelMatrix.scale(0.3, 0.3, 0.3);

  var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot);
  g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);

  pushMatrix(g_modelMatrix);
  g_modelMatrix.translate(0, 0.5, 0.5);
  g_modelMatrix.rotate(135, 0, 0, 1);
  g_modelMatrix.rotate(-25, 1, 1, 0);
  gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
  drawTriangle();

  g_modelMatrix = popMatrix();
  gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
  drawWedge();
}

var g_last = Date.now();

function animate() {
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;

  g_angle01 = g_angle01 + (g_angle01Rate * elapsed) / 1000.0;
  if(g_angle01 > 180.0) g_angle01 = g_angle01 - 360.0;
  if(g_angle01 <-180.0) g_angle01 = g_angle01 + 360.0;

  g_angle02 = g_angle02 + (g_angle02Rate * elapsed) / 1000.0;
  if(g_angle02 > 180.0) g_angle02 = g_angle02 - 360.0;
  if(g_angle02 <-180.0) g_angle02 = g_angle02 + 360.0;
  
  if(g_angle02 > 45.0 && g_angle02Rate > 0) g_angle02Rate *= -1.0;
  if(g_angle02 < 0.0  && g_angle02Rate < 0) g_angle02Rate *= -1.0;
}

