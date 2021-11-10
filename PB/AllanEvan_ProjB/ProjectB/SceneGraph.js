/**
 * Additions to cuon-matrix-quat library
 */

Matrix4.prototype.rotateFromQuat = function(quat) {
  return this.concat(new Matrix4().setFromQuat(quat.x, quat.y, quat.z, quat.w));
};

Quaternion.prototype.rotateFromAxisAngle = function(ax, ay, az, angle) {
  return this.multiplySelf(new Quaternion().setFromAxisAngle(ax, ay, az, angle));
};

Quaternion.prototype.rotateFromEuler = function(a1, a2, a3) {
  return this.multiplySelf(new Quaternion().setFromEuler(a1, a2, a3));
};

Quaternion.prototype.toEulerRad = function() {
  var out = new Vec3(0, 0, 0);

  // roll (z-axis rotation)
  sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
  cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
  out.z = Math.atan2(sinr_cosp, cosr_cosp);

  // pitch (x-axis rotation)
  sinp = 2 * (this.w * this.y - this.z * this.x);
  if (Math.abs(sinp) >= 1)
      out.x = Math.PI / 2 * Math.sign(sinp); // use 90 degrees if out of range
  else
      out.x = Math.asin(sinp);

  // yaw (y-axis rotation)
  siny_cosp = 2 * (this.w * this.z + this.x * this.y);
  cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
  out.y = Math.atan2(siny_cosp, cosy_cosp);
  
  return out;
}

Quaternion.prototype.toEulerDeg = function() {
  var out = this.toEulerRad();
  out.x *= 180 / Math.PI;
  out.y *= 180 / Math.PI;
  out.z *= 180 / Math.PI;
  return out;
}

Quaternion.prototype.setFromEuler = function(alpha, beta, gamma) {
  var quat = new Quaternion();
  quat.rotateFromAxisAngle(1, 0, 0, alpha);
  quat.rotateFromAxisAngle(0, 1, 0, beta);
  quat.rotateFromAxisAngle(0, 0, 1, gamma);

  this.x = quat.x;
  this.y = quat.y;
  this.z = quat.z;
  this.w = quat.w;
  
  return this;
};

function QuatFromAxisAngle(ax, ay, az, angle) {
  var quat = new Quaternion();
  quat.setFromAxisAngle(ax, ay, az, angle);
  return quat;
}

function QuatFromEuler(a1, a2, a3) {
  var quat = new Quaternion();
  quat.setFromEuler(a1, a2, a3);
  return quat;
}

/**
 * Basic 3-tuple
 */
class Vec3 {
  x;
  y;
  z;

  constructor(x, y, z) {
    if (y === undefined && z === undefined) {
      if (x === undefined) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
      } else {
        this.x = x.x;
        this.y = x.y;
        this.z = x.z;
      }
    } else {
      this.x = x;
      this.y = y;
      this.z = z;
    }
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
  
  add(other) {
    return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
  }
  
  subtract(other) {
    return this.add(new Vec3(-other.x, -other.y, -other.z));
  }
  
  normalized() {
    return this.multiply(1 / this.magnitude);
  }
  
  multiply(amount) {
    return new Vec3(this.x * amount, this.y * amount, this.z * amount);
  }
  
  get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
}

// Aliased versions of Vec3 to make code more self-documenting
var Pos = Vec3;
var Scale = Vec3;
var Color = Vec3;

/**
 * A vertex represents all of the things sent in the vertex attribute pointers.
 * May need to be modified in later assignments.
 *
 * TODO: find a way to have arbitrary vertex definitions in the framework, maybe force the user to do it?
 */
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

/**
 * A mesh is a list of verteces which get stored in a vbo.
 * This corresponds to the drawn objects in the scene graph.
 */
class Mesh {
  verts = [];
  renderType;

  // These get filled in after the vbo generation
  vboStart;
  vboCount;
  
  constructor(renderType) {
    this.renderType = renderType;
  }
}

/**
 * The SceneGraphNode combines Group nodes and Transform nodes
 * in the scene graph. Each node has both a transform and a list
 * of children, as well as a reference to a mesh object.
 *
 * You can disable sections of the scene graph by setting enabled
 * to false. This will cause that node and everything under it
 * to be ignored when rendering.
 */
class SceneGraphNode {
  name;
  pos;
  rot;
  scale;

  children = [];
  mesh;
  enabled = true;

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
      this.rot = new Quaternion(0, 0, 0, 1);
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

/**
 * A render program holds information about shaders that
 * are loaded onto the GPU.
 *
 * TODO: Support for multiple render programs
 */
class RenderProgram {
  static vertShader;
  static fragShader;

  attribIds = {};
}

/**
 * Context is just a holder for some global variables
 * relating to rendering.
 */
class Context {
  static canvas;
  static sceneGraph;
  static vboId;
  static renderProgram = new RenderProgram();
  static fps = 30;
  static lastAnimationTick = Date.now();
  static cameras = [];
}

/**
 * The animation class holds information necessary to do animations.
 * The nodes object is a dictionary mapping SceneGraphNode names to the
 * nodes themselves to they can be easily accessed. Users can add additional
 * variables to hold constants they need for animation.
 */
class Animation {
  static nodes = {};
}

class Camera {
  viewport;
  applyProjection;
  pos;
  lookAt;
  up;
  
  constructor() {
    this.viewport = new Viewport();
    this.pos = new Pos(0, 0, 0);
    this.lookDir = new Pos(1, 0, -1);
    this.up = new Pos(0, 0, 1);
  }
  
