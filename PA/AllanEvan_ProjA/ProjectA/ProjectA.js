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

function main() {
  var canvas = document.getElementById('webgl');

  if (!init(canvas)) {
    return;
  }

  initSceneGraph();

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

function animate() {
  var time = Date.now();
  
  var r = document.getElementById("r").value / 255;
  var g = document.getElementById("g").value / 255;
  var b = document.getElementById("b").value / 255;
  var a = document.getElementById("a").value / 255;
  gl.uniform4f(Context.renderProgram.attribIds['u_ColorOverride'], r, g, b, a);
  
  var armShown = document.getElementById("armShown").checked;
  var boxShown = document.getElementById("boxShown").checked;
  var armAnimate = document.getElementById("armAnimation").checked;
  var boxAnimate = document.getElementById("boxAnimation").checked;
  
  Animation.nodes["l1"].enabled = armShown;
  Animation.nodes["house"].enabled = boxShown;

  if (armAnimate) {
    Animation.armTime += (time - Context.lastAnimationTick);
  }
  
  if (boxAnimate) {
    Animation.boxTime += (time - Context.lastAnimationTick);
  }
  
  boxTime = Animation.boxTime;
  armTime = Animation.armTime;

  var xRot = document.getElementById("armRotation").value;
  var waveAmount = document.getElementById("armWaveAmount").value;
  Animation.nodes['l1'].rot = new Rot(xRot, 180 + waveAmount * Math.sin(armTime / 1000), 0.0);
  Animation.nodes['l2'].rot = new Rot(0.0, waveAmount * Math.sin(armTime / 500), 0.0);
  Animation.nodes['l3'].rot = new Rot(0.0, waveAmount * Math.sin(armTime / 250), 0.0);
  Animation.nodes['l4'].rot = new Rot(0.0, waveAmount * Math.sin(armTime / 125), 0.0);
  Animation.nodes['l5'].rot = new Rot(0.0, waveAmount * Math.sin(armTime / 62.5), 0.0);
  
  if (Animation.armUp) {
    Event.mouseDrag.y += 0.01;
  } else if (Animation.armDown) {
    Event.mouseDrag.y -= 0.01;
  }
  
  if (Animation.armLeft) {
    Event.mouseDrag.x -= 0.01;
  } else if (Animation.armRight) {
    Event.mouseDrag.x += 0.01;
  }
  
  var currPos = Animation.nodes['l1'].pos;
  Animation.nodes['l1'].pos = new Pos(Event.mouseDrag.x, Event.mouseDrag.y, currPos.z);
  
  Animation.nodes["house"].pos = new Pos(0.5 * Math.cos(boxTime / 500), 0.5 * Math.sin(boxTime / 500), 0.0);
  Animation.nodes["house"].rot = new Rot(90 * Math.sin(boxTime / 500), 90 * Math.cos(boxTime / 500), 90 * -Math.sin(boxTime / 500))
  var house2Rot = Animation.nodes["house2"].rot;
  house2Rot.y = (boxTime / 2) % 360;
  var house3Rot = Animation.nodes["house3"].rot;
  house3Rot.y = (boxTime / 4) % 360;
  var house4Rot = Animation.nodes["house4"].rot;
  house4Rot.y = (boxTime / 6) % 360;
  var house5Rot = Animation.nodes["house5"].rot;
  house5Rot.y = (boxTime / 8) % 360;

  Context.lastAnimationTick = time;
}

function tick() {
  animate();
  drawAll();
  requestAnimationFrame(tick, Context.canvas);
}

function initSceneGraph() {
  var numCircleParts = 100;
  var circleMesh = initCircleMesh(numCircleParts);
  var cyllinderMesh = initCyllinderSideMesh(numCircleParts);
  var houseMesh = initHouseMesh();

  var makeCyllinder = function(height, pos, rot, scale, name) {
    cylNode =       new SceneGraphNode(name,             pos,                       rot,              scale,                       null);
    cylTopNode =    new SceneGraphNode(name + "_Top",    new Pos(0.0, 0.0, 0),      new Rot(0, 0, 0), new Scale(1.0, 1.0, 1.0),    circleMesh);
    cylBotNode =    new SceneGraphNode(name + "_Bot",    new Pos(0.0, 0.0, height), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0),    circleMesh);
    cylMiddleNode = new SceneGraphNode(name + "_Middle", new Pos(0.0, 0.0, 0),      new Rot(0, 0, 0), new Scale(1.0, 1.0, height), cyllinderMesh);
    cylNode.children = [cylTopNode, cylBotNode, cylMiddleNode];
    return cylNode;
  };

  var topNode = new SceneGraph("root");
  var l1Node = makeCyllinder(4, new Pos(0.0, -1.0, 0.0), new Rot(90, 180, 0), new Scale(0.1, 0.1, 0.1), "l1");
  var l2Node = makeCyllinder(2, new Pos(0.0, 0.0, 4.0), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0), "l2");
  l1Node.children.push(l2Node);
  var l3Node = makeCyllinder(1, new Pos(0.0, 0.0, 2.0), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0), "l3");
  l2Node.children.push(l3Node);
  var l4Node = makeCyllinder(0.5, new Pos(0.0, 0.0, 1.0), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0), "l4");
  l3Node.children.push(l4Node);
  var l5Node = makeCyllinder(0.25, new Pos(0.0, 0.0, 0.5), new Rot(0, 0, 0), new Scale(0.5, 0.5, 1.0), "l5");
  l4Node.children.push(l5Node);
  
  var houseNode = new SceneGraphNode("house", new Pos(0.5, 0.5, 0.0), new Rot(0, 0, 0), new Scale(0.15, 0.15, 0.15), houseMesh);
  var houseNode2 = new SceneGraphNode("house2", new Pos(0.0, 1.5, 0.0), new Rot(180, 0, 0), new Scale(1.0, 1.0, 1.0), houseMesh);
  houseNode.children.push(houseNode2);
  var houseNode3 = new SceneGraphNode("house3", new Pos(0.0, 0.0, 1.25), new Rot(270, 0, 0), new Scale(1.0, 1.0, 1.0), houseMesh);
  houseNode.children.push(houseNode3);
  var houseNode4 = new SceneGraphNode("house4", new Pos(0.0, 0.0, -1.25), new Rot(90, 0, 0), new Scale(1.0, 1.0, 1.0), houseMesh);
  houseNode.children.push(houseNode4);
  var houseNode5 = new SceneGraphNode("house5", new Pos(0.0, -1.25, 0.0), new Rot(0, 0, 0), new Scale(1.0, 1.0, 1.0), houseMesh);
  houseNode.children.push(houseNode5);

  topNode.children.push(l1Node);
  topNode.children.push(houseNode);

  Context.sceneGraph = topNode;
  console.log("Full Graph: ",topNode);
  console.log("Name Graph: ", getNameGraph(topNode));
}

