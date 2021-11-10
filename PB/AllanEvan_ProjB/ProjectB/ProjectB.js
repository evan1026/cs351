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
  
  var xRot = document.getElementById("armRotation").value;
  var waveAmount = document.getElementById("armWaveAmount").value;
  Animation.nodes['l1'].rot = QuatFromEuler(xRot, 180 + waveAmount * Math.sin(armTime / 1000), 0.0);
  Animation.nodes['l2'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 500), 0.0);
  Animation.nodes['l3'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 250), 0.0);
  Animation.nodes['l4'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 125), 0.0);
  Animation.nodes['l5'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 62.5), 0.0);
  Animation.nodes['l6'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 31.25), 0.0);
  Animation.nodes['l7'].rot = QuatFromEuler(0.0, waveAmount * Math.sin(armTime / 15.625), 0.0);
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
  
  Animation.nodes["plane"].enabled = propShown;
  
  if (propAnimate) {
    Animation.propTime = time / 3;
  }
  propTime = Animation.propTime;
  
  Animation.nodes["propConnector"].rot = QuatFromEuler(0, 0, propTime);
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
  if (Animation.moveFwd) {
    Context.cameras[0].move(speed, 0, 0);
    Context.cameras[1].move(speed, 0, 0);
  } else if (Animation.moveBack) {
    Context.cameras[0].move(-speed, 0, 0);
    Context.cameras[1].move(-speed, 0, 0);
  }
  
  if (Animation.moveLeft) {
    Context.cameras[0].move(0, -speed, 0);
    Context.cameras[1].move(0, -speed, 0);
  } else if (Animation.moveRight) {
    Context.cameras[0].move(0, speed, 0);
    Context.cameras[1].move(0, speed, 0);
  }
  
  if (Animation.moveUp) {
    Context.cameras[0].move(0, 0, speed);
    Context.cameras[1].move(0, 0, speed);
  } else if (Animation.moveDown) {
    Context.cameras[0].move(0, 0, -speed);
    Context.cameras[1].move(0, 0, -speed);
  }
}

/**
 * Rotates the camera based on user input.
 */
function rotateCamera(elapsed) {
  degPerTick = 0.5 * elapsed / 15;
  
  if (Animation.lookUp) {
    Context.cameras[0].rotate(degPerTick, 0, 0);
    Context.cameras[1].rotate(degPerTick, 0, 0);
  } else if (Animation.lookDown) {
    Context.cameras[0].rotate(-degPerTick, 0, 0);
    Context.cameras[1].rotate(-degPerTick, 0, 0);
  }
  
  if (Animation.lookLeft) {
    Context.cameras[0].rotate(0, degPerTick * 2, 0);
    Context.cameras[1].rotate(0, degPerTick * 2, 0);
  } else if (Animation.lookRight) {
    Context.cameras[0].rotate(0, -degPerTick * 2, 0);
    Context.cameras[1].rotate(0, -degPerTick * 2, 0);
  }
}

/**
 * Called once per frame.
 */
function tick() {
  animate();
  drawAll();
  requestAnimationFrame(tick, Context.canvas);
}

/**
 * Creates the full scene graph.
 */
