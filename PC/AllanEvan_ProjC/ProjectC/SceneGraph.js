/*****************************************
 * Additions to cuon-matrix-quat library *
 *****************************************/

/**
 * Creates a rotation matrix from the quaternion and then
 * concatenates it with the given matrix.
 */
Matrix4.prototype.rotateFromQuat = function(quat) {
  quat.normalize();
  return this.concat(new Matrix4().setFromQuat(quat.x, quat.y, quat.z, quat.w));
};

/**
 * Rotates a quaternion by a given angle around an axis.
 */
Quaternion.prototype.rotateFromAxisAngle = function(ax, ay, az, angle) {
  return this.multiplySelf(new Quaternion().setFromAxisAngle(ax, ay, az, angle));
};

/**
 * Uses pitch, yaw, and roll to rotate a quaternion.
 */
Quaternion.prototype.rotateFromEuler = function(pitch, yaw, roll) {
  return this.multiplySelf(new Quaternion().setFromEuler(pitch, yaw, roll));
};

/**
 * Calculates pitch, yaw, and roll in radians from a quaternion.
 */
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

/**
 * Calculates pitch, yaw, and roll in degrees from a quaternion.
 */
Quaternion.prototype.toEulerDeg = function() {
  var out = this.toEulerRad();
  out.x *= 180 / Math.PI;
  out.y *= 180 / Math.PI;
  out.z *= 180 / Math.PI;
  return out;
}

/**
 * Sets a quaternion's rotate from pitch, yaw, and roll.
 */
Quaternion.prototype.setFromEuler = function(pitch, yaw, roll) {
  var quat = new Quaternion();
  quat.rotateFromAxisAngle(1, 0, 0, pitch);
  quat.rotateFromAxisAngle(0, 1, 0, yaw);
  quat.rotateFromAxisAngle(0, 0, 1, roll);

  this.x = quat.x;
  this.y = quat.y;
  this.z = quat.z;
  this.w = quat.w;

  return this;
};

/**
 * Constructs a new quaternion from a given axis and angle.
 */
function QuatFromAxisAngle(ax, ay, az, angle) {
  var quat = new Quaternion();
  quat.setFromAxisAngle(ax, ay, az, angle);
  return quat;
}

/**
 * Constructs a new quaternion from pitch, yaw, and roll.
 */
function QuatFromEuler(pitch, yaw, roll) {
  var quat = new Quaternion();
  quat.setFromEuler(pitch, yaw, roll);
  return quat;
}

/**************
 * Other Code *
 **************/

/**
 * Basic 3-tuple
 */
class Vec3 {
  x;
  y;
  z;

  /**
   * Can either pass another vector; values for x, y, and z; or nothing.
   */
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

  /**
   * Create alias r for colors
   */
  get r() {
    return this.x;
  }

  /**
   * Create alias g for colors
   */
  get g() {
    return this.y;
  }

  /**
   * Create alias b for colors
   */
  get b() {
    return this.z;
  }