function initCircleMesh(numCircleParts) {
  var circleVerts = [new Vertex(new Pos(0.0, 0.0, 0.0), new Color(1.0, 1.0, 1.0))];
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos = new Pos(Math.cos(rads), Math.sin(rads), 0.0);
    color = new Color(rgb.r, rgb.g, rgb.b);
    circleVerts.push(new Vertex(pos, color));
  }
  var circleMesh = new Mesh();
  circleMesh.renderType = gl.TRIANGLE_FAN;
  circleMesh.verts = circleVerts;
  
  return circleMesh;
}

function initCyllinderSideMesh(numCircleParts) {
  cyllinderVerts = []
  for (i = 0; i <= numCircleParts; ++i) {
    rads = 2.0 * Math.PI / numCircleParts * i;
    rgb = HSVtoRGB(i / numCircleParts, 1, 1);

    pos1 = new Pos(Math.cos(rads), Math.sin(rads), 0.0);
    pos2 = new Pos(0.5 * Math.cos(rads), 0.5 * Math.sin(rads), 1.0);
    color = new Color(rgb.r, rgb.g, rgb.b);
    cyllinderVerts.push(new Vertex(pos1, color), new Vertex(pos2, color));
  }
  var cyllinderMesh = new Mesh();
  cyllinderMesh.renderType = gl.TRIANGLE_STRIP;
  cyllinderMesh.verts = cyllinderVerts;
  return cyllinderMesh;
}

function initHouseMesh() {
  var houseMesh = new Mesh();
  houseMesh.renderType = gl.TRIANGLES;
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
    case "ArrowLeft":
      Animation.armLeft = true;
			break;
    case "KeyD":
    case "ArrowRight":
      Animation.armRight = true;
			break;
		case "KeyS":
    case "ArrowDown":
      Animation.armDown = true;
			break;
		case "KeyW":
    case "ArrowUp":
      Animation.armUp = true;
			break;
    default:
      break;
	}
}

function myKeyUp(kev) {
  switch(kev.code) {
		case "KeyA":
    case "ArrowLeft":
      Animation.armLeft = false;
			break;
    case "KeyD":
    case "ArrowRight":
      Animation.armRight = false;
			break;
		case "KeyS":
    case "ArrowDown":
      Animation.armDown = false;
			break;
		case "KeyW":
    case "ArrowUp":
      Animation.armUp = false;
			break;
    default:
      break;
	}
}