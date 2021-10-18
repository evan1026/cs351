var VSHADER_SOURCE = `
  uniform mat4 u_ModelMatrix;
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_Color;
  void main() {
    gl_Position = u_ModelMatrix * a_Position;
    gl_PointSize = 10.0;
    v_Color = a_Color;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec4 v_Color;
  void main() {
    gl_FragColor = v_Color;
  }`;

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
}

class Mesh {
  verts = [];

  // These get filled in after the vbo generation
  vboId;
  vboStart;
  vboEnd;
  vboStride;
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

class Context {
  static gl;
  static canvas;
  static SceneGraph;
}

function main() {
  Context.canvas = document.getElementById('webgl');
  Context.gl = getWebGLContext(canvas);
  if (!Context.gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(Context.gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  initSceneGraph();

  g_maxVerts = initVertexBuffer(gl);
  if (g_maxVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  gl.clearColor(0.3, 0.3, 0.3, 1.0);

  gl.depthFunc(gl.GREATER);
  gl.clearDepth(0.0);
  gl.enable(gl.DEPTH_TEST);

  g_modelMatLoc = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!g_modelMatLoc) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
}

function initSceneGraph() {
  tetraMesh = new Mesh();
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

  squareMesh = new Mesh();
  squareMesh.verts = [
    new Vertex({.pos = new Vec3(-0.5, -0.5, 0.0), .color = new Vec3(1.0, 0.0, 0.0)}),
    new Vertex({.pos = new Vec3(-0.5,  0.5, 0.0), .color = new Vec3(0.0, 1.0, 0.0)}),
    new Vertex({.pos = new Vec3( 0.5,  0.5, 0.0), .color = new Vec3(0.0, 0.0, 1.0)}),
    new Vertex({.pos = new Vec3( 0.5, -0.5, 0.0), .color = new Vec3(1.0, 1.0, 1.0)})
  ];

  triangleMesh = new Mesh();
  triangleMesh.verts = [
    new Vertex({.pos = new Vec3(-0.5, -0.5, 0.0), .color = new Vec3(0.0, 1.0, 1.0)}),
    new Vertex({.pos = new Vec3(-0.5,  0.5, 0.0), .color = new Vec3(1.0, 0.0, 1.0)}),
    new Vertex({.pos = new Vec3( 0.5,  0.5, 0.0), .color = new Vec3(1.0, 1.0, 0.0)}),
  ];
}

function initVertexBuffer() {
  var colorShapes = new Float32Array([

  ]);

  // Create a buffer object
  var shapeBufferHandle = gl.createBuffer();
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT;

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  gl.vertexAttribPointer(
      a_Position, // VBO
      FSIZE,      // Primitives per entry
      gl.FLOAT,   // Data type
      false,      // Normalize
      FSIZE * 7,  // Stride
      0);         // Offset
  gl.enableVertexAttribArray(a_Position);

  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }

  gl.vertexAttribPointer(
    a_Color,    // VBO
    3,          // Primitives per entry
    gl.FLOAT,   // Data type
    false,      // Normalize
    FSIZE * 7,  // Stride
    FSIZE * 4); // Offset
  gl.enableVertexAttribArray(a_Color);  

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

}

function drawTetra() {
  gl.drawArrays(gl.TRIANGLES, 0, 12);
}

function drawWedge() {
  gl.drawArrays(gl.TRIANGLES, 6,6);
}

function drawSquare() {
  gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
}

function drawTriangle() {
  gl.drawArrays(gl.TRIANGLES, 16, 3);
}

function drawAll() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  clrColr = new Float32Array(4);
  clrColr = gl.getParameter(gl.COLOR_CLEAR_VALUE);

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