function initSceneGraph() {
  var numCircleParts = 100;
  var circleMesh = initCircleMesh(numCircleParts);
  var cyllinderMesh = initCyllinderSideMesh(numCircleParts);
  var houseMesh = initHouseMesh(); 
  var gridMesh = initGridMesh(-5, 5, -5, 5, 50);
  var axesMesh = initAxesMesh();
  var planeMesh = initPlaneMesh();
  var blackBoxMesh = initBlackBoxMesh();

  var makeCyllinder = function(height, pos, rot, scale, name) {
    cylNode =       new SceneGraphNode(name,             pos,                       rot,              scale,                       null);
    cylTopNode =    new SceneGraphNode(name + "_Top",    new Pos(),                 new Quaternion(), new Scale(1.0, 1.0, 1.0),    circleMesh);
    cylBotNode =    new SceneGraphNode(name + "_Bot",    new Pos(0.0, 0.0, height), new Quaternion(), new Scale(0.5, 0.5, 1.0),    circleMesh);
    cylMiddleNode = new SceneGraphNode(name + "_Middle", new Pos(),                 new Quaternion(), new Scale(1.0, 1.0, height), cyllinderMesh);
    cylNode.children = [cylTopNode, cylBotNode, cylMiddleNode];
    return cylNode;
  };

  var topNode = new SceneGraph("root");
  var l1Node = makeCyllinder(4, new Pos(0.0, -2.0, 0.0), QuatFromEuler(90, 180, 0), new Scale(0.1, 0.1, 0.1), "l1");
  var l2Node = makeCyllinder(2, new Pos(0.0, 0.0, 4.0), new Quaternion(), new Scale(0.5, 0.5, 1.0), "l2");
  l1Node.children.push(l2Node);
  var l3Node = makeCyllinder(1, new Pos(0.0, 0.0, 2.0), new Quaternion(), new Scale(0.5, 0.5, 1.0), "l3");
  l2Node.children.push(l3Node);
  var l4Node = makeCyllinder(0.5, new Pos(0.0, 0.0, 1.0), new Quaternion(), new Scale(0.5, 0.5, 1.0), "l4");
  l3Node.children.push(l4Node);
  var l5Node = makeCyllinder(0.25, new Pos(0.0, 0.0, 0.5), new Quaternion(), new Scale(0.5, 0.5, 1.0), "l5");
  l4Node.children.push(l5Node);
  var l6Node = makeCyllinder(0.125, new Pos(0.0, 0.0, 0.25), new Quaternion(), new Scale(0.5, 0.5, 1.0), "l6");
  l5Node.children.push(l6Node);
  var l7Node = makeCyllinder(0.0625, new Pos(0.0, 0.0, 0.125), new Quaternion(), new Scale(0.5, 0.5, 1.0), "l7");
  l6Node.children.push(l7Node);
  
  var houseNode = new SceneGraphNode("house", new Pos(0.5, 0.5, 0.0), new Quaternion(), new Scale(0.15, 0.15, 0.15), houseMesh);
  var houseNode2 = new SceneGraphNode("house2", new Pos(0.0, 1.5, 0.0), QuatFromEuler(180, 0, 0), new Scale(1.0, 1.0, 1.0), houseMesh);
  houseNode.children.push(houseNode2);
  var houseNode3 = new SceneGraphNode("house3", new Pos(0.0, 0.0, 1.25), QuatFromEuler(270, 0, 0), new Scale(1.0, 1.0, 1.0), houseMesh);
  houseNode.children.push(houseNode3);
  var houseNode4 = new SceneGraphNode("house4", new Pos(0.0, 0.0, -1.25), QuatFromEuler(90, 0, 0), new Scale(1.0, 1.0, 1.0), houseMesh);
  houseNode.children.push(houseNode4);
  var houseNode5 = new SceneGraphNode("house5", new Pos(0.0, -1.25, 0.0), new Quaternion(), new Scale(1.0, 1.0, 1.0), houseMesh);
  houseNode.children.push(houseNode5);
  
  var gridNode = new SceneGraphNode("grid", new Pos(), new Quaternion(), new Scale(1.0, 1.0, 1.0), gridMesh);
  
  var axesNode = new SceneGraphNode("axes", new Pos(), new Quaternion(), new Scale(1.0, 1.0, 1.0), axesMesh);
  var armAxesNode = new SceneGraphNode("armAxes", new Pos(-1, -1, 0), new Quaternion(), new Scale(3.0, 3.0, 3.0), axesMesh);
  var armTipAxesNode = new SceneGraphNode("armTipAxes", new Pos(), new Quaternion(), new Scale(32.0, 32.0, 0.5), axesMesh);
  var housesAxesNode = new SceneGraphNode("housesAxes", new Pos(), new Quaternion(), new Scale(3.0, 3.0, 3.0), axesMesh);
  
  var planeNode = new SceneGraphNode("plane", new Pos(3.0, 3.0, 1.0), new Quaternion(), new Scale(1.0, 1.0, 1.0), planeMesh);
  var propConnectorNode = new SceneGraphNode("propConnector", new Pos(0.5, 0.5, 0.55), new Quaternion(), new Scale(0.01, 0.01, 0.15), blackBoxMesh);
  planeNode.children.push(propConnectorNode);
  
  var prop1 = new SceneGraphNode("prop1", new Pos(0.0, 0.0, 0.5), QuatFromEuler(90, 0, 0), new Scale(1.0, 1.0, 10.0), blackBoxMesh);
  var prop2 = new SceneGraphNode("prop2", new Pos(0.0, 0.0, 0.5), QuatFromEuler(90, 60, 0), new Scale(1.0, 1.0, 10.0), blackBoxMesh);
  var prop3 = new SceneGraphNode("prop3", new Pos(0.0, 0.0, 0.5), QuatFromEuler(90, 120, 0), new Scale(1.0, 1.0, 10.0), blackBoxMesh);
  propConnectorNode.children.push(prop1, prop2, prop3);
  
  l1Node.children.push(armAxesNode);
  l7Node.children.push(armTipAxesNode);
  houseNode.children.push(housesAxesNode);

  topNode.children.push(l1Node);
  topNode.children.push(houseNode);
  topNode.children.push(gridNode);
  topNode.children.push(axesNode);
  topNode.children.push(planeNode);

  Context.sceneGraph = topNode;
  console.log("Full Graph: ",topNode);
  console.log("Name Graph: ", getNameGraph(topNode));
}

