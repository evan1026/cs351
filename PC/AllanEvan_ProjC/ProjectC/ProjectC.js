
class Event {
  static mouseDrag = {x: 0, y: 0, currentlyDragging: false};
}

/**
 * Entry point with basic setup.
 */
function main() {
  var canvas = document.getElementById('webgl');

  if (!init(canvas, false /* debug mode */)) {
    return;
  }
  
  var phongRenderer = new RenderProgram("phong", phongVertShader, phongFragShader);
  var flatRenderer = new RenderProgram("flat", flatVertShader, flatFragShader);
  var garaudRenderer = new RenderProgram("garaud", garaudVertShader, garaudFragShader);
  phongRenderer.verifyAttribs(phongAttribs);
  flatRenderer.verifyAttribs(flatAttribs);
  garaudRenderer.verifyAttribs(garaudAttribs);
  
  phongRenderer.modelMatrixAttrib = 'u_ModelMatrix';
  phongRenderer.normalMatrixAttrib = 'u_NormalMatrix';
  phongRenderer.projectionMatrixAttrib = 'u_ProjectionMatrix';
  phongRenderer.cameraPosAttrib = 'u_CameraPos';
  
  flatRenderer.modelMatrixAttrib = 'u_ModelMatrix';
  flatRenderer.projectionMatrixAttrib = 'u_ProjectionMatrix';
  
  garaudRenderer.modelMatrixAttrib = 'u_ModelMatrix';
  garaudRenderer.normalMatrixAttrib = 'u_NormalMatrix';
  garaudRenderer.projectionMatrixAttrib = 'u_ProjectionMatrix';
  garaudRenderer.cameraPosAttrib = 'u_CameraPos';

  initSceneGraph();
  initCameras();

  var maxVerts = initVertexBuffer(gl);
  if (maxVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  
  console.log(maxVerts / Vertex.primsPerVertex + " verts in vbo");

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

  Context.uniformValues['u_Light.Ia'] = index => gl.uniform3f(index, 1.0, 1.0, 1.0);
  Context.uniformValues['u_Light.Id'] = index => gl.uniform3f(index, 1.0, 1.0, 1.0);
  Context.uniformValues['u_Light.Is'] = index => gl.uniform3f(index, 1.0, 1.0, 1.0);

  tick();
}

/**
 * Changes everything that needs to change each frame.
 */
function animate() {
  var time = Date.now();
  var elapsed = time - Animation.lastTick;

  translateCamera(elapsed);
  rotateCamera(elapsed);

  var r = document.getElementById("r").value / 255;
  var g = document.getElementById("g").value / 255;
  var b = document.getElementById("b").value / 255;
  var a = document.getElementById("a").value / 255;
  Context.uniformValues['u_ColorOverride'] = index => gl.uniform4f(index, r, g, b, a);

  animateArm(time);
  animateBoxes(time);
  animateProp(time);
  
  var buildingsShown = document.getElementById("buildingsShown").checked;
  Animation.nodes["buildings"].enabled = buildingsShown;
  
  Animation.nodes["sphere"].rot.multiplySelf(QuatFromAxisAngle(0, 0, 1, elapsed / 30));

  updateFramerate(elapsed);
  
  Context.uniformValues['u_Light.pos'] = index => gl.uniform3f(index, 10 * Math.cos(time/200), 10 * Math.sin(time/200), 10);
  Context.uniformValues['u_WorldStretch'] = index => gl.uniform1f(index, document.getElementById("worldStretch").value);
  Context.uniformValues['u_WorldStretchPhase'] = index => gl.uniform1f(index, (time / 1000) % (Math.PI * 2));
  
  let normalsShown = document.getElementById("normalsShown").checked;
  Context.uniformValues['u_ShowNormals'] = index => gl.uniform1i(index, normalsShown);
  
  let popOut = document.getElementById("popOut").checked;
  Context.uniformValues['u_PopOut'] = index => gl.uniform1i(index, popOut);
  
  let wireframe = document.getElementById("wireframe").checked;
  Context.wireframe = wireframe;

  Animation.lastTick = time;
}

/**
 * Animates the waving arm.
 */
function animateArm(time) {
  var armShown = document.getElementById("armShown").checked;
  var armAnimate = document.getElementById("armAnimation").checked;

  Animation.nodes["l1"].enabled = armShown;

  if (armAnimate) {
    Animation.armTime += (time - Animation.lastTick);
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
    Animation.boxTime += (time - Animation.lastTick);
    Animation.boxStep = time - Animation.lastTick;
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
    Context.cameras[0].move(speed, 0, 0, lockForward);
  } else if (Animation.moveBack) {
    Context.cameras[0].move(-speed, 0, 0, lockForward);
  }

  if (Animation.moveLeft) {
    Context.cameras[0].move(0, -speed, 0);
  } else if (Animation.moveRight) {
    Context.cameras[0].move(0, speed, 0);
  }

  if (Animation.moveUp) {
    Context.cameras[0].move(0, 0, speed);
  } else if (Animation.moveDown) {
    Context.cameras[0].move(0, 0, -speed);
  }
}

/**
 * Rotates the camera based on user input.
 */
function rotateCamera(elapsed) {
  degPerTick = elapsed / 15;

  if (Animation.lookUp) {
    Context.cameras[0].rotate(degPerTick / 2, 0, 0);
  } else if (Animation.lookDown) {
    Context.cameras[0].rotate(-degPerTick / 2, 0, 0);
  }

  if (Animation.lookLeft) {
    Context.cameras[0].rotate(0, degPerTick, 0);
  } else if (Animation.lookRight) {
    Context.cameras[0].rotate(0, -degPerTick, 0);
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
  var numCircleParts = 30;
  var numSphereParts = 30;
  var bottomCircleMesh = initCircleMesh(numCircleParts, false /* invert */);
  var topCircleMesh = initCircleMesh(numCircleParts, true /* invert */);
  var cyllinderMesh = initCyllinderSideMesh(numCircleParts);
  var houseMesh = initHouseMesh();
  var gridMesh = initGridMesh(-10, 10, -10, 10, 50);
  var axesMesh = initAxesMesh();
  var planeMesh = initPlaneMesh();
  var blackBoxMesh = initBlackBoxMesh();
  var sphereMesh = initSphereMesh(numSphereParts);
  
  var buildingMeshes = [initBuildingMesh(3), initBuildingMesh(4), initBuildingMesh(5), initBuildingMesh(6), initBuildingMesh(7), initBuildingMesh(8)];
  
  calculateAllNormals([houseMesh, blackBoxMesh, planeMesh]);
  calculateAllNormals(buildingMeshes);
  calculateAllNormals([cyllinderMesh], true /* smooth */);

  var makeCyllinder = function(name, parent, height, pos, rot, scale) {
    cylNode =       new SceneGraphNode(name,             parent,  pos,                       rot,                      scale,                       null);
    cylTopNode =    new SceneGraphNode(name + "_Top",    cylNode, new Pos(),                 QuatFromEuler(180, 0, 0), new Scale(1.0, 1.0, 1.0),    topCircleMesh);
    cylBotNode =    new SceneGraphNode(name + "_Bot",    cylNode, new Pos(0.0, 0.0, height), new Quaternion(),         new Scale(0.5, 0.5, 1.0),    bottomCircleMesh);
    cylMiddleNode = new SceneGraphNode(name + "_Middle", cylNode, new Pos(),                 new Quaternion(),         new Scale(1.0, 1.0, height), cyllinderMesh);
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
  
  var buildingsNode = new SceneGraphNode("buildings", topNode, new Pos(0, 3, 0), QuatFromEuler(0, 0, 45), new Scale(1.0, 1.0, 1.0));
  for (var x = -3; x < 0; ++x) {
    for (var y = 0; y < 3; ++y) {
      buildingNode = new SceneGraphNode("building" + x + "_" + y, buildingsNode, new Pos(x, y, 0), QuatFromEuler(0, 0, Math.floor(Math.random() * 4) * 90), new Scale(0.25, 0.25, 0.25), buildingMeshes[Math.floor(Math.random() * buildingMeshes.length)]);
    }
  }
  
  var sphereMesh = new SceneGraphNode("sphere", topNode, new Pos(), new Quaternion(), new Scale(0.4, 0.4, 0.4), sphereMesh);

  Context.sceneGraph = topNode;
  console.log("Full Graph: ",topNode);
  console.log("Name Graph: ", getNameGraph(topNode));
  console.log("Dot string: ", getSceneGraphDotString(topNode));
}

/**
 * Creates a mesh for a circle. Used for the top and bottom of arm parts.
 */
function initCircleMesh(numCircleParts, invert) {
  var circleMesh = new Mesh(gl.TRIANGLE_FAN, "Circle", Context.renderPrograms["phong"]);
  circleMesh.verts = [new Vertex(new Pos(), new Color(1.0, 1.0, 1.0), new Vec3(0, 0, 1))];
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    
    let hue;
    if (invert) {
      hue = 1 - i / numCircleParts;
    } else {
      hue = i / numCircleParts;
    }
    rgb = HSVtoRGB(hue, 1, 1);

    pos = new Pos(Math.cos(rads), Math.sin(rads), 0.0);
    color = new Color(rgb.r, rgb.g, rgb.b);
    circleMesh.verts.push(new Vertex(pos, color, new Vec3(0, 0, 1)));
  }
  
  circleMesh.uniforms = {
    "u_Material.Ka": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.Kd": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.shininess": index => gl.uniform1f(index, 80),
    "u_Material.Ks": index => gl.uniform3f(index, 1.0, 1.0, 1.0)
  };

  return circleMesh;
}

/**
 * Creates a mesh for the side of a cyllinder. Used for the sides of arm parts.
 */
function initCyllinderSideMesh(numCircleParts) {
  var cyllinderMesh = new Mesh(gl.TRIANGLES, "CyllinderSide", Context.renderPrograms["phong"]);
  var prevVertZ1;
  var prevVertZ0;
  for (var i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos1 = new Pos(Math.cos(rads), Math.sin(rads), 0.0);
    pos2 = new Pos(0.5 * Math.cos(rads), 0.5 * Math.sin(rads), 1.0);
    color = new Color(rgb.r, rgb.g, rgb.b);
    
    if (i != 0) {
      cyllinderMesh.verts.push(prevVertZ0.copy(), new Vertex(pos1, color), prevVertZ1.copy(), prevVertZ1.copy(), new Vertex(pos1, color), new Vertex(pos2, color));
    }
    
    prevVertZ0 = new Vertex(pos1, color);
    prevVertZ1 = new Vertex(pos2, color);
  }
  
  cyllinderMesh.uniforms = {
    "u_Material.Ka": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.Kd": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.shininess": index => gl.uniform1f(index, 80),
    "u_Material.Ks": index => gl.uniform3f(index, 1.0, 1.0, 1.0)
  };

  return cyllinderMesh;
}

/**
 * Creates the pointy box mesh.
 */
function initHouseMesh() {
  var houseMesh = new Mesh(gl.TRIANGLES, "House", Context.renderPrograms["phong"]);
  houseMesh.verts = [
    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 1.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 1.0, 1.0)),

    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5, -0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 1.0, 0.0)),
    new Vertex(new Pos( 0.5,  0.5, -0.5), new Color(1.0, 1.0, 0.0)),

    new Vertex(new Pos(-0.5, -0.5, -0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(1.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5, -0.5), new Color(1.0, 0.0, 1.0)),

    new Vertex(new Pos( 0.5,  0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5,  0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos(-0.5, -0.5,  0.5), new Color(0.0, 0.0, 1.0)),
    new Vertex(new Pos( 0.5, -0.5,  0.5), new Color(0.0, 0.0, 1.0)),

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
  
  houseMesh.uniforms = {
    "u_Material.Ka": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.Kd": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.shininess": index => gl.uniform1f(index, 80),
    "u_Material.Ks": index => gl.uniform3f(index, 1.0, 1.0, 1.0)
  };
  
  return houseMesh;
}

/**
 * Creates a mesh for the grid on the ground.
 */
function initGridMesh(xmin, xmax, ymin, ymax, numlines) {
  var gridMesh = new Mesh(gl.LINES, "Grid", Context.renderPrograms["flat"]);

  let xadd = (xmax - xmin) / (numlines - 1);
  let yadd = (ymax - ymin) / (numlines - 1);
  
  for (let x = xmin; x <= xmax + xadd; x += xadd) {
    for (let y = ymin; y <= ymax; y += yadd) {
      gridMesh.verts.push(new Vertex(new Pos(x, y, 0.0), new Color(1.0, 1.0, 0.3)));
      gridMesh.verts.push(new Vertex(new Pos(x, y + yadd, 0.0), new Color(1.0, 1.0, 0.3)));
    }
  }

  for (let y = ymin; y <= ymax + yadd; y += yadd) {
    for (let x = xmin; x <= xmax; x += xadd) {
      gridMesh.verts.push(new Vertex(new Pos(x, y, 0.0), new Color(0.5, 1.0, 0.5)));
      gridMesh.verts.push(new Vertex(new Pos(x + xadd, y, 0.0), new Color(0.5, 1.0, 0.5)));
    }
  }

  return gridMesh;
}

/**
 * Creates a mesh for the x,y,z axes.
 */
function initAxesMesh() {
  var axesMesh = new Mesh(gl.LINES, "Axes", Context.renderPrograms["flat"]);

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
  var planeMesh = new Mesh(gl.TRIANGLES, "Plane", Context.renderPrograms["phong"]);

  /*
   * Fuselage
   */
  {
    // Nose
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));

    // -X bottom section
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.0)));

    // -X top section
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));

    // +X bottom section
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.0)));
    
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));

    // +X top section
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));

    // -X side window
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.0)));

    // +X side window
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));

    // Windshield
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));

    // Top
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.3,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));

    // Back
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.0)));
    
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5,  0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5,  0.1)));

    // Bottom
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5, -0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.5, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1, -0.5, -0.1)));
  }

  /*
   * Right wing
   */
  {
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1, -0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1,  0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1,  0.0)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1,  0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1, -0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1, -0.1)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1, -0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1, -0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1, -0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5,  0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1,  0.05)));

    planeMesh.verts.push(planeVertex(new Pos(-0.5, -0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1, -0.1,  0.05)));
    planeMesh.verts.push(planeVertex(new Pos(-0.1,  0.1,  0.05)));
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
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1,  0.0)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1, -0.05)));

    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1, -0.1)));
    planeMesh.verts.push(planeVertex(new Pos( 0.1,  0.1,  0.05)));
    planeMesh.verts.push(planeVertex(new Pos( 0.5,  0.1,  0.0)));

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
  
  planeMesh.uniforms = {
    "u_Material.Ka": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.Kd": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.shininess": index => gl.uniform1f(index, 80),
    "u_Material.Ks": index => gl.uniform3f(index, 1.0, 1.0, 1.0)
  };

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
   var boxMesh = new Mesh(gl.TRIANGLES, "BlackBox", Context.renderPrograms["phong"]);

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
  
  boxMesh.uniforms = {
    "u_Material.Ka": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.Kd": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.shininess": index => gl.uniform1f(index, 80),
    "u_Material.Ks": index => gl.uniform3f(index, 1.0, 1.0, 1.0)
  };

  return boxMesh;
}

