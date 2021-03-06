/**
 * Basic 3-tuple
 */
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

// Aliased versions of Vec3 to make code more self-documenting
var Pos = Vec3;
var Rot = Vec3;
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
  modelMatrix = new Matrix4();
  drawNode(modelMatrix, Context.sceneGraph);
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
  
  gl.depthFunc(gl.GREATER);
  gl.clearDepth(0.0);
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