  /**
   * Adds two vectors together and returns a new vector with the result
   */
  add(other) {
    return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  /**
   * Subtracts two vectors from eachother and returns a new vector with the result
   */
  subtract(other) {
    return this.add(new Vec3(-other.x, -other.y, -other.z));
  }

  /**
   * Returns a new vector pointing in the same direction as this one but with a magnitude of 1
   */
  normalized() {
    return this.multiply(1 / this.magnitude);
  }

  /**
   * Scales this vector by a given amount
   */
  multiply(amount) {
    return new Vec3(this.x * amount, this.y * amount, this.z * amount);
  }

  /**
   * Gets the magnitude of the vector
   */
  get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  cross(vector) {
    return new Vec3(this.y * vector.z - this.z * vector.y,
                    this.z * vector.x - this.x * vector.z,
                    this.x * vector.y - this.y * vector.x);
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
  normal;

  constructor(pos, color, normal) {
    this.pos = pos;
    this.color = color;

    if (normal) {
      this.normal = normal;
    } else {
      this.normal = new Pos(1, 0, 0);
    }
  }
  
  copy() {
    return new Vertex(new Pos(this.pos), new Color(this.color), new Vec3(this.normal));
  }

  static primsPerVertex = 10;
  static primsPerPos = 4;
  static primsPerColor = 3;
  static primsPerNormal = 3;
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
  name = "";
  verts = [];
  renderType;

  // These get filled in after the vbo generation
  vboStart;
  vboCount;

  constructor(renderType, name) {
    this.renderType = renderType;
    this.name = name;
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
  parent;

  constructor(name, parent, pos, rot, scale, mesh) {
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
    if (name === undefined || name === null) {
      throw 'Name for a SceneGraphNode is required!'
    }
    this.name = name;
    if (Animation.nodes[name] !== undefined && Animation.nodes[name] !== null) {
      throw 'Duplicate SceneGraphNode name: ' + name;
    }
    Animation.nodes[name] = this;

    if (pos === undefined || pos === null) {
      this.pos = new Pos();
    } else {
      this.pos = pos;
    }

    if (rot === undefined || rot === null) {
      this.rot = new Quaternion();
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
 * TODO: Retrieve attributes automatically -- done
 *          - Also correlate with Vertex object
 *          - Maybe use it to build the vertex object? But then can I guarantee the order of attributes?
 */
class RenderProgram {
  vertShader;
  fragShader;
  
  modelMatrixAttrib;
  normalMatrixAttrib;
  projectionMatrixAttrib;

  attribIds = {};
  
  constructor(vertShader, fragShader) {
    this.vertShader = vertShader;
    this.fragShader = fragShader;
    
    var program = createProgram(gl, vertShader, fragShader);
    if (!program) {
      throw 'Failed to create render program';
    }

    gl.useProgram(program);
    
    var numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < numAttribs; ++i) {
      var attribInfo = gl.getActiveAttrib(program, i);
      var index = gl.getAttribLocation(program, attribInfo.name);
      this.attribIds[attribInfo.name] = index;
    }
    
    var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < numUniforms; ++i) {
      var attribInfo = gl.getActiveUniform(program, i);
      var index = gl.getUniformLocation(program, attribInfo.name);
      this.attribIds[attribInfo.name] = index;
    }
  }
  
  /**
   * Utility function to ensure that all of the expected attributes were found
   */
  verifyAttribs(attribList) {
    for (var attrib of attribList) {
      if (this.attribIds[attrib] === undefined) {
        throw 'Could not find location of ' + attrib;
      }
    }
  }
}

/**
 * Context is just a holder for some global variables
 * relating to rendering.
 */
class Context {
  static canvas;
  static sceneGraph;
  static vboId;  // TODO should I support multiple VBOs? Maybe each mesh keeps track of which one it is in/should be in?
  static renderProgram;
  static fps = 30;
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
  static lastTick = Date.now();
}

/**
 * Data related to a camera
 */
class Camera {
  viewport;
  applyProjection; // This is a function which takes in a matrix and applies the projection to it
  pos;
  lookDir;
  up;

  constructor() {
    this.viewport = new Viewport();
    this.pos = new Pos();
    this.lookDir = new Pos(1, 0, 0);
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

  move(fwdAmt, rightAmt, upAmt, lockForward, lockRight, lockUp) {
    if (lockForward === undefined) {
      lockForward = true;
    }
    if (lockRight === undefined) {
      lockRight = true;
    }
    if (lockUp === undefined) {
      lockUp = true;
    }

    var fwd = new Vec3(this.lookDir);
    if (lockForward) {
      fwd.z = 0;
    }
    fwd = fwd.normalized();

    var right = new Vec3(this.right);
    if (lockRight) {
      right.z = 0;
    }
    right = right.normalized();

    var up = new Vec3(this.up);
    if (lockUp) {
      up.x = 0;
      up.y = 0;
    }
    up = up.normalized();

    this.pos = this.pos.add(fwd.multiply(fwdAmt));
    this.pos = this.pos.add(right.multiply(rightAmt));
    this.pos = this.pos.add(up.multiply(upAmt));
  }

  rotate(pitch, yaw, roll, constrainPitch) {
    if (constrainPitch === undefined) {
      constrainPitch = true;
    }

    var right = this.right;
    var fwd = this.lookDir;

    var pitchRotation = QuatFromAxisAngle(right.x, right.y, right.z, pitch);
    var yawRotation = QuatFromAxisAngle(0, 0, 1, yaw); // TODO if we're in a free cam/plane mode, this might work better around the up vector?
    var rollRotation = QuatFromAxisAngle(fwd.x, fwd.y, fwd.z, roll);

    var prevLookDir = new Pos(this.lookDir);
    var prevUp = new Pos(this.up);

    pitchRotation.multiplyVector3(this.lookDir);
    pitchRotation.multiplyVector3(this.up);

    if (constrainPitch && this.up.z < 0) {
      this.lookDir = prevLookDir;
      this.up = prevUp;
    }

    yawRotation.multiplyVector3(this.lookDir);
    yawRotation.multiplyVector3(this.up);

    rollRotation.multiplyVector3(this.lookDir);
    rollRotation.multiplyVector3(this.up);

    this.fixVectors();

  }

  get right() {
    return this.lookDir.cross(this.up);
  }

  /**
   * Floating point errors can make it so lookDir and up aren't at right angles, which would lead to
   * weirdness if it accumulates enough. This recalculates them by first using the cross product to
   * find the right vector, and then crossing that with the forward vector to get the new up vector.
   * If this is done frequently, it won't make big enough changes for the user to notice, but it
   * will ensure the vectors are always at right angles.
   */
  fixVectors() {
    this.up = this.right.cross(this.lookDir);
  }
}

/**
 * A viewport is a rectangle on the screen that gets drawn into in some way. Each
 * camera has a viewport. In most cases, the default constructor will be
 * sufficient (this is a viewport that takes up the whole screen). For other cases,
 * x, y, width, height, and mode can be set. x and y choose the screen space
 * coordinates of the top left corner of the viewport. Width and height are
 * the width and height of the viewport. Mode determines how these values are
 * interpreted. If mode == "relative", then x, y, width, and height are considered
 * to be values from 0 to 1 representing the percentage of the total screen size in
 * that direction. If mode == "absolute", then they are considered to be exact pixel
 * values.
 */
class Viewport {
  x;
  y;
  width;
  height;
  mode;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 1;
    this.height = 1;
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
    if (graphNode.mesh && graphNode.mesh.vboStart === undefined) {
      graphNode.mesh.vboStart = currBuffer.length / Vertex.primsPerVertex;
      for (vertex of graphNode.mesh.verts) {
        if (vertex.color === undefined) {
          console.log(vertex);
        }
        currBuffer.push(vertex.pos.x, vertex.pos.y, vertex.pos.z, 1.0, vertex.color.r, vertex.color.g, vertex.color.b, vertex.normal.x, vertex.normal.y, vertex.normal.z);
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
    if (Context.renderProgram.modelMatrixAttrib) {
      modelMatrix.scale(scale.x, scale.y, scale.z);
      gl.uniformMatrix4fv(Context.renderProgram.attribIds[Context.renderProgram.modelMatrixAttrib], false, modelMatrix.elements);
    }

    if (Context.renderProgram.normalMatrixAttrib) {
      var normalMatrix = new Matrix4(modelMatrix);
      normalMatrix.invert().transpose();
      gl.uniformMatrix4fv(Context.renderProgram.attribIds[Context.renderProgram.normalMatrixAttrib], false, normalMatrix.elements);
    }

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
    projectionMatrix = new Matrix4();
    if (camera.applyProjection) {
      camera.applyProjection(projectionMatrix, camWidth, camHeight);
    }

    var lookAt = camera.pos.add(camera.lookDir);
    projectionMatrix.lookAt(camera.pos.x,    camera.pos.y,    camera.pos.z,
                            lookAt.x,        lookAt.y,        lookAt.z,
                            camera.up.x,     camera.up.y,     camera.up.z);

    if (Context.renderProgram.projectionMatrixAttrib) {
      gl.uniformMatrix4fv(Context.renderProgram.attribIds[Context.renderProgram.projectionMatrixAttrib], false, projectionMatrix.elements);
    }

    drawNode(modelMatrix, Context.sceneGraph);
  }
}

/**
 * An applyProjection candidate (see the Camera class) which applies an orthographic projection
 */
function applyOrthoProjection(modelMatrix, left, right, bottom, top, near, far) {
  modelMatrix.ortho(left, right, bottom, top, near, far);
}

/**
 * An applyProjection candidate (see the Camera class) which applies an perspective projection given frustum values
 */
function applyFrustumProjection(modelMatrix, left, right, bottom, top, near, far) {
  modelMatrix.frustum(left, right, bottom, top, near, far);
}

/**
 * An applyProjection candidate (see the Camera class) which applies an perspective projection given fov and aspect ratio
 */
function applyPerspectiveProjection(modelMatrix, fovy, aspect, near, far) {
  modelMatrix.perspective(fovy, aspect, near, far);
}

// Allowing 1 global bc it makes things so much easier and gl is more of a namespace than a variable anyway
var gl;

/**
 * Init the rendering library.
 * The canvas argument must be a canvas element on the webpage.
 */
function init(canvas, debugMode, vertShader, fragShader) {
  Context.canvas = canvas;

  gl = getWebGLContext(Context.canvas, debugMode);
  Vertex.primType = gl.FLOAT;
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false;
  }

  if (vertShader && fragShader) {
    Context.renderProgram = new RenderProgram(vertShader, fragShader);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

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

/**
 * Calculates the transformation matrix that transforms from model coords to world coords for a given node
 * TODO or is it the other way? gotta think
 */
function getTransform(targetNode) {
  var nodePath = getNodePath(targetNode);

  var currNode = Context.sceneGraph;
  var modelMatrix = new Matrix4();
  var scale = new Scale(1.0, 1.0, 1.0);
  for (index of nodePath) {
    var node = currNode.children[index];
    modelMatrix.translate(scale.x * node.pos.x, scale.y * node.pos.y, scale.z * node.pos.z);
    modelMatrix.rotateFromQuat(node.rot);
    scale = new Scale(scale.x * node.scale.x, scale.y * node.scale.y, scale.z * node.scale.z);

    currNode = node;
  }
  modelMatrix.scale(scale.x, scale.y, scale.z);
  return modelMatrix;
}

/**
 * Finds the path from the root node to the given node
 */
function getNodePath(targetNode) {
  var currNode = targetNode;
  var path = [];
  while(currNode.parent) {
    var parent = currNode.parent;
    var index = parent.children.indexOf(currNode);
    path.unshift(index);
    currNode = parent;
  }
  return path;
}

/**
 * Moves the camera to the location of a node.
 *
 * extraMove - An object with values {fwd, right, up} that describes how to move after the camera has been moved to
 *             the object's origin, rotated to the object's orientation, and then rotated by the amount specified
 *             by extraRot
 * extraRot - An objet with values {pitch, yaw, roll} that describes how much to rotate the camera by after it has
 *            been moved to the object's origin and rotated to the object's orientation
 */
function attachCameraToNode(camera, node, extraMove, extraRot) {
  var l7Transform = getTransform(node);

  var pos = new Vector4([0, 0, 0, 1]);
  var lookAt = new Vector4([1, 0, 0, 1]);
  var upPos = new Vector4([0, 0, 1, 1]);

  if (extraRot) {
    var quat = QuatFromEuler(extraRot.pitch, extraRot.roll, extraRot.yaw);
    l7Transform.rotateFromQuat(quat);
  }

  pos = l7Transform.multiplyVector4(pos);
  lookAt = l7Transform.multiplyVector4(lookAt);
  upPos = l7Transform.multiplyVector4(upPos);

  pos = new Pos(pos.elements[0], pos.elements[1], pos.elements[2]);
  lookAt = new Pos(lookAt.elements[0], lookAt.elements[1], lookAt.elements[2]);
  upPos = new Pos(upPos.elements[0], upPos.elements[1], upPos.elements[2]);

  var lookDir = lookAt.subtract(pos);
  var up = upPos.subtract(pos);

  camera.pos = pos;
  camera.lookDir = lookDir;
  camera.up = up;

  if (extraMove) {
    camera.move(extraMove.fwd, extraMove.right, extraMove.up, false, false, false);
  }

}

/**
 * Calculates a dot graph for the scene graph and returns the code for it as a string
 */
function getSceneGraphDotString(topNode) {
  var dotString = "digraph G {\n    graph [pad=\"0.5\", nodesep=\"1\", ranksep=\"5\"];\n";
  var output = getSceneGraphDotStringSubGraph(topNode, 0, 1);
  dotString += output.dotString;
  dotString += getSceneGraphDotStringMeshes(topNode);
  dotString += "}\n";

  return dotString;
}

/**
 * Helper function for getSceneGraphDotString which can recursively handle nodes
 */
function getSceneGraphDotStringSubGraph(topNode, clusterCount, indent) {
  var dotString = "";
  var thisNodeTransform = topNode.name.replace("-", "_") + "Transform";
  if (topNode.children.length > 0) {
    var thisNodeGroup = topNode.name.replace("-", "_") + "Group";
    dotString += "    ".repeat(indent) + thisNodeTransform + " -> " + thisNodeGroup + " [color=darkgreen];\n";
    dotString += "    ".repeat(indent) + thisNodeGroup + " [label=\"'" + topNode.name.replace("-", "_") + "' Group\", style=filled, fillcolor=darkgreen];\n";
    dotString += "    ".repeat(indent) + "subgraph cluster_" + clusterCount++ + " {\n";
    dotString += "    ".repeat(indent + 1) + "style=invis;\n";
    for (child of topNode.children) {
      var output = getSceneGraphDotStringSubGraph(child, clusterCount, indent + 1);
      dotString += output.dotString;
      clusterCount = output.clusterCount;
    }
    for (child of topNode.children) {
      dotString += "    ".repeat(indent) + thisNodeGroup + " -> " + child.name.replace("-", "_") + "Transform" + " [color=darkgoldenrod4];\n";
    }
    dotString += "    ".repeat(indent) + "}\n";

  }
  dotString += "    ".repeat(indent) + thisNodeTransform + " [label=\"'" + topNode.name.replace("-", "_") + "' Transform\", fillcolor=darkgoldenrod4, shape=invtrapezium, style=filled];\n"
  return {dotString: dotString, clusterCount: clusterCount};
}

/**
 * Helper function for getSceneGraphDotString which outputs mesh nodes in the dot graph
 */
function getSceneGraphDotStringMeshes(topNode, coveredMeshes) {
  var dotString = "";

  if (coveredMeshes === undefined) {
    coveredMeshes = new Set();
  }

  if (topNode.mesh) {
    coveredMeshes.add(topNode.mesh);
    dotString += "    " + topNode.name.replace("-", "_") + "Transform" + " -> " + topNode.mesh.name.replace("-", "_") + "Mesh [color=firebrick4];\n";
  }

  for (child of topNode.children) {
    dotString += getSceneGraphDotStringMeshes(child, coveredMeshes);
  }

  if (topNode.parent === undefined) {
    for (mesh of coveredMeshes) {
      dotString += "    " + mesh.name.replace("-", "_") + "Mesh [fillcolor=firebrick4, shape=trapezium, style=filled];\n";
    }
  }

  return dotString;
}