function initBuildingMesh(numFloors) {
  var buildingMesh = new Mesh(gl.TRIANGLES, "Building" + numFloors, Context.renderPrograms["phong"]);
  
  buildingMesh.verts = [
    // Bottom face
    new Vertex(new Pos(-1, -1, 0), getGrey()),
    new Vertex(new Pos(-1,  1, 0), getGrey()),
    new Vertex(new Pos( 1, -1, 0), getGrey()),
    new Vertex(new Pos(-1,  1, 0), getGrey()),
    new Vertex(new Pos( 1,  1, 0), getGrey()),
    new Vertex(new Pos( 1, -1, 0), getGrey()),
    
    // Top face
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos( 1, -1, numFloors), getGrey()),
    new Vertex(new Pos(-1,  1, numFloors), getGrey()),
    new Vertex(new Pos(-1,  1, numFloors), getGrey()),
    new Vertex(new Pos( 1, -1, numFloors), getGrey()),
    new Vertex(new Pos( 1,  1, numFloors), getGrey()),
    
    // -X face
    new Vertex(new Pos(-1, -1, 0),         getGrey()),
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos(-1,  1, 0),         getGrey()),
    new Vertex(new Pos(-1,  1, 0),         getGrey()),
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos(-1,  1, numFloors), getGrey()),
    
    // +X face
    new Vertex(new Pos(1, -1, 0),         getGrey()),
    new Vertex(new Pos(1,  1, 0),         getGrey()),
    new Vertex(new Pos(1, -1, numFloors), getGrey()),
    new Vertex(new Pos(1,  1, 0),         getGrey()),
    new Vertex(new Pos(1,  1, numFloors), getGrey()),
    new Vertex(new Pos(1, -1, numFloors), getGrey()),
    
    // -Y face
    new Vertex(new Pos(-1, -1, 0),         getGrey()),
    new Vertex(new Pos( 1, -1, 0),         getGrey()),
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    new Vertex(new Pos( 1, -1, 0),         getGrey()),
    new Vertex(new Pos( 1, -1, numFloors), getGrey()),
    new Vertex(new Pos(-1, -1, numFloors), getGrey()),
    
    // +Y face
    new Vertex(new Pos(-1, 1, 0),         getGrey()),
    new Vertex(new Pos(-1, 1, numFloors), getGrey()),
    new Vertex(new Pos( 1, 1, 0),         getGrey()),
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
        new Vertex(center.add(new Pos( 0.25,  0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.05)), colorFunc()),
        
        // Top face
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25,  0.25, i + 0.95)), colorFunc()),
        
        // -X face
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25,  0.25, i + 0.95)), colorFunc()),
        
        // +X face
        new Vertex(center.add(new Pos(0.25, -0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(0.25,  0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(0.25,  0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(0.25,  0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(0.25, -0.25, i + 0.95)), colorFunc()),
        
        // -Y face
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, -0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25, -0.25, i + 0.95)), colorFunc()),
        
        // +Y face
        new Vertex(center.add(new Pos(-0.25, 0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25, 0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, 0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, 0.25, i + 0.05)), colorFunc()),
        new Vertex(center.add(new Pos(-0.25, 0.25, i + 0.95)), colorFunc()),
        new Vertex(center.add(new Pos( 0.25, 0.25, i + 0.95)), colorFunc())
      )
    }
  }    
  
  buildingMesh.uniforms = {
    "u_Material.Ka": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.Kd": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.shininess": index => gl.uniform1f(index, 80),
    "u_Material.Ks": index => gl.uniform3f(index, 1.0, 1.0, 1.0)
  };
  
  return buildingMesh;
}

