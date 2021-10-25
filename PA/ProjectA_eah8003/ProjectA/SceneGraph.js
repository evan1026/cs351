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

var Pos = Vec3;
var Rot = Vec3;
var Scale = Vec3;
var Color = Vec3;

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
      this.pos = new Pos(0, 0, 0);
    } else {
      this.pos = pos;
    }

    if (rot === undefined || rot === null) {
      this.rot = new Rot(0, 0, 0);
    } else {
      this.rot = rot;
    }

    if (scale === undefined || scale === null) {
      this.scale = new Scale(1, 1, 1);
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
  static vertShader;
  static fragShader;

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

function buildBuffer(graphNode, currBuffer) {
  if (currBuffer === undefined) {
    currBuffer = [];
  }
  
  if (graphNode) {
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
  }

  return currBuffer;
}

function drawNode(modelMatrix, node, scale) {
  // Gotta do all these scaling hacks because scaling and rotation don't play nice
  if (scale === undefined) {
    scale = new Scale(1.0, 1.0, 1.0);
  }

  pushMatrix(modelMatrix);
  modelMatrix.translate(scale.x * node.pos.x, scale.y * node.pos.y, scale.z * node.pos.z);
  modelMatrix.rotate(node.rot.x, 1, 0, 0);
  modelMatrix.rotate(node.rot.y, 0, 1, 0);
  modelMatrix.rotate(node.rot.z, 0, 0, 1);

  scale = new Scale(scale.x * node.scale.x, scale.y * node.scale.y, scale.z * node.scale.z);

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
  // First, fix canvas size if the user resized the window/canvas
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

// Allowing 1 global bc it makes things so much easier and gl is more of a namespace than a variable anyway
var gl;

function init(canvas) {
  Context.canvas = canvas;
  
  gl = getWebGLContext(Context.canvas);
  Vertex.primType = gl.FLOAT;
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false;
  }
  
  if (!initShaders(gl, RenderProgram.vertShader, RenderProgram.fragShader)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  
  gl.depthFunc(gl.GREATER);
  gl.clearDepth(0.0);
  gl.enable(gl.DEPTH_TEST);
  
  return true;
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