/**
 * Creates a mesh for a circle. Used for the top and bottom of arm parts.
 */
function initCircleMesh(numCircleParts) {
  var circleMesh = new Mesh(gl.TRIANGLE_FAN);
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
  var cyllinderMesh = new Mesh(gl.TRIANGLE_STRIP);
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
  var houseMesh = new Mesh(gl.TRIANGLES);
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
  var gridMesh = new Mesh(gl.LINES);
  
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
  var axesMesh = new Mesh(gl.LINES);
  
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
  var planeMesh = new Mesh(gl.TRIANGLES);
  
  /*
   * Fuselage
   */
  {
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.4)));

    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.3)));

    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.4)));

    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.4)));

    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.2, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.5)));

    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.2, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.2, 0.5)));

    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.4)));

    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.4)));

    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.2, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.5)));

    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.2, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.2, 0.5)));

    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.2, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.2, 0.5)));

    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.2, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.2, 0.5)));

    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.2, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.4)));

    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.2, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.2, 0.5)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.2, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.2, 0.5)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.2, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.5)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.5)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.5)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.5)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.3)));

    planeMesh.verts.push(planeVertex(new Pos(0.4, 1.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.0, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 1.0, 0.3)));
  }
  
  /*
   * Right wing
   */
  {
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.4, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.4, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.4, 0.45)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.6, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.6, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.6, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.6, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.6, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.6, 0.45)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.4, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.6, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.35)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.6, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.6, 0.35)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.6, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.6, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.6, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.6, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.6, 0.45)));
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.0, 0.4, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.6, 0.45)));
    planeMesh.verts.push(planeVertex(new Pos(0.4, 0.4, 0.45)));
  }
  
  /*
   * Left wing
   */
  {
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.4, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.4, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.4, 0.45)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.6, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.6, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.6, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.6, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.6, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.6, 0.45)));
    
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.4, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.6, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.35)));
    
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.6, 0.3)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.6, 0.35)));
    
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.6, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.6, 0.35)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.6, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.6, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.6, 0.45)));
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.4)));
    
    planeMesh.verts.push(planeVertex(new Pos(1.0, 0.4, 0.4)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.6, 0.45)));
    planeMesh.verts.push(planeVertex(new Pos(0.6, 0.4, 0.45)));
  }
  
  return planeMesh;
}

/**
 * Creates a black box mesh.
 */
function initBlackBoxMesh() {
   var boxMesh = new Mesh(gl.TRIANGLES);
   
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

/**
 * Quick util to make a vertex with a color that is based on the position.
 */
function planeVertex(pos) {
  return new Vertex(pos, new Color(pos));
}

/**
 * Creates the perspective and orthographic cameras.
 */
function initCameras() {
  var cam1 = new Camera();
  cam1.viewport.x = 0;
  cam1.viewport.y = 0;
  cam1.viewport.width = 0.5;
  cam1.viewport.height = 1;
  cam1.viewport.mode = "relative";
  cam1.pos.z = 5.0;
  cam1.applyProjection = function(modelMatrix, width, height) {
    applyPerspectiveProjection(modelMatrix, 35, width / height, 0.001, 1000);
  }
  
  var cam2 = new Camera();
  cam2.viewport.x = 0.5;
  cam2.viewport.y = 0;
  cam2.viewport.width = 0.5;
  cam2.viewport.height = 1;
  cam2.viewport.mode = "relative";
  cam2.pos.z = 5.0;
  cam2.applyProjection = function(modelMatrix, width, height) {
    applyOrthoProjection(modelMatrix, -width / height * 5, width / height * 3, -3, 3, -1000, 1000);
  }
  
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

  var x = (xp - Context.canvas.width/2) / (Context.canvas.width/2);
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

  Event.mouseDrag.x = coords.x;
  Event.mouseDrag.y = coords.y;
}

function myMouseUp(ev) {
  var coords = getMouseEventCoords(ev);

  Event.mouseDrag.currentlyDragging = false;
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