function getGrey() {
  var greyAmount = 0.65;// + Math.random() / 10;
  return new Color(greyAmount, greyAmount, greyAmount);
}

function getYellow() {
  var yellowAmount = 0.9;// + Math.random() / 10;
  return new Color(yellowAmount, yellowAmount, 0.0);
}

function getBlack() {
  var greyAmount = 0.05;// + Math.random() / 10;
  return new Color(greyAmount, greyAmount, greyAmount);
}

function initSphereMesh(numDivisions) {
  // Basic idea for how to subdivide a sphere adapted from http://www.songho.ca/opengl/gl_sphere.html
  
  var sphereMesh = new Mesh(gl.TRIANGLES, "Sphere", Context.renderPrograms["phong"]);
  
  var spherePoints = [];
  
  for (let i = 0; i < numDivisions; ++i) {
    let theta = i / numDivisions * 2 * Math.PI;
    spherePoints.push([]);
    for (let j = 0; j <= numDivisions; ++j) {
      let phi = (j / numDivisions - 0.5) * Math.PI;
      let x = Math.cos(theta) * Math.cos(phi);
      let y = Math.sin(theta) * Math.cos(phi);
      let z = Math.sin(phi);
      spherePoints[i].push(new Vec3(x, y, z));
    }
  }
  
  for (let i = 0; i < numDivisions; ++i) {
    for (let j = 0; j < numDivisions; ++j) {
      let currentPoint = spherePoints[i][j];
      let rightPoint;
      let upPoint = spherePoints[i][j + 1];
      let upRightPoint;
      
      if (i < numDivisions - 1) {
        rightPoint = spherePoints[i + 1][j];
        upRightPoint = spherePoints[i + 1][j + 1];
      } else {
        rightPoint = spherePoints[0][j];
        upRightPoint = spherePoints[0][j + 1];
      }
      
      sphereMesh.verts.push(new Vertex(new Pos(currentPoint), new Color(1.0, 1.0, 0.5), new Vec3(currentPoint)));
      sphereMesh.verts.push(new Vertex(new Pos(upRightPoint), new Color(1.0, 1.0, 0.5), new Vec3(upRightPoint)));
      sphereMesh.verts.push(new Vertex(new Pos(upPoint), new Color(1.0, 1.0, 0.5), new Vec3(upPoint)));
      
      sphereMesh.verts.push(new Vertex(new Pos(currentPoint), new Color(1.0, 1.0, 0.5), new Vec3(currentPoint)));
      sphereMesh.verts.push(new Vertex(new Pos(rightPoint), new Color(1.0, 1.0, 0.5), new Vec3(rightPoint)));
      sphereMesh.verts.push(new Vertex(new Pos(upRightPoint), new Color(1.0, 1.0, 0.5), new Vec3(upRightPoint)));
    }
  }
  
  sphereMesh.uniforms = {
    "u_Material.Ka": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.Kd": index => gl.uniform3f(index, 0.5, 0.5, 0.5),
    "u_Material.shininess": index => gl.uniform1f(index, 80),
    "u_Material.Ks": index => gl.uniform3f(index, 1.0, 1.0, 1.0)
  };
  
  return sphereMesh;
}

