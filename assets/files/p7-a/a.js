// Adapted from MultiJointModel_segment.js (c) 2012 matsuda


// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Normal;\n' +
  'attribute vec4 a_Color;\n' + // Add color attribute
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  // The followings are some shading calculation to make the arm look three-dimensional
  '  vec3 lightDirection = normalize(vec3(0.0, 0.5, 0.7));\n' + // Light direction
  '  vec4 color = vec4(1.0, 0.4, 0.0, 1.0);\n' +  // Robot color
  '  vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  '  float nDotL = max(dot(normal, lightDirection), 0.0);\n' +
  '  v_Color = vec4(color.rgb * nDotL + vec3(0.1), color.a);\n' +
  '}\n';


// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
;


//------------For mouse click-and-drag: -------------------------------
var g_isDrag=false;		// mouse-drag: true when user holds down mouse button
var g_xMclik=0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;   
var g_xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot=0.0; 
var g_digits=5;			// DIAGNOSTICS: # of digits to print in console.log (
									//    console.log('xVal:', xVal.toFixed(g_digits)); // print 5 digits


// Retrieve <canvas> element
var canvas = document.getElementById('webgl');


function main() {

  // Function to create a shader
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  // Function to create a program
  function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    return program;
  };

  

  // Retrieve checkbox element
  // var animationCheckbox = document.getElementById('checkbox');

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

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }


  // Set the vertex information
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set the clear color and enable the depth test
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage locations of attribute and uniform variables
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (a_Position < 0 || !u_MvpMatrix || !u_NormalMatrix) {
    console.log('Failed to get the storage location of attribute or uniform variable');
    return;
  }

  

  // Calculate the view projection matrix
  var viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(50.0, canvas.width / canvas.height, 1.0, 100.0);
  viewProjMatrix.lookAt(20.0, 10.0, 30.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);


  // MOUSE:
	// Create 'event listeners' for a few vital mouse events 
	// (others events are available too... google it!).  
	window.addEventListener("mousedown", myMouseDown); 
  window.addEventListener("mousemove", myMouseMove); 
	window.addEventListener("mouseup", myMouseUp);	

  

  // Create, init current rotation angle values
  var rotationAngle = 45.0;
  var handleBarAngle = 0.0;
  var handleAngle = 0.0;
  var seatPostAngle = 0.0;
  var seatAngle = 0.0;


  document.onkeydown = function(ev){ keydown(ev, gl, n, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); };
  drawAll(gl, n, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix, rotationAngle, handleBarAngle, handleAngle);

  var tick = function() {
    const result =  animate(rotationAngle, handleBarAngle, handleAngle, seatPostAngle, seatAngle); 
    rotationAngle = result.rotationAngle;  // Update the rotation angle
    handleBarAngle = result.handleBarAngle; // Update the handle bar angle
    handleAngle = result.handleAngle; // Update the handle angle
    seatPostAngle = result.seatPostAngle; // Update the seat post rotation
    seatAngle = result.seatAngle; // Update the seat angle
    drawAll(gl, n, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix, rotationAngle, handleBarAngle, handleAngle, seatPostAngle, seatAngle);  // Draw shapes
    // console.log('handleAngle=',seatPostAngle);
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
  };
  tick();						// start (and continue) animation: 
  

};


var ANGLE_STEP = 20.0;     // The increments of rotation angle (degrees)
var g_rotorAngle = 90.0;   // The rotation angle of arm1 (degrees)
var g_bladeAngle = 0.0;  // The rotation angle of joint3 (degrees)

function keydown(ev, gl, o, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix) {
  switch (ev.keyCode) {
    case 40: // Up arrow key -> the positive rotation of joint1 around the z-axis
      g_rotorAngle = (g_rotorAngle + ANGLE_STEP) % 360;
      break;
    case 38: // Down arrow key -> the negative rotation of joint1 around the z-axis
      g_rotorAngle = (g_rotorAngle - ANGLE_STEP) % 360;
      break;
    case 39: // Right arrow key -> the positive rotation of arm1 around the y-axis
      g_bladeAngle = (g_bladeAngle + ANGLE_STEP * 5) % 360;
      break;
    case 37: // Left arrow key -> the negative rotation of arm1 around the y-axis
      g_bladeAngle = (g_bladeAngle - ANGLE_STEP * 5) % 360;
      break;
    default: return; // Skip drawing at no effective action
  }
  
}

// Buffer object initialization
var g_10x1x1TubeBuffer = null;     // Buffer object for 10x1x1 tube 


