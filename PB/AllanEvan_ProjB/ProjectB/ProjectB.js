RenderProgram.vertShader = `
    uniform mat4 u_ModelMatrix;
    uniform vec4 u_ColorOverride;
    attribute vec4 a_Position;
    attribute vec3 a_Color;
    varying vec4 v_Color;
    void main() {
      gl_Position = u_ModelMatrix * a_Position;
      gl_PointSize = 10.0;

      vec4 a_Color4 = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);
      v_Color = mix(u_ColorOverride, a_Color4, 1.0 - u_ColorOverride.a);
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

/**
 * Entry point with basic setup.
 */
function main() {
  var canvas = document.getElementById('webgl');

  if (!init(canvas)) {
    return;
  }

  initSceneGraph();
  initCameras();

  var maxVerts = initVertexBuffer(gl);
  if (maxVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  gl.clearColor(0.3, 0.3, 0.3, 1.0);

  window.addEventListener("mousedown", myMouseDown);
  window.addEventListener("mousemove", myMouseMove);
  window.addEventListener("mouseup", myMouseUp);
  window.addEventListener("keydown", myKeyDown, false);
  window.addEventListener("keyup", myKeyUp, false);

  Animation.armTime = Date.now();
  Animation.boxTime = Date.now();
  Event.mouseDrag.x = 0.0;
  Event.mouseDrag.y = -1.0;

  tick();
}

/**
 * Changes everything that needs to change each frame.
 */
function animate() {
  var time = Date.now();
  var elapsed = time - Context.lastAnimationTick;

  translateCamera(elapsed);
  rotateCamera(elapsed);

  var r = document.getElementById("r").value / 255;
  var g = document.getElementById("g").value / 255;
  var b = document.getElementById("b").value / 255;
  var a = document.getElementById("a").value / 255;
  gl.uniform4f(Context.renderProgram.attribIds['u_ColorOverride'], r, g, b, a);

  animateArm(time);
  animateBoxes(time);
  animateProp(time);
  
  var buildingsShown = document.getElementById("buildingsShown").checked;
  Animation.nodes["buildings"].enabled = buildingsShown;
  
  if (document.getElementById("perspectiveOnArm").checked) {
    attachCameraToNode(Context.cameras[0], Animation.nodes['l7']);
  } else if (document.getElementById("perspectiveOnPlane").checked) {
    attachCameraToNode(Context.cameras[0], Animation.nodes['plane'], {fwd: 0.4, right: 0, up: 0.1}, {pitch:0, yaw: -90, roll:0});
  } else {
    Context.cameras[0].pos = new Pos(Context.cameras[1].pos);
    Context.cameras[0].lookDir = new Pos(Context.cameras[1].lookDir);
    Context.cameras[0].up = new Pos(Context.cameras[1].up);
  }

  updateFramerate(elapsed);

  Context.lastAnimationTick = time;
}

/**
 * Animates the waving arm.
 */
function animateArm(time) {
  var armShown = document.getElementById("armShown").checked;
  var armAnimate = document.getElementById("armAnimation").checked;

  Animation.nodes["l1"].enabled = armShown;

  if (armAnimate) {
    Animation.armTime += (time - Context.lastAnimationTick);
  }
  armTime = Animation.armTime;

  var waveAmount = document.getElementById("armWaveAmount").value;
  Animation.nodes['l2'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 500), 0.0);
  Animation.nodes['l3'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 500), 0.0);
  Animation.nodes['l4'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 500), 0.0);
  Animation.nodes['l5'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 500), 0.0);
  Animation.nodes['l6'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 500), 0.0);
  Animation.nodes['l7'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 500), 0.0);
}

/**
 * Animates the pointed box objects.
 */
function animateBoxes(time) {
  var boxShown = document.getElementById("boxShown").checked;
  var boxAnimate = document.getElementById("boxAnimation").checked;

  Animation.nodes["house"].enabled = boxShown;

  Animation.boxStep = 0;
  if (boxAnimate) {
    Animation.boxTime += (time - Context.lastAnimationTick);
    Animation.boxStep = time - Context.lastAnimationTick;
  }

  boxTime = Animation.boxTime;
  boxStep = Animation.boxStep;

  Animation.nodes["house"].pos = new Pos(-2.0 + 0.5 * Math.cos(boxTime / 500), -2.0 + 0.5 * Math.sin(boxTime / 500), 0.0);
  Animation.nodes["house"].rot = QuatFromEuler(90 * Math.sin(boxTime / 500), 90 * Math.cos(boxTime / 500), 90 * -Math.sin(boxTime / 500))
  var house2Rot = Animation.nodes["house2"].rot;
  house2Rot.rotateFromAxisAngle(0, 1, 0, (boxStep / 2) % 360);
  var house3Rot = Animation.nodes["house3"].rot;
  house3Rot.rotateFromAxisAngle(0, 1, 0, (boxStep / 4) % 360);
  var house4Rot = Animation.nodes["house4"].rot;
  house4Rot.rotateFromAxisAngle(0, 1, 0, (boxStep / 6) % 360);
  var house5Rot = Animation.nodes["house5"].rot;
  house5Rot.rotateFromAxisAngle(0, 1, 0, (boxStep / 8) % 360);
}

/**
 * Animates the propeller on the heli.
 */
function animateProp(time) {
  var propShown = document.getElementById("propShown").checked;
  var propAnimate = document.getElementById("propAnimation").checked;
  
  var planeThrottle = document.getElementById("planeThrottle").value / 100;
  var planePitch = document.getElementById("planePitch").value / -10;
  var planeYaw = document.getElementById("planeYaw").value / -10;
  var planeRoll = document.getElementById("planeRoll").value / -10;

  var planeNode = Animation.nodes["plane"];
  planeNode.enabled = propShown;

  if (propAnimate) {
    var planeForward = new Vec3(0, -1, 0);
    planeForward = planeForward.multiply(planeThrottle);
    
    planeNode.rot.rotateFromEuler(planePitch, planeRoll, planeYaw);
    planeNode.rot.multiplyVector3(planeForward);
    planeNode.pos = planeNode.pos.add(planeForward);
  }
}

/**
 * Updates the framerate display.
 */
function updateFramerate(elapsed) {
  if (!Context.framerateAverage) {
    Context.framerateAverage = 0;
  }
  Context.framerateAverage = Context.framerateAverage * 0.9 + 0.1 / (elapsed / 1000);
  document.getElementById("framerate").innerHTML = Context.framerateAverage.toPrecision(3) + " fps";
}

/**
 * Moves the camera based on user input.
 */
function translateCamera(elapsed) {
  speed = 0.05 * elapsed / 15;
  
  var lockForward = document.getElementById("lockForward").checked;
  
  if (Animation.moveFwd) {
    Context.cameras[1].move(speed, 0, 0, lockForward);
  } else if (Animation.moveBack) {
    Context.cameras[1].move(-speed, 0, 0, lockForward);
  }

  if (Animation.moveLeft) {
    Context.cameras[1].move(0, -speed, 0);
  } else if (Animation.moveRight) {
    Context.cameras[1].move(0, speed, 0);
  }

  if (Animation.moveUp) {
    Context.cameras[1].move(0, 0, speed);
  } else if (Animation.moveDown) {
    Context.cameras[1].move(0, 0, -speed);
  }
}

/**
 * Rotates the camera based on user input.
 */
function rotateCamera(elapsed) {
  degPerTick = elapsed / 15;

  if (Animation.lookUp) {
    Context.cameras[1].rotate(degPerTick / 2, 0, 0);
  } else if (Animation.lookDown) {
    Context.cameras[1].rotate(-degPerTick / 2, 0, 0);
  }

  if (Animation.lookLeft) {
    Context.cameras[1].rotate(0, degPerTick, 0);
  } else if (Animation.lookRight) {
    Context.cameras[1].rotate(0, -degPerTick, 0);
  }
}

/**
 * Called once per frame.
 */
function tick() {
  animate();
  drawAll();
  window.requestAnimationFrame(tick, Context.canvas);
}

/**
 * Creates the full scene graph.
 */
function initSceneGraph() {
  var numCircleParts = 100;
  var circleMesh = initCircleMesh(numCircleParts);
  var cyllinderMesh = initCyllinderSideMesh(numCircleParts);
  var houseMesh = initHouseMesh();
  var gridMesh = initGridMesh(-20, 20, -20, 20, 200);
  var axesMesh = initAxesMesh();
  var planeMesh = initPlaneMesh();
  var blackBoxMesh = initBlackBoxMesh();
  
  var buildingMeshes = [initBuildingMesh(3), initBuildingMesh(4), initBuildingMesh(5), initBuildingMesh(6), initBuildingMesh(7), initBuildingMesh(8)];

  var makeCyllinder = function(name, parent, height, pos, rot, scale) {
    cylNode =       new SceneGraphNode(name,             parent,  pos,                       rot,              scale,                       null);
    cylTopNode =    new SceneGraphNode(name + "_Top",    cylNode, new Pos(),                 new Quaternion(), new Scale(1.0, 1.0, 1.0),    circleMesh);
    cylBotNode =    new SceneGraphNode(name + "_Bot",    cylNode, new Pos(0.0, 0.0, height), new Quaternion(), new Scale(0.5, 0.5, 1.0),    circleMesh);
    cylMiddleNode = new SceneGraphNode(name + "_Middle", cylNode, new Pos(),                 new Quaternion(), new Scale(1.0, 1.0, height), cyllinderMesh);
    return cylNode;
  };

  var topNode = new SceneGraph("CVV");
  var l1Node = makeCyllinder("l1", topNode, 4,      new Pos(3.0, -2.0, 0.0),  QuatFromEuler(90, 180, 0), new Scale(0.1, 0.1, 0.1));
  var l2Node = makeCyllinder("l2", l1Node,  2,      new Pos(0.0, 0.0, 4.0),   new Quaternion(),          new Scale(0.5, 0.5, 1.0));
  var l3Node = makeCyllinder("l3", l2Node,  1,      new Pos(0.0, 0.0, 2.0),   new Quaternion(),          new Scale(0.5, 0.5, 1.0));
  var l4Node = makeCyllinder("l4", l3Node,  0.5,    new Pos(0.0, 0.0, 1.0),   new Quaternion(),          new Scale(0.5, 0.5, 1.0));
  var l5Node = makeCyllinder("l5", l4Node,  0.25,   new Pos(0.0, 0.0, 0.5),   new Quaternion(),          new Scale(0.5, 0.5, 1.0));
  var l6Node = makeCyllinder("l6", l5Node,  0.125,  new Pos(0.0, 0.0, 0.25),  new Quaternion(),          new Scale(0.5, 0.5, 1.0));
  var l7Node = makeCyllinder("l7", l6Node,  0.0625, new Pos(0.0, 0.0, 0.125), new Quaternion(),          new Scale(0.5, 0.5, 1.0));

  var houseNode  = new SceneGraphNode("house",  topNode,   new Pos(0.5, 0.5, 0.0),   new Quaternion(),         new Scale(0.15, 0.15, 0.15), houseMesh);
  var houseNode2 = new SceneGraphNode("house2", houseNode, new Pos(0.0, 1.5, 0.0),   QuatFromEuler(180, 0, 0), new Scale(1.0, 1.0, 1.0),    houseMesh);
  var houseNode3 = new SceneGraphNode("house3", houseNode, new Pos(0.0, 0.0, 1.25),  QuatFromEuler(270, 0, 0), new Scale(1.0, 1.0, 1.0),    houseMesh);
  var houseNode4 = new SceneGraphNode("house4", houseNode, new Pos(0.0, 0.0, -1.25), QuatFromEuler(90, 0, 0),  new Scale(1.0, 1.0, 1.0),    houseMesh);
  var houseNode5 = new SceneGraphNode("house5", houseNode, new Pos(0.0, -1.25, 0.0), new Quaternion(),         new Scale(1.0, 1.0, 1.0),    houseMesh);

  var gridNode = new SceneGraphNode("grid", topNode, new Pos(), new Quaternion(), new Scale(1.0, 1.0, 1.0), gridMesh);

  var axesNode       = new SceneGraphNode("axes",       topNode,   new Pos(),          new Quaternion(), new Scale(1.0, 1.0, 1.0), axesMesh);
  var armAxesNode    = new SceneGraphNode("armAxes",    l1Node,    new Pos(-1, -1, 0), new Quaternion(), new Scale(3.0, 3.0, 3.0), axesMesh);
  var armTipAxesNode = new SceneGraphNode("armTipAxes", l7Node,    new Pos(),          new Quaternion(), new Scale(32.0, 32.0, 0.5), axesMesh);
  var housesAxesNode = new SceneGraphNode("housesAxes", houseNode, new Pos(),          new Quaternion(), new Scale(3.0, 3.0, 3.0), axesMesh);

  var planeNode = new SceneGraphNode("plane", topNode, new Pos(3.0, 3.0, 1.0), new Quaternion(), new Scale(1.0, 1.0, 1.0), planeMesh);
  
  var buildingsNode = new SceneGraphNode("buildings", topNode, new Pos(), new Quaternion(), new Scale(1.0, 1.0, 1.0));
  for (var x = -3; x < 0; ++x) {
    for (var y = 0; y < 3; ++y) {
      buildingNode = new SceneGraphNode("building" + x + "_" + y, buildingsNode, new Pos(x, y, 0), QuatFromEuler(0, 0, Math.floor(Math.random() * 4) * 90), new Scale(0.25, 0.25, 0.25), buildingMeshes[Math.floor(Math.random() * buildingMeshes.length)]);
    }
  }

  Context.sceneGraph = topNode;
  console.log("Full Graph: ",topNode);
  console.log("Name Graph: ", getNameGraph(topNode));
  console.log("Dot string: ", getSceneGraphDotString(topNode));
}

/**
 * Creates a mesh for a circle. Used for the top and bottom of arm parts.
 */
function initCircleMesh(numCircleParts) {
  var circleMesh = new Mesh(gl.TRIANGLE_FAN, "Circle");
  circleMesh.verts = [new Vertex(new Pos(), new Color(1.0, 1.0, 1.0))];
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos = new Pos(Math.cos(rads), Math.sin(rads), 0.0);
    color = new Color(rgb.r, rgb.g, rgb.b);
    circleMesh.verts.push(new Vertex(pos, color));
  }

  return circleMesh;
}

/**
 * Creates a mesh for the side of a cyllinder. Used for the sides of arm parts.
 */
function initCyllinderSideMesh(numCircleParts) {
  var cyllinderMesh = new Mesh(gl.TRIANGLE_STRIP, "CyllinderSide");
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos1 = new Pos(Math.cos(rads), Math.sin(rads), 0.0);
    pos2 = new Pos(0.5 * Math.cos(rads), 0.5 * Math.sin(rads), 1.0);
    color = new Color(rgb.r, rgb.g, rgb.b);
    cyllinderMesh.verts.push(new Vertex(pos1, color), new Vertex(pos2, color));
  }

  return cyllinderMesh;
}

/**
 * Creates the pointy box mesh.
 */
function initHouseMesh() {
  var houseMesh = new Mesh(gl.TRIANGLES, "House");
  houseMesh.verts = [
    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 1.0, 1.0)),

    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(1.0, 1.0, 0.0)),

    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(1.0, 0.0, 1.0)),

    new Vertex(new Pos( 0.5,  0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 0.0, 1.0)),

    new Vertex(new Pos( 0.5,  0.5,  0.5), new Color(0.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(0.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(0.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 1.0, 0.0)),

    new Vertex(new Pos( 0.5,  0.5,  0.5), new Color(1.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(1.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.0,  0.75, 0.0), new Color(1.0, 0.0, 0.0)),

    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(1.0, 1.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 1.0, 1.0)),
    new Vertex(new Pos( 0.0,  0.75, 0.0), new Color(1.0, 1.0, 1.0)),

    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.0,  0.75, 0.0), new Color(0.0, 0.0, 0.0)),

    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(1.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5,  0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.0,  0.75, 0.0), new Color(1.0, 1.0, 1.0)),
  ];
  return houseMesh;
}

/**
 * Creates a mesh for the grid on the ground.
 */
function initGridMesh(xmin, xmax, ymin, ymax, numlines) {
  var gridMesh = new Mesh(gl.LINES, "Grid");

  for (x = xmin; x <= xmax; x += (xmax - xmin) / (numlines - 1)) {
    gridMesh.verts.push(new Vertex(new Pos(x, ymin, 0.0), new Color(1.0, 1.0, 0.3)));
    gridMesh.verts.push(new Vertex(new Pos(x, ymax, 0.0), new Color(1.0, 1.0, 0.3)));
  }

  for (y = ymin; y <= ymax; y += (ymax - ymin) / (numlines - 1)) {
    gridMesh.verts.push(new Vertex(new Pos(xmin, y, 0.0), new Color(0.5, 1.0, 0.5)));
    gridMesh.verts.push(new Vertex(new Pos(xmax, y, 0.0), new Color(0.5, 1.0, 0.5)));
  }

  return gridMesh;
}

/**
 * Creates a mesh for the x,y,z axes.
 */
function initAxesMesh() {
  var axesMesh = new Mesh(gl.LINES, "Axes");

  axesMesh.verts.push(new Vertex(new Pos(0.0, 0.0, 0.0), new Color(1.0, 0.0, 0.0)));
  axesMesh.verts.push(new Vertex(new Pos(1.0, 0.0, 0.0), new Color(1.0, 0.0, 0.0)));

  axesMesh.verts.push(new Vertex(new Pos(0.0, 0.0, 0.0), new Color(0.0, 1.0, 0.0)));
  axesMesh.verts.push(new Vertex(new Pos(0.0, 1.0, 0.0), new Color(0.0, 1.0, 0.0)));

  axesMesh.verts.push(new Vertex(new Pos(0.0, 0.0, 0.0), new Color(0.0, 0.0, 1.0)));
  axesMesh.verts.push(new Vertex(new Pos(0.0, 0.0, 1.0), new Color(0.0, 0.0, 1.0)));

  return axesMesh;
}

/**
 * Creates the plane mesh.
 */
function initPlaneMesh() {
  var planeMesh = new Mesh(gl.TRIANGLES, "Plane");

  /*
   * Fuselage
   */
  {
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5, -0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));
  }

  /*
   * Right wing
   */
  {
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1,  0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1,  0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1, -0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1, -0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1,  0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1,  0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1,  0.05)));
  }

  /*
   * Left wing
   */
  {
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.1,  0.05)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1,  0.05)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1, -0.05)));

    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1, -0.05)));

    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1,  0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1,  0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.1,  0.05)));
  }

  return planeMesh;
}

/**
 * Quick util to make a vertex with a color that is based on the position.
 */
function planeVertex(pos) {
  return new Vertex(pos, new Color(pos.add(new Vec3(0.5, 0.5, 0.5))));
}

/**
 * Creates a black box mesh.
 */
function initBlackBoxMesh() {
   var boxMesh = new Mesh(gl.TRIANGLES, "BlackBox");

   boxMesh.verts = [
    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),

    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),

    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),

    new Vertex(new Pos( 0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),

    new Vertex(new Pos( 0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 0.0, 0.0)),

    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5,  0.5), new Color(0.0, 0.0, 0.0)),
  ];

  return boxMesh;
}

function initBuildingMesh(numFloors) {
  var buildingMesh = new Mesh(gl.TRIANGLES, "Building" + numFloors);
  
  buildingMesh.verts = [
    // Bottom face
    new Vertex(new Pos(-1, -1, 0), getGrey()),
    new Vertex(new Pos(-1,  1, 0), getGrey()),
    new Vertex(new Pos( 1, -1, 0), getGrey()),
    new Vertex(new Pos(-1,  1, 0), getGrey()),
    new Vertex(new Pos( 1, -1, 0), getGrey()),
    new Vertex(new Pos( 1,  1, 0), getGrey()),
    
    // Top face
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos(-1,  1, numFloors), getGrey()),
    new Vertex(new Pos( 1, -1, numFloors), getGrey()),
    new Vertex(new Pos(-1,  1, numFloors), getGrey()),
    new Vertex(new Pos( 1, -1, numFloors), getGrey()),
    new Vertex(new Pos( 1,  1, numFloors), getGrey()),
    
    // -X face
    new Vertex(new Pos(-1, -1, 0),         getGrey()),
    new Vertex(new Pos(-1,  1, 0),         getGrey()),
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos(-1,  1, 0),         getGrey()),
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos(-1,  1, numFloors), getGrey()),
    
    // +X face
    new Vertex(new Pos(1, -1, 0),         getGrey()),
    new Vertex(new Pos(1,  1, 0),         getGrey()),
    new Vertex(new Pos(1, -1, numFloors), getGrey()),
    new Vertex(new Pos(1,  1, 0),         getGrey()),
    new Vertex(new Pos(1, -1, numFloors), getGrey()),
    new Vertex(new Pos(1,  1, numFloors), getGrey()),
    
    // -Y face
    new Vertex(new Pos(-1, -1, 0),         getGrey()),
    new Vertex(new Pos( 1, -1, 0),         getGrey()),
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos( 1, -1, 0),         getGrey()),
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos( 1, -1, numFloors), getGrey()),
    
    // +Y face
    new Vertex(new Pos(-1, 1, 0),         getGrey()),
    new Vertex(new Pos( 1, 1, 0),         getGrey()),
    new Vertex(new Pos(-1, 1, numFloors), getGrey()),
    new Vertex(new Pos( 1, 1, 0),         getGrey()),
    new Vertex(new Pos(-1, 1, numFloors), getGrey()),
    new Vertex(new Pos( 1, 1, numFloors), getGrey())
  ];
  
  var centers = [
    new Pos( 0.76, -0.65, 0), new Pos( 0.76, 0,    0), new Pos( 0.76,  0.65, 0),
    new Pos(-0.76, -0.65, 0), new Pos(-0.76, 0,    0), new Pos(-0.76,  0.65, 0),
    new Pos(-0.65, -0.76, 0), new Pos( 0,   -0.76, 0), new Pos( 0.65, -0.76, 0),
    new Pos(-0.65,  0.76, 0), new Pos( 0,    0.76, 0), new Pos( 0.65,  0.76, 0)
  ];
  for (var i = 0; i < numFloors; ++i) {
    for (center of centers) {
      var colorFunc;
      if (Math.random() > 0.9) {
        colorFunc = getYellow;
      } else {
        colorFunc = getBlack;
      }
      
      buildingMesh.verts.push(
        // Bottom face
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25,  0.25, i + 0.05)), colorFunc()),
        
        // Top face
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25,  0.25, i + 0.95)), colorFunc()),
        
        // -X face
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.95)), colorFunc()),
        
        // +X face
        new Vertex(center.add(new Pos(0.25, -0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(0.25,  0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(0.25,  0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(0.25,  0.25, i + 0.95)), colorFunc()),
        
        // -Y face
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.95)), colorFunc()),
        
        // +Y face
        new Vertex(center.add(new Pos(-0.25, 0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos( 0.25, 0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(-0.25, 0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, 0.25, i + 0.05)),         colorFunc()),
        new Vertex(center.add(new Pos(-0.25, 0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, 0.25, i + 0.95)), colorFunc())
      )
    }
  }    
  
  return buildingMesh;
}

function getGrey() {
  var greyAmount = 0.65 + Math.random() / 10;
  return new Color(greyAmount, greyAmount, greyAmount);
}

function getYellow() {
  var yellowAmount = 0.9 + Math.random() / 10;
  return new Color(yellowAmount, yellowAmount, 0.0);
}

function getBlack() {
  var greyAmount = 0.0 + Math.random() / 10;
  return new Color(greyAmount, greyAmount, greyAmount);
}

/**
 * Creates the perspective and orthographic cameras.
 */
function initCameras() {
  near = 0.1;
  far = 30;
  fovy = 35;

  startx = -7;
  starty = 7;
  startz = 5;

  startPitch = -25;
  startYaw = 50;
  startRoll = 0;

  var cam1 = new Camera();
  cam1.viewport.x = 0;
  cam1.viewport.y = 0;
  cam1.viewport.width = 0.5;
  cam1.viewport.height = 1;
  cam1.viewport.mode = "relative";
  cam1.move(startx, starty, startz);
  cam1.rotate(startPitch, startYaw, startRoll);
  cam1.applyProjection = function(modelMatrix, width, height) {
    applyPerspectiveProjection(modelMatrix, fovy, width / height, near, far);
  };

  var cam2 = new Camera();
  cam2.viewport.x = 0.5;
  cam2.viewport.y = 0;
  cam2.viewport.width = 0.5;
  cam2.viewport.height = 1;
  cam2.viewport.mode = "relative";
  cam2.move(startx, starty, startz);
  cam2.rotate(startPitch, startYaw, startRoll);
  cam2.applyProjection = function(modelMatrix, width, height) {
    targetPlane = (far - near) / 3;
    targetTop = targetPlane * Math.sin(fovy / 2 * Math.PI / 180);
    targetRight = targetTop * width / height;
    applyOrthoProjection(modelMatrix, -targetRight, targetRight, -targetTop, targetTop, near, far);
  };

  Context.cameras = [cam1, cam2];
}

/**
 * Creates a vbo object with all of the meshes and gets the locations in the
 * GLSL program and sets up of all of the attributes we need.
 */
function initVertexBuffer() {
  var bufferValues = buildBuffer(Context.sceneGraph);
  var buffer = new Float32Array(bufferValues);

  // Create a buffer object
  Context.vboId = gl.createBuffer();
  if (!Context.vboId) {
    console.log('Failed to create the shape buffer object');
    return -1;
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
    return -1;
  }

  colorOverrideId = gl.getUniformLocation(gl.program, 'u_ColorOverride');
  Context.renderProgram.attribIds['u_ColorOverride'] = colorOverrideId;
  if (!colorOverrideId) {
    console.log('Failed to get the storage location of u_ColorOverride');
    return -1;
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

  // Normally these are bot over 2, but since we have 2 renders side by side,
  // 1/2 of a view in the x direction is actually 1/4 of the total canvas
  // width
  var x = (xp - Context.canvas.width/4) / (Context.canvas.width/4);
  var y = (yp - Context.canvas.height/2) / (Context.canvas.height/2);

  return {x: x, y: y};
}

function myMouseDown(ev) {
  var coords = getMouseEventCoords(ev);

  if (coords.x > 1 || coords.x < -1 || coords.y > 1 || coords.y < -1) {
    return;
  }

  Event.mouseDrag.x = coords.x;
  Event.mouseDrag.y = coords.y;
  Event.mouseDrag.currentlyDragging = true;
}

function myMouseMove(ev) {
  if(!Event.mouseDrag.currentlyDragging) return;

  var coords = getMouseEventCoords(ev);

  dragQuat(coords.x - Event.mouseDrag.x, coords.y - Event.mouseDrag.y);

  Event.mouseDrag.x = coords.x;
  Event.mouseDrag.y = coords.y;
}

function myMouseUp(ev) {
  myMouseMove(ev);
  Event.mouseDrag.currentlyDragging = false;
}

function dragQuat(x, y) {
  var res = 5;
  var dist = Math.sqrt(x*x + y*y);
  var axis = new Vector3([-y + 0.0001, x + 0.0001, 0.0]);

  var viewMatrix = new Matrix4();
  var mainCam = Context.cameras[0];

  // Basic idea here: we want to undo the camera transformation to figure out
  // the world coordinates for the axis of rotation. But, we only want to undo
  // the rotation - since translation happens after rotation, we need to ignore
  // translation entirely. Thus, we can find the camera rotation by applying the
  // lookAt function with position = (0,0,0):
  var basePos = new Vec3();
  var lookAt = basePos.add(mainCam.lookDir);
  viewMatrix.lookAt(basePos.x,   basePos.y,   basePos.z,
		    lookAt.x,    lookAt.y,    lookAt.z,
		    mainCam.up.x, mainCam.up.y, mainCam.up.z);

  // Now, we have the camera's rotation matrix. BUT, this matrix doesn't actually
  // transform the camera, it transforms the world in the opposite way, so really
  // we have a matrix that transforms from world to camera coordinates. Since we
  // want to transform from camera to world coordinates, we just take the inverse
  // of the transform.
  viewMatrix.invert();

  // Now the transformation matrix will take our axis which is in camera coords
  // and transform it into world coords
  axis = viewMatrix.multiplyVector3(axis);

  // And then we just do the rotation, same as before
  var quat = QuatFromAxisAngle(axis.elements[0], axis.elements[1], axis.elements[2], dist * 150);
  quat.multiplySelf(Animation.nodes["l1"].rot);
  Animation.nodes["l1"].rot = quat;
}

function myKeyDown(kev) {
  switch(kev.code) {
		case "KeyA":
      Animation.moveLeft = true;
			break;
    case "KeyD":
      Animation.moveRight = true;
			break;
		case "KeyS":
      Animation.moveBack = true;
			break;
		case "KeyW":
      Animation.moveFwd = true;
			break;
    case "KeyE":
      Animation.moveUp = true;
      break;
    case "KeyQ":
      Animation.moveDown = true;
      break;
    case "ArrowUp":
      Animation.lookUp = true;
      break;
    case "ArrowDown":
      Animation.lookDown = true;
      break;
    case "ArrowLeft":
      Animation.lookLeft = true;
      break;
    case "ArrowRight":
      Animation.lookRight = true;
      break;
    default:
      break;
	}
}

function myKeyUp(kev) {
  switch(kev.code) {
		case "KeyA":
      Animation.moveLeft = false;
			break;
    case "KeyD":
      Animation.moveRight = false;
			break;
		case "KeyS":
      Animation.moveBack = false;
			break;
		case "KeyW":
      Animation.moveFwd = false;
			break;
    case "KeyE":
      Animation.moveUp = false;
      break;
    case "KeyQ":
      Animation.moveDown = false;
      break;
    case "ArrowUp":
      Animation.lookUp = false;
      break;
    case "ArrowDown":
      Animation.lookDown = false;
      break;
    case "ArrowLeft":
      Animation.lookLeft = false;
      break;
    case "ArrowRight":
      Animation.lookRight = false;
      break;
    default:
      break;
	}
}