/**
 * Creates the perspective and orthographic cameras.
 */
function initCameras() {
  near = 0.1;
  far = 30;
  fovy = 30;

  startx = -7;
  starty = 7;
  startz = 5;

  startPitch = -25;
  startYaw = 50;
  startRoll = 0;

  var cam1 = new Camera();
  cam1.viewport.x = 0;
  cam1.viewport.y = 0;
  cam1.viewport.width = 01;
  cam1.viewport.height = 1;
  cam1.viewport.mode = "relative";
  cam1.move(startx, starty, startz);
  cam1.rotate(startPitch, startYaw, startRoll);
  cam1.applyProjection = function(modelMatrix, width, height) {
    applyPerspectiveProjection(modelMatrix, fovy, width / height, near, far);
  };

  Context.cameras = [cam1];
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

  gl.vertexAttribPointer(Context.renderPrograms["phong"].attribIds['a_Position'], Vertex.primsPerPos, Vertex.primType, false /* Normalize */, Vertex.stride, 0);
  gl.enableVertexAttribArray(Context.renderPrograms["phong"].attribIds['a_Position']);

  gl.vertexAttribPointer(Context.renderPrograms["phong"].attribIds['a_Color'], Vertex.primsPerColor, Vertex.primType, false /* Normalize */, Vertex.stride, Vertex.primSize * Vertex.primsPerPos);
  gl.enableVertexAttribArray(Context.renderPrograms["phong"].attribIds['a_Color']);

  gl.vertexAttribPointer(Context.renderPrograms["phong"].attribIds['a_Normal'], Vertex.primsPerNormal, Vertex.primType, false /* Normalize */, Vertex.stride, Vertex.primSize * Vertex.primsPerPos + Vertex.primSize * Vertex.primsPerColor);
  gl.enableVertexAttribArray(Context.renderPrograms["phong"].attribIds['a_Normal']);

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