function initVertexBuffers(gl){
  // Vertex coordinate (prepare coordinates of cuboids for all segments)
  var vertices_10_1_1_tube = new Float32Array([  // 10x1x1 Tube
     5.0,  0.5,  0.5,  
     -5.0,  0.5,  0.5,  
     -5.0, -0.5,  0.5,  
      5.0, -0.5,  0.5, // v0-v1-v2-v3 front
     5.0,  0.5,  0.5,   
     5.0, -0.5,  0.5,   
     5.0, -0.5, -0.5,   
     5.0,  0.5, -0.5, // v0-v3-v4-v5 right
     5.0,  0.5,  0.5,   
     5.0,  0.5, -0.5,  
     -5.0,  0.5, -0.5,  
     -5.0,  0.5,  0.5, // v0-v5-v6-v1 up
    -5.0,  0.5,  0.5,  
    -5.0,  0.5, -0.5,  
    -5.0, -0.5, -0.5,  
    -5.0, -0.5,  0.5, // v1-v6-v7-v2 left
    -5.0, -0.5,  0.5,   
    5.0, -0.5,  0.5,   
    5.0, -0.5, -0.5, 
    -5.0, -0.5, -0.5, // v7-v4-v3-v2 down
     5.0, -0.5, -0.5,  
     -5.0, -0.5, -0.5,  
     -5.0,  0.5, -0.5,  
      5.0,  0.5, -0.5  // v4-v7-v6-v5 back
  ]);

  // Normal
  var normals = new Float32Array([
     0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0, // v0-v1-v2-v3 front
     1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0, // v0-v3-v4-v5 right
     0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0, // v0-v5-v6-v1 up
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v1-v6-v7-v2 left
     0.0,-1.0, 0.0,  0.0,-1.0, 0.0,  0.0,-1.0, 0.0,  0.0,-1.0, 0.0, // v7-v4-v3-v2 down
     0.0, 0.0,-1.0,  0.0, 0.0,-1.0,  0.0, 0.0,-1.0,  0.0, 0.0,-1.0  // v4-v7-v6-v5 back
  ]);

  // Indices of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
  ]);

  // Write coords to buffers, but don't assign to attribute variables
  g_10x1x1TubeBuffer = initArrayBufferForLaterUse(gl, vertices_10_1_1_tube, 3, gl.FLOAT);
  if (!g_10x1x1TubeBuffer) return -1;

  // Write normals to a buffer, assign it to a_Normal and enable it
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBufferForLaterUse(gl, data, num, type){
  var buffer = gl.createBuffer();   // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Store the necessary information to assign the object to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initArrayBuffer(gl, attribute, data, num, type){
  var buffer = gl.createBuffer();   // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}


// Coordinate transformation matrix
var g_modelMatrix = new Matrix4(), g_mvpMatrix = new Matrix4();




function drawAll(gl, n, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix, rotationAngle, handleBarAngle, handleAngle, seatPostAngle, seatAngle) {

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  pushMatrix(g_modelMatrix);
  // // Draw top tube 
  var baseLength = 10;
  // g_modelMatrix.setRotate(g_arm1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
  g_modelMatrix.setRotate(rotationAngle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
  g_modelMatrix.translate(-5, -5, -5);
  g_modelMatrix.scale(0.5, 0.5, 0.5);
  drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw


  // Draw seat tube 
  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(-65.0, 0.0, 0.0, 1.0);  // Rotate around the z-axis
    g_modelMatrix.translate(1.0, -4.4, 0.0);     // Move to left end of top tube
    g_modelMatrix.scale(1.1, 1.0, 1.0); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw seat post 
  pushMatrix(g_modelMatrix);
    // g_modelMatrix.rotate(-65.0, 0.0, 0.0, 1.0);  // Rotate around the z-axis
    g_modelMatrix.translate(-5.9,3.0, 0.0);     // Move to left end of top tube
  g_modelMatrix.rotate(seatPostAngle, 0.0, 0.0, 1.0);

    g_modelMatrix.scale(0.1, 2.0, 1.0); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw seat 
  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(90.0, 0.0, 0.0, 1.0);  // Rotate around the z-axis
    g_modelMatrix.translate(3.75, 5.0, 0.0);     // Move to left end of top tube
    g_modelMatrix.rotate(seatPostAngle, 0.0, 0.0, 1.0);
    g_modelMatrix.rotate(seatAngle, 1.0, 0.0, 0.0);
    g_modelMatrix.scale(0.1, 4.0, 2.0); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw down tube 
  var baseLength = 10;
  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(35.0, 0.0, 0.0, 1.0);  // Rotate around the z-axis
    g_modelMatrix.translate(-1.25, -5.25, 0.0);     // Move to bottom end of seat tube
    g_modelMatrix.scale(0.9, 1.0, 1.0); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw head tube 
  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(-65.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
    g_modelMatrix.translate(3.5, 4.5, 0.0);     // Move to right end of top tube
    g_modelMatrix.scale(0.6, 1.0, 1.0); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw seat stay 
  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(55.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
    g_modelMatrix.translate(-6.5, 3.5, 0.0);     // Move to left of seat tube
    g_modelMatrix.scale(0.7, 0.6, 0.6); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw chain stay 
  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(-10.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
    g_modelMatrix.translate(-3.5, -7.75, 0.0);     // Move to left of seat tube
    g_modelMatrix.scale(0.75, 0.6, 0.6); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw gears
  pushMatrix(g_modelMatrix);
    g_modelMatrix.translate(-1.5, -7.0, 0.0);     // Move to left of seat tube
    g_modelMatrix.scale(0.3, 3.0, 1.0); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw pedal axes
  pushMatrix(g_modelMatrix);
    g_modelMatrix.translate(-1.5, -7.0, 0.0);     // Move to left of seat tube
    g_modelMatrix.scale(0.1, 1.0, 3.0); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

    
    // Draw right pedal bar 
    pushMatrix(g_modelMatrix);
        g_modelMatrix.translate(-1.5, -6.5, 1.5);     // Move to left of seat tube
        g_modelMatrix.scale(0.1, 2.0, 0.5); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Draw right pedal  
    pushMatrix(g_modelMatrix);
        g_modelMatrix.translate(-1.5, -5.75, 2.5);     // Move to left of seat tube
        g_modelMatrix.scale(0.1, 0.5, 1.5); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();
    

  // Draw left pedal bar 
  pushMatrix(g_modelMatrix);
    g_modelMatrix.translate(-1.5, -7.5, -1.5);     // Move to left of seat tube
    g_modelMatrix.scale(0.1, 2.0, 0.5); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();

  // Draw left pedal  
  pushMatrix(g_modelMatrix);
    g_modelMatrix.translate(-1.5, -8.25, -2.5);     // Move to left of seat tube
    g_modelMatrix.scale(0.1, 0.5, 1.5); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();



  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(handleBarAngle, 0.0, 1.0, 0.0);
    // Draw right tire holder 
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-60.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        // g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
        g_modelMatrix.translate(8.5, 3.5, 1.2);     // Move to right end of top tube
        g_modelMatrix.scale(0.4, 1.0, 1.0); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Draw left tire holder 
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-60.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        // g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
        g_modelMatrix.translate(8.5, 3.5, -1.2);     // Move to right end of top tube
        g_modelMatrix.scale(0.4, 1.0, 1.0); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Draw top tire holder 
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-60.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        // g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
        g_modelMatrix.translate(6.5, 4, 0.0);     // Move to right end of top tube
        g_modelMatrix.scale(0.1, 1.7, 3.0); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Draw handle bar tube
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-60.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        // g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
        g_modelMatrix.translate(1.0, 4.5, 0.0);     // Move to right end of top tube
        g_modelMatrix.scale(0.2, 1.0, 3.5); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Draw handle bar extended 
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-60.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        // g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
        g_modelMatrix.translate(0.0, 5.0, 0.0);     // Move to right end of top tube
        g_modelMatrix.scale(0.05, 1.75, 2.5); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Draw handle bar  
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-60.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        // g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
        g_modelMatrix.translate(0.0, 6.0, 0.0);     // Move to right end of top tube
        g_modelMatrix.scale(0.1, 1.0, 10.0); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();
    

    // Draw right handle  
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-60.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        // g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
        g_modelMatrix.translate(-0.5, 6.0, 5.0);     // Move to right end of top tube
        g_modelMatrix.rotate(handleAngle, 0.0, 0.0, 1.0);
        g_modelMatrix.scale(0.25, 1.0, 1.0); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Draw left handle  
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-60.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        // g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
        g_modelMatrix.translate(-0.5, 6.0, -5.0);     // Move to right end of top tube
        g_modelMatrix.rotate(-handleAngle, 0.0, 0.0, 1.0);
        g_modelMatrix.scale(0.25, 1.0, 1.0); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Draw front tire 
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(0.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        g_modelMatrix.translate(7.5, -7.75, 0.0);     // Move to left of seat tube
        g_modelMatrix.rotate(rotationAngle, 0.0, 0.0, 1.0);  
        g_modelMatrix.scale(0.5, 5, 1.25); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();
    pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(45.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
        g_modelMatrix.translate(0, -10.5, 0.0);     // Move to left of seat tube
        g_modelMatrix.rotate(rotationAngle, 0.0, 0.0, 1.0);  
        g_modelMatrix.scale(0.5, 5, 1.25); // Scale
        drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();
  g_modelMatrix = popMatrix();
  

 
  // Draw back tire
  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(0.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
    g_modelMatrix.translate(-7.5, -7.75, 0.0);     // Move to left of seat tube
    g_modelMatrix.rotate(rotationAngle, 0.0, 0.0, 1.0);  
    g_modelMatrix.scale(0.5, 5, 1.25); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix();
   
  pushMatrix(g_modelMatrix);
    g_modelMatrix.rotate(45.0, 0.0, 0.0, 1.0);  // Rotate around the y-axis
    g_modelMatrix.translate(-10.5, 0.0, 0.0);     // Move to left of seat tube
    g_modelMatrix.rotate(rotationAngle, 0.0, 0.0, 1.0);
    g_modelMatrix.scale(0.5, 5, 1.25); // Scale
    drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
  g_modelMatrix = popMatrix(); 

  g_modelMatrix = popMatrix();


  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Helicopter 

  


  pushMatrix(g_modelMatrix);

    var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot);

    // // Draw main cabin
    var baseLength = 10;
    g_modelMatrix.setRotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);  // Rotate around the y-axis
    g_modelMatrix.translate(5, 5, 5);

    // Front Cabin
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(2.5, 0 , 0);
      g_modelMatrix.scale(0.1, 4.5, 4.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Pilot Cabin
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(3.5, 0 , 0);
      g_modelMatrix.scale(0.2, 4, 4);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Main Cabin
    pushMatrix(g_modelMatrix);
      g_modelMatrix.scale(0.5, 5, 5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Right Rail Tubes
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(-1, -3 , 2);
      g_modelMatrix.scale(0.05, 1.00, 0.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(1, -3 , 2);
      g_modelMatrix.scale(0.05, 1.00, 0.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Right Rail 
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(0, -3.5, 2);
      g_modelMatrix.scale(0.5, 0.50, 0.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Left Rail Tubes
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(-1, -3 , -2);
      g_modelMatrix.scale(0.05, 1.00, 0.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(1, -3 , -2);
      g_modelMatrix.scale(0.05, 1.00, 0.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Left Rail 
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(0, -3.5, -2);
      g_modelMatrix.scale(0.5, 0.50, 0.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();


    // Second Cabin
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(-4, 0 , 0);
      g_modelMatrix.scale(0.3, 3.5, 3.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Tail
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(-8, 0 , 0);
      g_modelMatrix.scale(0.5, 1.5, 1.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(-11, 0.5 , 0);
      g_modelMatrix.rotate(-30, 0.0, 0.0, 1.0);
      g_modelMatrix.scale(0.25, 1.25, 1.25);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Axel
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(0, 3 , 0);
      g_modelMatrix.scale(0.1, 1.75, 0.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    
    // Blade 1
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(0, 4, 0);
      g_modelMatrix.rotate(g_bladeAngle, 0.0, 0.5, 0.0);
      g_modelMatrix.scale(0.1, 0.5, 10.0);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Blade 2
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(0, 4, 0);
      g_modelMatrix.rotate(g_bladeAngle + 90, 0.0, 0.5, 0.0);
      g_modelMatrix.scale(0.1, 0.5, 10.0);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Rotor Tube 
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(-11.5, 0.75 , 1.0);
      g_modelMatrix.rotate(-30, 0.0, 0.0, 1.0);
      g_modelMatrix.scale(0.05, 0.5, 1.25);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

    // Rotor 
    pushMatrix(g_modelMatrix);
      g_modelMatrix.translate(-11.5, 0.75 , 1.75);
      g_modelMatrix.rotate(90, 0.0, 1.0, 0.0);
      g_modelMatrix.rotate(g_rotorAngle, 1.0, 0.0, 0.0);
      g_modelMatrix.scale(0.05, 0.5, 2.5);
      drawSegment(gl, n, g_10x1x1TubeBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw
    g_modelMatrix = popMatrix();

  g_modelMatrix = popMatrix();


 
}

var g_matrixStack = []; // Array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
  var m2 = new Matrix4(m);
  g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
  return g_matrixStack.pop();
}

var g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

// Draw segments
function drawSegment(gl, n, buffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix) {

  // var vertexColorBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(extendedVertices), gl.STATIC_DRAW);

  // var FSIZE = extendedVertices.BYTES_PER_ELEMENT;
  // gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 7, 0);
  // gl.enableVertexAttribArray(a_Position);

  // gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * 7, FSIZE * 3);
  // gl.enableVertexAttribArray(a_Color);


  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // Assign the buffer object to the attribute variable
  gl.vertexAttribPointer(a_Position, buffer.num, buffer.type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_Position);



  // Calculate the model view project matrix and pass it to u_MvpMatrix
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, g_mvpMatrix.elements);
  // Calculate matrix for normal and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);
  // Draw
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();


// Angle Steps -----------------------------
var ROTATION_ANGLE_STEP = 45.0;  // -- Rotation angle rate (degrees/second)
var HANDLE_BAR_ANGLE_STEP = 3.0;     // The increments of rotation angle (degrees)
var HANDLE_ANGLE_STEP = 3.0;
var SEAT_POST_ANGLE_STEP = 3.0;
var SEAT_ANGLE_STEP = 3.0;


function animate(rotationAngle, handleBarAngle, handleAngle, seatPostAngle, seatAngle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;

  // Rotation Angle
  var newRotationAngle = rotationAngle + (ROTATION_ANGLE_STEP * elapsed) / 1000.0;

  // Handle Bar Angle 
  if(handleBarAngle >=  6.0 || handleBarAngle <= -6.0) HANDLE_BAR_ANGLE_STEP = -HANDLE_BAR_ANGLE_STEP;
  var newHandleBarAngle = handleBarAngle + (HANDLE_BAR_ANGLE_STEP) / 5;

  // Handle Angle
  if(handleAngle >=  75.0 || handleAngle <= -75.0) HANDLE_ANGLE_STEP = -HANDLE_ANGLE_STEP;
  var newHandleAngle = handleAngle + HANDLE_ANGLE_STEP;

  // Seat Post Angle 
  if(seatPostAngle >=  10.0 || seatPostAngle <= -50.0) SEAT_POST_ANGLE_STEP = -SEAT_POST_ANGLE_STEP;
  var newSeatPostAngle = seatPostAngle + SEAT_POST_ANGLE_STEP;

  // Seat Angle 
  if(seatAngle >=  40.0 || seatAngle <= -40.0) SEAT_ANGLE_STEP = -SEAT_ANGLE_STEP;
  var newSeatAngle = seatAngle + SEAT_ANGLE_STEP * 1.5;
   
  return {
    rotationAngle: newRotationAngle %= 360,
    handleBarAngle: newHandleBarAngle, 
    handleAngle: newHandleAngle, 
    seatPostAngle: newSeatPostAngle, 
    seatAngle: newSeatAngle
  }
}


//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev) {
  //==============================================================================
  // Called when user PRESSES down any mouse button;
  // 									(Which button?    console.log('ev.button='+ev.button);   )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  
  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
                 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
                 (canvas.height/2);
  //	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
    
    g_isDrag = true;											// set our mouse-dragging flag
    g_xMclik = x;													// record where mouse-dragging began
    g_yMclik = y;

  };
  
  
  function myMouseMove(ev) {
  //==============================================================================
  // Called when user MOVES the mouse with a button already pressed down.
  // 									(Which button?   console.log('ev.button='+ev.button);    )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  
    if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'
  
    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
                 (canvas.width/2);		// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /		//										-1 <= y < +1.
                 (canvas.height/2);
  
  //	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);
  
    // find how far we dragged the mouse:
    g_xMdragTot += (x - g_xMclik);			// Accumulate change-in-mouse-position,&
    g_yMdragTot += (y - g_yMclik);
  
  
    g_xMclik = x;											// Make next drag-measurement from here.
    g_yMclik = y;
  };
  
  function myMouseUp(ev) {
  //==============================================================================
  // Called when user RELEASES mouse button pressed previously.
  // 									(Which button?   console.log('ev.button='+ev.button);    )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  
  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
  //  console.log('myMouseUp  (pixel coords):\n\t xp,yp=\t',xp,',\t',yp);
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
                 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
                 (canvas.height/2);
    
    g_isDrag = false;											// CLEAR our mouse-dragging flag, and
    // accumulate any final bit of mouse-dragging we did:
    g_xMdragTot += (x - g_xMclik);
    g_yMdragTot += (y - g_yMclik);

  };
