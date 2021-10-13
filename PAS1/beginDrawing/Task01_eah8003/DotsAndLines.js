//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// MultiPoint.js (c) 2012 matsuda
// MultiPointJT.js  MODIFIED for EECS 351-1, Northwestern Univ. Jack Tumblin
//						(converted to 2D->4D; 3 verts --> 6 verts; draw as
//						gl.POINTS and as gl.LINE_LOOP, change color.
//
// Vertex shader program.  
//  Each instance computes all the on-screen attributes for just one VERTEX,
//  specifying that vertex so that it can be used as part of a drawing primitive
//  depicted in the CVV coord. system (+/-1, +/-1, +/-1) that fills our HTML5
//  'canvas' object.
// Each time the shader program runs it gets info for just one vertex from our 
//	Vertex Buffer Object (VBO); specifically, the value of its 'attribute' 
// variable a_Position, is supplied by the VBO.
// 
//   CHALLENGE: Change the program to get different pictures. 
//	See if you can:
//	EASY:
//    --change the background color?
//		--change the dot positions? 
//		--change the size of the dots?
//    --change the color of the dots-and-lines?
//	HARDER: (HINT: read about 'uniform' vars in your textbook...)
//    --change the number of dots?
//    --get all dots in one color, and all lines in another color?
//    --set each dot color individually? (what happens to the line colors?)
//
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying mediump vec4 fragColor;\n' +
  'uniform float pointSize;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = pointSize;\n' +
  '  fragColor = a_Color;\n' +
  '}\n';

// Fragment shader program
//  Each instance computes all the on-screen attributes for just one PIXEL
var FSHADER_SOURCE =
  'varying mediump vec4 fragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = fragColor;\n' +
  '}\n';

var start_hue = 0;
var hue_speed = 2;
var verts = null;
var buffId = null;
var r = 0.5;
var max_jitter = 0.05;
var fps = 30;
var aspect_ratio = null;
var pointSizeId = null;

function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Write buffer full of vertices to the GPU, and make it available to shaders
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to load vertices into the GPU');
    return;
  }

  setInterval( function() { drawScreen(gl, n); }, 1000 / fps);

}

function drawScreen(gl, n) {
  hue_add = 360 / n;
  curr_hue = start_hue;
  var angle = 2 * Math.PI / n;
  var curr_angle = 0;
  var canvas = document.getElementById('webgl');
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  var aspect_ratio = canvas.width / canvas.height;
  gl.viewport(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < n; ++i) {
    rgb = HSVtoRGB(curr_hue / 360, 1, 1);

    // Produces an in/out affect with the front and back faces to prove there are front and back faces
    verts[8*i + 0] = Math.sign(verts[8*i + 0]) * 0.5 + Math.sign(verts[8*i + 0]) * Math.sign(verts[8*i + 2]) / 10 * Math.sin(start_hue / 30)
    verts[8*i + 1] = Math.sign(verts[8*i + 1]) * 0.5 + Math.sign(verts[8*i + 1]) * Math.sign(verts[8*i + 2]) / 10 * Math.sin(start_hue / 30)

    verts[8*i + 4] = rgb.r;
    verts[8*i + 5] = rgb.g;
    verts[8*i + 6] = rgb.b;
    verts[8*i + 7] = 1.0;

    curr_hue += hue_add;
    curr_hue = curr_hue % 360;
    curr_angle += angle;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, buffId);
  // COPY data from our 'vertices' array into the vertex buffer object in GPU:
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

  // Specify the color for clearing <canvas>: (Northwestern purple)
  gl.clearColor(78/255, 42/255, 132/255 , 1.0);	// R,G,B,A (A==opacity)

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.lineWidth(Math.abs(Math.cos(start_hue / 30)) * 5 + 1);
  gl.uniform1f(pointSizeId, Math.abs(Math.sin(start_hue / 30)) * 10 + 5);

  gl.drawArrays(gl.LINE_LOOP,   0, n/2);
  gl.drawArrays(gl.LINE_LOOP, n/2, n/2);
  gl.drawArrays(gl.POINTS,      0, n/2);
  gl.drawArrays(gl.POINTS,    n/2, n/2);

  start_hue += hue_speed;
  start_hue = start_hue % 360;
}

/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR 
 * h, s, v
*/
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

function initVertexBuffers(gl) {
//==============================================================================
// first, create an array with all our vertex attribute values:
  var n = 30; // The number of vertices
  var vertices = new Float32Array(
  [
    -0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5, -0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5,  0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,

    -0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5,  0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5,  0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,

    -0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5, -0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5, -0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,

     0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5,  0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5, -0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,

     0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5, -0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5, -0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,

     0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
    -0.5,  0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5,  0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
     0.5,  0.5,  0.5, 1.0, 0.0, 0.0, 0.0, 1.0,
  ]);

  verts = vertices;

  // Then in the Graphics hardware, create a vertex buffer object (VBO)
  var vertexBuffer = gl.createBuffer();	// get it's 'handle'
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  buffId = vertexBuffer;

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // COPY data from our 'vertices' array into the vertex buffer object in GPU:
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  var a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_PositionID < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_PositionID, 4, gl.FLOAT, false, 32, 0);
  // vertexAttributePointer(index, x,y,z,w size=4, type=FLOAT, 
  // NOT normalized, NO stride)

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_PositionID);

  var a_ColorID = gl.getAttribLocation(gl.program, 'a_Color');
  if (a_ColorID < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_ColorID, 4, gl.FLOAT, false, 32, 16);
  // vertexAttributePointer(index, x,y,z,w size=4, type=FLOAT, 
  // NOT normalized, NO stride)

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_ColorID);

  pointSizeId = gl.getUniformLocation(gl.program, "pointSize");

  return n;
}