  translate(x, y, z) {
    if (y !== undefined && z !== undefined) {
      z = x.z;
      y = x.y;
      x = x.x;
    }
    
    this.pos.x += x;
    this.pos.y += y;
    this.pos.z += z;
  }
  
  move(fwdAmt, rightAmt, upAmt) {
    var fwd = this.lookDir.normalized();
    fwd.z = 0;
    
    var right = this.right.normalized();
    right.z = 0;
    
    var up = this.up.normalized();
    up.x = 0;
    up.y = 0;
    
    this.pos = this.pos.add(fwd.multiply(fwdAmt));
    this.pos = this.pos.add(right.multiply(rightAmt));
    this.pos = this.pos.add(up.multiply(upAmt));
  }
  
  rotate(pitch, yaw, roll) {
    var right = this.right;
    var fwd = this.lookDir;

    var pitchRotation = QuatFromAxisAngle(right.x, right.y, right.z, pitch);
    var yawRotation = QuatFromAxisAngle(0, 0, 1, yaw);
    var rollRotation = QuatFromAxisAngle(fwd.x, fwd.y, fwd.z, roll);
    
    yawRotation.multiplyVector3(this.lookDir);
    pitchRotation.multiplyVector3(this.lookDir);
    rollRotation.multiplyVector3(this.lookDir);
  }
  
  get right() {
    var lookDirVector = new Vector3([this.lookDir.x, this.lookDir.y, this.lookDir.z]);
    var upVector = new Vector3([this.up.x, this.up.y, this.up.z]);
    var rightVector = lookDirVector.cross(upVector);
    var right = new Vec3(rightVector.elements[0], rightVector.elements[1], rightVector.elements[2]);
    return right;
  }
}

class Viewport {
  x;
  y;
  width;
  height;
  mode;
  
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.mode = "relative";
  }
}

/**
 * Turns a SceneGraph into a 1-dimensional array that can
 * be sent to the graphics card in a VBO.
 *
 * TODO: if verteces are changed to hold arbitrary stuff then
 *       this needs an overhaul
 */
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

/**
 * Draws a single graph node and its children. First applies transformations,
 * then renders the mesh if there is one, then calls this function recursively
 * on all of the node's children.
 */
function drawNode(modelMatrix, node, scale) {
  // Gotta do all these scaling hacks because scaling and rotation don't play nice
  if (scale === undefined) {
    scale = new Scale(1.0, 1.0, 1.0);
  }

  if (!node.enabled) {
    return modelMatrix;
  }

  pushMatrix(modelMatrix);
  modelMatrix.translate(scale.x * node.pos.x, scale.y * node.pos.y, scale.z * node.pos.z);
  modelMatrix.rotateFromQuat(node.rot);

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

/**
 * Draws the entire scene graph. Roughly equivalent to calling drawNode(new Matrix4(), Context.sceneGraph)
 * after clearing the screen.
 */
function drawAll() {
  // First, fix canvas size if the user resized the window/canvas
  var canvas = Context.canvas;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  var aspect_ratio = canvas.width / canvas.height;
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Now clear and draw
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  for (camera of Context.cameras) {
    var camWidth;
    var camHeight;
    var camX;
    var camY;
    if (camera.viewport.mode == "absolute") {
      camX = camera.viewport.x;
      camY = camera.viewport.y;
      camWidth = camera.viewport.width;
      camHeight = camera.viewport.height;
    } else if (camera.viewport.mode == "relative") {
      camX = camera.viewport.x * canvas.width;
      camY = camera.viewport.y * canvas.height;
      camWidth = camera.viewport.width * canvas.width;
      camHeight = camera.viewport.height * canvas.height;
    } else {
      throw "Invalid viewport mode: " + camera.viewport.mode;
    }
    
    gl.viewport(camX, camY, camWidth, camHeight);
    modelMatrix = new Matrix4();
    if (camera.applyProjection) {
      camera.applyProjection(modelMatrix, camWidth, camHeight);
    }
    
    var lookAt = new Vec3(camera.pos.x + camera.lookDir.x, camera.pos.y + camera.lookDir.y, camera.pos.z + camera.lookDir.z);
    modelMatrix.lookAt(camera.pos.x,    camera.pos.y,    camera.pos.z,
                       lookAt.x,        lookAt.y,        lookAt.z,
                       camera.up.x,     camera.up.y,     camera.up.z);
    drawNode(modelMatrix, Context.sceneGraph);
  }
}

function applyOrthoProjection(modelMatrix, left, right, bottom, top, near, far) {
  modelMatrix.ortho(left, right, bottom, top, near, far);
}

function applyFrustumProjection(modelMatrix, left, right, bottom, top, near, far) {
  modelMatrix.frustum(left, right, bottom, top, near, far);
}

function applyPerspectiveProjection(modelMatrix, fovy, aspect, near, far) {
  modelMatrix.perspective(fovy, aspect, near, far);
}

// Allowing 1 global bc it makes things so much easier and gl is more of a namespace than a variable anyway
var gl;

/**
 * Init the rendering library.
 * The canvas argument must be a canvas element on the webpage.
 */
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
  
  gl.enable(gl.DEPTH_TEST);
  
  return true;
}

/**
 * Utility function to generate a tree with just the names of the SceneGraphNodes
 * so that it's easier to see the hierachy.
 */
function getNameGraph(topNode) {
  var topNameNode = {};
  topNameNode[topNode.name] = getNameGraphHelper(topNode);
  return topNameNode;
}

/**
 * Helper for getNameGraph
 */
function getNameGraphHelper(topNode) {
  var currNode = {};
  
  for (child of topNode.children) {
    currNode[child.name] = getNameGraphHelper(child);
  }
  
  return currNode;
}
