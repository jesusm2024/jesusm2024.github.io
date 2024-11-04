// Project B
// Jesus Montero

//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// BasicShapes.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		--converted from 2D to 4D (x,y,z,w) vertices
//		--extend to other attributes: color, surface normal, etc.
//		--demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//		--create several canonical 3D shapes borrowed from 'GLUT' library:
//		--Demonstrate how to make a 'stepped spiral' tri-strip,  and use it
//			to build a cylinder, sphere, and torus.
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
 `uniform mat4 u_ModelMatrix;
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_Color;
  void main() {
    gl_Position = u_ModelMatrix * a_Position;
    gl_PointSize = 10.0;
    v_Color = a_Color;
  }`;

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
 `precision mediump float;
  varying vec4 v_Color;
  void main() {
    gl_FragColor = v_Color;
  }`;

// Global Variables
var canvas = document.getElementById('webgl');  // Retrieve <canvas> element
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
													// (x,y,z,w)position + (r,g,b)color
													// Later, see if you can add:
													// (x,y,z) surface normal + (tx,ty) texture addr.
// Create, init current rotation angle values
var currentAngle = 0.0;
var satJoint1Angle = 0.0;
var satJoint2Angle = 0.0;
var satJoint3Angle = 0.0;
var satJoint4Angle = 0.0;
var satJoint5Angle = 0.0;


// Angle Steps -----------------------------
var ANGLE_STEP = 45.0;  // -- Rotation angle rate (degrees/second)
var SAT_JOINT_1_ANGLE_STEP = 0.5;     // The increments of rotation angle (degrees)
var SAT_JOINT_2_ANGLE_STEP = 0.4;     // The increments of rotation angle (degrees)
var SAT_JOINT_3_ANGLE_STEP = 0.3;     // The increments of rotation angle (degrees)
var SAT_JOINT_4_ANGLE_STEP = 0.2;     // The increments of rotation angle (degrees)
var SAT_JOINT_5_ANGLE_STEP = 45;


// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();				// rotation matrix, made from latest qTot
						

function main() {
//==============================================================================

	// Prevent the default arrow key behavior (scrolling)
    window.addEventListener("keydown", function(e) {
        // Check if the key pressed is an arrow key
        if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
            e.preventDefault(); // Prevent scrolling
        }
    });

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

  // 
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
	// gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	gl.enable(gl.DEPTH_TEST); 	 
	 
// Register the Mouse & Keyboard Event-handlers-------------------------------


	// If users press any keys on the keyboard or move, click or drag the mouse,
	// the operating system records them as 'events' (small text strings that 
	// can trigger calls to functions within running programs). JavaScript 
	// programs running within HTML webpages can respond to these 'events' if we:
	//		1) write an 'event handler' function (called when event happens) and
	//		2) 'register' that function--connect it to the desired HTML page event. //
	// Here's how to 'register' all mouse events found within our HTML-5 canvas:
	canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, canvas) }; 
	// when user's mouse button goes down, call mouseDown() function
	canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
							// when the mouse moves, call mouseMove() function					
	canvas.onmouseup = 		function(ev){myMouseUp(   ev, gl, canvas)};
		// NOTE! 'onclick' event is SAME as on 'mouseup' event
		// in Chrome Brower on MS Windows 7, and possibly other 
		// operating systems; thus I use 'mouseup' instead.

// END Mouse & Keyboard Event-Handlers-----------------------------------

  // Get handle to graphics system's storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  var modelMatrix = new Matrix4();

  // Control camera.
  document.addEventListener('keydown', keydown);

  // Assume automatic starts as true
	var automatic = true;

	// Event listener for the animation toggle
	document.getElementById('animToggle').addEventListener('change', function() {
		if (this.checked){
			this.style.display = 'none';
			this.disabled = true;
			automatic = false;
			// Show manual controls
			document.getElementById('manualControls').style.display = 'block';
		}
		else {
			automatic = true;
			// Hide manual controls
			document.getElementById('manualControls').style.display = 'none';
		}
	});


	var joint1 = 0;
	var joint2 = 0;
	var joint3 = 0;
	var joint4 = 0;
	var joint5 = 0;

	// Event listeners for manual control sliders
	document.getElementById('joint1Slider').addEventListener('input', function() {
		joint1 = this.value;
	});

	document.getElementById('joint2Slider').addEventListener('input', function() {
		joint2 = this.value;
	});
	
	document.getElementById('joint3Slider').addEventListener('input', function() {
		joint3 = this.value;
	});

	document.getElementById('joint4Slider').addEventListener('input', function() {
		joint4 = this.value;
	});

	document.getElementById('joint5Slider').addEventListener('input', function() {
		joint5 = this.value;
	});
	
//-----------------  
  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
	const result =  animate(); 
    currentAngle = result.angle;  // Update the rotation angle

	if (automatic){
		satJoint1Angle = result.satJoint1Angle; 
		satJoint2Angle = result.satJoint2Angle;
		satJoint3Angle = result.satJoint3Angle;
		satJoint4Angle = result.satJoint4Angle;
		satJoint5Angle = result.satJoint5Angle;
	}
	else {
		satJoint1Angle = joint1;
		satJoint2Angle = joint2;
		satJoint3Angle = joint3;
		satJoint4Angle = joint4;
		satJoint5Angle = joint5;
	}
	

    // drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix);   // Draw shapes
	drawResize(gl, n, modelMatrix, u_ModelMatrix);
    // report current angle on console
    // console.log('currentAngle=',currentAngle);
	// console.log("eye: " + eye[0] + " " + eye[1] + " " + eye[2]);
	// console.log("theta: " + theta);
	// console.log("deltaTilt: " + deltaTilt);
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
  };
  tick();
    
}

// Global camera control variables
var eye = [6.5, -0.2, 3]; // Camera position
var theta = 9.5; // Camera compass angle in radians
var deltaTilt = -0.5; // Camera tilt amount
var panSpeed = 0.05;
var moveSpeed = 0.2; // Movement speed
var strafeSpeed = 0.2; // Strafing speed


var forward = new Float32Array(3); 
var right = new Float32Array(3);
var up = new Float32Array([0, 0, 1]); // Assuming Y-up coordinate system


function keydown(ev) {
    
	// Calculate forward direction (aim direction)
    forward[0] = Math.cos(theta);
    forward[1] = Math.sin(theta);
    forward[2] = deltaTilt;

    // Normalize forward direction
    forward = normalize(forward);

	// Calculate right direction (strafe direction)
    right[0] = forward[1] * up[2] - forward[2] * up[1];
    right[1] = forward[2] * up[0] - forward[0] * up[2];
    right[2] = forward[0] * up[1] - forward[1] * up[0];

	// Normalize right direction
    right = normalize(right);

    switch (ev.keyCode) {
		// WASD control
        case 87: // W key -> tilt up
            deltaTilt += panSpeed;
            break;
        case 83: // S key -> tilt down
            deltaTilt -= panSpeed;
            break;
        case 65: // A key -> turn left
            theta += panSpeed;
            break;
        case 68: // D key -> turn right
            theta -= panSpeed;
            break;
        // Arrow keys control
		case 37: // Left arrow key -> strafe left
            eye[0] -= right[0] * strafeSpeed;
            eye[1] -= right[1] * strafeSpeed;
            eye[2] -= right[2] * strafeSpeed;
            break;
        case 39: // Right arrow key -> strafe right
            eye[0] += right[0] * strafeSpeed;
            eye[1] += right[1] * strafeSpeed;
            eye[2] += right[2] * strafeSpeed;
            break;
		case 38: // Up arrow key -> move toward aim direction
            eye[0] += forward[0] * moveSpeed;
            eye[1] += forward[1] * moveSpeed;
            eye[2] += forward[2] * moveSpeed;
            break
		case 40: // Down arrow key -> move away from aim direction
            eye[0] -= forward[0] * moveSpeed;
            eye[1] -= forward[1] * moveSpeed;
            eye[2] -= forward[2] * moveSpeed;
            break;
    }

}


function normalize(vec) {
    var len = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
    if (len > 0) {
        vec[0] /= len;
        vec[1] /= len;
        vec[2] /= len;
    }
    return vec;
}

function initVertexBuffer(gl) {
    //==============================================================================
    // Create one giant vertex buffer object (VBO) that holds all vertices for all
    // shapes.
    
    // Make each 3D shape in its own array of vertices:
    makeCylinder();          // create, fill the cylVerts array
    makeSphere();            // create, fill the sphVerts array
    makeTorus();             // create, fill the torVerts array
    makeGroundGrid();        // create, fill the gndVerts array
    makeAxes();              // Initialize the vertices for the axes

    // how many floats total needed to store all shapes including axes?
    var mySiz = (cylVerts.length + sphVerts.length + torVerts.length + gndVerts.length + axesVerts.length);

    // How many vertices total?
    var nn = mySiz / floatsPerVertex;
    console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

    // Copy all shapes including axes into one big Float32 array:
    var colorShapes = new Float32Array(mySiz);

    // Copy them: remember where to start for each shape:
    cylStart = 0;             // we stored the cylinder first.
    for(i=0, j=0; j < cylVerts.length; i++, j++) {
        colorShapes[i] = cylVerts[j];
    }
    sphStart = i;             // next, we'll store the sphere;
    for(j=0; j < sphVerts.length; i++, j++) { // don't initialize i -- reuse it!
        colorShapes[i] = sphVerts[j];
    }
    torStart = i;             // next, we'll store the torus;
    for(j=0; j < torVerts.length; i++, j++) {
        colorShapes[i] = torVerts[j];
    }
    gndStart = i;             // next, we'll store the ground-plane;
    for(j=0; j < gndVerts.length; i++, j++) {
        colorShapes[i] = gndVerts[j];
    }
    axesStart = i;            // finally, we store the axes;
    for(j=0; j < axesVerts.length; i++, j++) {
        colorShapes[i] = axesVerts[j];
    }

    // Create a buffer object on the graphics hardware:
    var shapeBufferHandle = gl.createBuffer();
    if (!shapeBufferHandle) {
        console.log('Failed to create the shape buffer object');
        return false;
    }

    // Bind the buffer object to target:
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
    // Transfer data from Javascript array colorShapes to Graphics system VBO
    gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

    // Vertex position attribute setup
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    var FSIZE = colorShapes.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE * floatsPerVertex, 0);
    gl.enableVertexAttribArray(a_Position);

    // Vertex color attribute setup
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if(a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 4);
    gl.enableVertexAttribArray(a_Color);

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return nn;
}

function makeCylinder() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([0.2, 0.2, 0.2]);	// dark gray
 var topColr = new Float32Array([0.4, 0.7, 0.4]);	// light green
 var botColr = new Float32Array([0.5, 0.5, 1.0]);	// light blue
 var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.0;		// radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] = 1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
			//	 can simplify cos(2*PI * (v-1)/(2*capVerts))
			cylVerts[j+2] = 1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0]; 
			cylVerts[j+5]=topColr[1]; 
			cylVerts[j+6]=topColr[2];			
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts[j+2] = 1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=topColr[0]; 
				cylVerts[j+5]=topColr[1]; 
				cylVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
				cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] =-1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=botColr[0]; 
				cylVerts[j+5]=botColr[1]; 
				cylVerts[j+6]=botColr[2];			
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] =-1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] =-1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = botColr[]
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];
		}
	}
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				sphVerts[j+2] = cos0;		
				sphVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;																				// z
				sphVerts[j+3] = 1.0;																				// w.		
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];	
				}
			else if(s==slices-1) {
				sphVerts[j+4]=botColr[0]; 
				sphVerts[j+5]=botColr[1]; 
				sphVerts[j+6]=botColr[2];	
			}
			else {
					sphVerts[j+4]=Math.random();// equColr[0]; 
					sphVerts[j+5]=Math.random();// equColr[1]; 
					sphVerts[j+6]=Math.random();// equColr[2];					
			}
		}
	}
}

function makeTorus() {
//==============================================================================
// 		Create a torus centered at the origin that circles the z axis.  
// Terminology: imagine a torus as a flexible, cylinder-shaped bar or rod bent 
// into a circle around the z-axis. The bent bar's centerline forms a circle
// entirely in the z=0 plane, centered at the origin, with radius 'rbend'.  The 
// bent-bar circle begins at (rbend,0,0), increases in +y direction to circle  
// around the z-axis in counter-clockwise (CCW) direction, consistent with our
// right-handed coordinate system.
// 		This bent bar forms a torus because the bar itself has a circular cross-
// section with radius 'rbar' and angle 'phi'. We measure phi in CCW direction 
// around the bar's centerline, circling right-handed along the direction 
// forward from the bar's start at theta=0 towards its end at theta=2PI.
// 		THUS theta=0, phi=0 selects the torus surface point (rbend+rbar,0,0);
// a slight increase in phi moves that point in -z direction and a slight
// increase in theta moves that point in the +y direction.  
// To construct the torus, begin with the circle at the start of the bar:
//					xc = rbend + rbar*cos(phi); 
//					yc = 0; 
//					zc = -rbar*sin(phi);			(note negative sin(); right-handed phi)
// and then rotate this circle around the z-axis by angle theta:
//					x = xc*cos(theta) - yc*sin(theta) 	
//					y = xc*sin(theta) + yc*cos(theta)
//					z = zc
// Simplify: yc==0, so
//					x = (rbend + rbar*cos(phi))*cos(theta)
//					y = (rbend + rbar*cos(phi))*sin(theta) 
//					z = -rbar*sin(phi)
// To construct a torus from a single triangle-strip, make a 'stepped spiral' 
// along the length of the bent bar; successive rings of constant-theta, using 
// the same design used for cylinder walls in 'makeCyl()' and for 'slices' in 
// makeSphere().  Unlike the cylinder and sphere, we have no 'special case' 
// for the first and last of these bar-encircling rings.
//
var rbend = 1.0;										// Radius of circle formed by torus' bent bar
var rbar = 0.5;											// radius of the bar we bent to form torus
var barSlices = 23;									// # of bar-segments in the torus: >=3 req'd;
																		// more segments for more-circular torus
var barSides = 13;										// # of sides of the bar (and thus the 
																		// number of vertices in its cross-section)
																		// >=3 req'd;
																		// more sides for more-circular cross-section
// for nice-looking torus with approx square facets, 
//			--choose odd or prime#  for barSides, and
//			--choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
// EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.

	// Create a (global) array to hold this torus's vertices:
 torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
//	Each slice requires 2*barSides vertices, but 1st slice will skip its first 
// triangle and last slice will skip its last triangle. To 'close' the torus,
// repeat the first 2 vertices at the end of the triangle-strip.  Assume 7

var phi=0, theta=0;										// begin torus at angles 0,0
var thetaStep = 2*Math.PI/barSlices;	// theta angle between each bar segment
var phiHalfStep = Math.PI/barSides;		// half-phi angle between each side of bar
																			// (WHY HALF? 2 vertices per step in phi)
	// s counts slices of the bar; v counts vertices within one slice; j counts
	// array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
	for(s=0,j=0; s<barSlices; s++) {		// for each 'slice' or 'ring' of the torus:
		for(v=0; v< 2*barSides; v++, j+=7) {		// for each vertex in this slice:
			if(v%2==0)	{	// even #'d vertices at bottom of slice,
				torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
																						 Math.cos((s)*thetaStep);
							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
				torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
																						 Math.sin((s)*thetaStep);
								//  y = (rbend + rbar*cos(phi)) * sin(theta) 
				torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
								//  z = -rbar  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			else {				// odd #'d vertices at top of slice (s+1);
										// at same phi used at bottom of slice (v-1)
				torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
																						 Math.cos((s+1)*thetaStep);
							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
				torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
																						 Math.sin((s+1)*thetaStep);
								//  y = (rbend + rbar*cos(phi)) * sin(theta) 
				torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
								//  z = -rbar  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
		}
	}
	// Repeat the 1st 2 vertices of the triangle strip to complete the torus:
			torVerts[j  ] = rbend + rbar;	// copy vertex zero;
						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
			torVerts[j+1] = 0.0;
							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
			torVerts[j+2] = 0.0;
							//  z = -rbar  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
			j+=7; // go to next vertex:
			torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
			torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
			torVerts[j+2] = 0.0;
							//  z = -rbar  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.2]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

function makeAxes() {
// Global array to hold vertices for the axes
axesVerts = new Float32Array([
    // X axis line (origin: gray to endpoint: red)
    0.0, 0.0, 0.0, 1.0, 0.3, 0.3, 0.3,
    1.3, 0.0, 0.0, 1.0, 1.0, 0.3, 0.3,

    // Y axis line (origin: gray to endpoint: green)
    0.0, 0.0, 0.0, 1.0, 0.3, 0.3, 0.3,
    0.0, 1.3, 0.0, 1.0, 0.3, 1.0, 0.3,

    // Z axis line (origin: gray to endpoint: blue)
    0.0, 0.0, 0.0, 1.0, 0.3, 0.3, 0.3,
    0.0, 0.0, 1.3, 1.0, 0.3, 0.3, 1.0
]);
}

function drawAll(gl, n, modelMatrix, u_ModelMatrix) {
	// Clear <canvas> colors AND the depth buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var vpWidth = 1/2 * canvas.width;
	var vpHeight = 2/3 * canvas.height;
	var vpAspect = vpWidth / vpHeight;
  
	// Draw scene in left half
	gl.viewport(0, 0, vpWidth, vpHeight); // Set viewport for left half
	drawScene(gl, n, modelMatrix, u_ModelMatrix, vpAspect, false);
  
	// Draw scene in right half
	gl.viewport(vpWidth, 0, vpWidth, vpHeight); // Set viewport for right half
	drawScene(gl, n, modelMatrix, u_ModelMatrix, vpAspect, true);
}


function updateAimPoint() {
    var aim = [
        eye[0] + Math.cos(theta),
        eye[1] + Math.sin(theta),
        eye[2] + deltaTilt
    ];
    return aim;
}


function drawScene(gl, n, modelMatrix, u_ModelMatrix, vpAspect, orthoView) {
//==============================================================================
	modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
	// Add in a 'perspective()' function call here to define 'camera lens':

	if (!orthoView){
		modelMatrix.perspective(	35.0,   // FOVY: top-to-bottom vertical image angle, in degrees
								vpAspect,   // Image Aspect Ratio: camera lens width/height
								1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
									1000.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	}
	else {
		// Orthographic projection
        // Adjust these parameters as needed for your scene
        var near = 1.0;         // Near clipping plane (always positive)
        var far = 1000.0;       // Far clipping plane (always positive)
        var top = ((far - near)/3) * Math.tan(35) * 1/35;   // Top boundary of the viewing volume
        var bottom = -top;      // Bottom boundary of the viewing volume
		var left = -vpAspect * top;   // Left boundary of the viewing volume
        var right = vpAspect * top;   // Right boundary of the viewing volume

        modelMatrix.ortho(left, right, bottom, top, near, far);
	}
	

	// Update aim point.
	var aim = updateAimPoint();

	modelMatrix.lookAt( eye[0], eye[1], eye[2],	// center of projection
	aim[0], aim[1], aim[2],	// look-at point 
	0, 0, 1);	// View UP vector.


  //===========================================================
  //

  pushMatrix(modelMatrix);     // SAVE world coord system;
    	//-------Draw Spinning Cylinder:
    modelMatrix.translate(1.5, -1.5, 0.5);  // 'set' means DISCARD old matrix,
    						// (drawing axes centered in CVV), and then make new
    						// drawing axes moved to the lower-left corner of CVV. 
	modelMatrix.scale(1.5, 1.5, 1.5);
	

	pushMatrix(modelMatrix);
		modelMatrix.scale(0.2, 0.2, 0.2);
								// if you DON'T scale, cyl goes outside the CVV; clipped!
		// Drawing:
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		// Draw the cylinder's vertices, and no other vertices:
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									cylStart/floatsPerVertex, // start at this vertex number, and
									cylVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();

	pushMatrix(modelMatrix);

		modelMatrix.rotate(satJoint1Angle, 1, 0, 0);

		pushMatrix(modelMatrix);
			modelMatrix.translate(0.0,0.0, 0.35);
			modelMatrix.scale(0.1, 0.1, 0.2);
			gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
			gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
										cylStart/floatsPerVertex, // start at this vertex number, and
										cylVerts.length/floatsPerVertex);	// draw this many vertices.
		modelMatrix = popMatrix();

		pushMatrix(modelMatrix);

			modelMatrix.rotate(satJoint2Angle, 0, 1, 0);

			pushMatrix(modelMatrix);
					modelMatrix.translate(0.0,0.0, 0.55);
					modelMatrix.scale(0.20, 0.3, 0.05);
					gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
					gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
												cylStart/floatsPerVertex, // start at this vertex number, and
												cylVerts.length/floatsPerVertex);	// draw this many vertices.
			modelMatrix = popMatrix();

			pushMatrix(modelMatrix);

				modelMatrix.rotate(satJoint3Angle, 0, 1, 0);

				pushMatrix(modelMatrix);
					modelMatrix.translate(0.0 ,0.2, 0.65);
					modelMatrix.scale(0.05, 0.05, 0.125);
					gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
					gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
												cylStart/floatsPerVertex, // start at this vertex number, and
												cylVerts.length/floatsPerVertex);	// draw this many vertices.
				modelMatrix = popMatrix();

				pushMatrix(modelMatrix);

					modelMatrix.rotate(satJoint4Angle, 1, 0, 0);


					pushMatrix(modelMatrix);
						modelMatrix.translate(0.0 ,0.2, 0.85);
						modelMatrix.scale(0.02, 0.02, 0.125);
						gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
						gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
													cylStart/floatsPerVertex, // start at this vertex number, and
													cylVerts.length/floatsPerVertex);	// draw this many vertices.
					modelMatrix = popMatrix();
					
					pushMatrix(modelMatrix);
						modelMatrix.translate(0.0 ,0.2, 0.97);
						modelMatrix.rotate(90, 0, 1, 0);
						modelMatrix.rotate(-satJoint5Angle * 4, 1, 1, 1);
						modelMatrix.scale(0.05, 0.05, 0.125);
						gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
						gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
													cylStart/floatsPerVertex, // start at this vertex number, and
													cylVerts.length/floatsPerVertex);	// draw this many vertices.
					modelMatrix = popMatrix();


				modelMatrix = popMatrix();

			modelMatrix = popMatrix();


			/////


			pushMatrix(modelMatrix);

				modelMatrix.rotate(satJoint3Angle, 0, 1, 0);

				pushMatrix(modelMatrix);
					modelMatrix.translate(0.0, -0.2, 0.65);
					modelMatrix.scale(0.05, 0.05, 0.125);
					gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
					gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
												cylStart/floatsPerVertex, // start at this vertex number, and
												cylVerts.length/floatsPerVertex);	// draw this many vertices.
				modelMatrix = popMatrix();

				pushMatrix(modelMatrix);

					modelMatrix.rotate(satJoint4Angle, 1, 0, 0);


					pushMatrix(modelMatrix);
						modelMatrix.translate(0.0, -0.2, 0.85);
						modelMatrix.scale(0.02, 0.02, 0.125);
						gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
						gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
													cylStart/floatsPerVertex, // start at this vertex number, and
													cylVerts.length/floatsPerVertex);	// draw this many vertices.
					modelMatrix = popMatrix();
					
					pushMatrix(modelMatrix);
						modelMatrix.translate(0.0, -0.2, 0.97);
						modelMatrix.rotate(90, 0, 1, 0);
						modelMatrix.rotate(satJoint5Angle * 4, 1, 1, 1);
						modelMatrix.scale(0.05, 0.05, 0.125);
						gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
						gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
													cylStart/floatsPerVertex, // start at this vertex number, and
													cylVerts.length/floatsPerVertex);	// draw this many vertices.
					modelMatrix = popMatrix();


				modelMatrix = popMatrix();

			modelMatrix = popMatrix();



		modelMatrix = popMatrix();
		

	modelMatrix = popMatrix();
	
  modelMatrix = popMatrix();

  //===========================================================
  //  
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    //--------Draw Spinning Sphere
    modelMatrix.translate( 1.5, 1.5, 1.0); // 'set' means DISCARD old matrix,
    						// (drawing axes centered in CVV), and then make new
    						// drawing axes moved to the lower-left corner of CVV.
                          // to match WebGL display canvas.
    modelMatrix.scale(0.3, 0.3, 0.3);
    						// Make it smaller:
    modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
  	// Drawing:		
  	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    		// Draw just the sphere's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
    							sphStart/floatsPerVertex,	// start at this vertex number, and 
    							sphVerts.length/floatsPerVertex);	// draw this many vertices.


	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		// modelMatrix.translate( 3.5/2, -0.5, 0.0); // 'set' means DISCARD old matrix,
								// (drawing axes centered in CVV), and then make new
								// drawing axes moved to the lower-left corner of CVV.
							// to match WebGL display canvas.
		modelMatrix.scale(0.5, 3.5, 0.1);
								// Make it smaller:
		// modelMatrix.rotate(-currentAngle, 1, 0, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		// modelMatrix.translate( 3.5/2, -0.5, 0.0); // 'set' means DISCARD old matrix,
								// (drawing axes centered in CVV), and then make new
								// drawing axes moved to the lower-left corner of CVV.
							// to match WebGL display canvas.
		
		
		modelMatrix.rotate(45, 1, 0, 0);  // Spin on XY diagonal axis
		modelMatrix.scale(0.5, 3.5, 0.1);
								// Make it smaller:
		// modelMatrix.rotate(-currentAngle, 1, 0, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		// modelMatrix.translate( 3.5/2, -0.5, 0.0); // 'set' means DISCARD old matrix,
								// (drawing axes centered in CVV), and then make new
								// drawing axes moved to the lower-left corner of CVV.
							// to match WebGL display canvas.
		
		
		modelMatrix.rotate(-45, 1, 0, 0);  // Spin on XY diagonal axis
		modelMatrix.scale(0.5, 3.5, 0.1);
								// Make it smaller:
		// modelMatrix.rotate(-currentAngle, 1, 0, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		// modelMatrix.translate( 3.5/2, -0.5, 0.0); // 'set' means DISCARD old matrix,
								// (drawing axes centered in CVV), and then make new
								// drawing axes moved to the lower-left corner of CVV.
							// to match WebGL display canvas.
		
		
		modelMatrix.rotate(90, 1, 0, 0);  // Spin on XY diagonal axis
		modelMatrix.scale(0.5, 3.5, 0.1);
								// Make it smaller:
		// modelMatrix.rotate(-currentAngle, 1, 0, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		// modelMatrix.translate( 3.5/2, -0.5, 0.0); // 'set' means DISCARD old matrix,
								// (drawing axes centered in CVV), and then make new
								// drawing axes moved to the lower-left corner of CVV.
							// to match WebGL display canvas.
		
		
		modelMatrix.rotate(150, 0, 1, 0);  // Spin on XY diagonal axis
		modelMatrix.scale(2.5, 1.5, 0.5);
								// Make it smaller:
		// modelMatrix.rotate(-currentAngle, 1, 0, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		// modelMatrix.translate( 3.5/2, -0.5, 0.0); // 'set' means DISCARD old matrix,
								// (drawing axes centered in CVV), and then make new
								// drawing axes moved to the lower-left corner of CVV.
							// to match WebGL display canvas.
		
		
		modelMatrix.rotate(-150, 0, 1, 0);  // Spin on XY diagonal axis
		modelMatrix.scale(2.5, 1.5, 0.5);
								// Make it smaller:
		// modelMatrix.rotate(-currentAngle, 1, 0, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.


  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  
  //===========================================================
  //  


  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  //--------Draw Spinning torus
    modelMatrix.translate(-1.0, 1.0, 0.4);	// 'set' means DISCARD old matrix,
  
    modelMatrix.scale(0.3, 0.3, 0.3);
    						// Make it smaller:
    // modelMatrix.rotate(currentAngle, 0, 1, 1);  // Spin on YZ axis

	quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);	// Quaternion-->Matrix
	modelMatrix.concat(quatMatrix);	// apply that matrix.

  	// Drawing:		
  	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    		// Draw just the torus's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
    						  torStart/floatsPerVertex,	// start at this vertex number, and
    						  torVerts.length/floatsPerVertex);	// draw this many vertices.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		modelMatrix.translate(0.0, 0.0, 1.0); // 'set' means DISCARD old matrix,
		// 						// (drawing axes centered in CVV), and then make new
		// 						// drawing axes moved to the lower-left corner of CVV.
		// 					// to match WebGL display canvas.
		modelMatrix.scale(1.5, 0.5, 2.5);
		// 						// Make it smaller:
		// modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		modelMatrix.translate(0.0, 0.0, 3.0); // 'set' means DISCARD old matrix,
		// 						// (drawing axes centered in CVV), and then make new
		// 						// drawing axes moved to the lower-left corner of CVV.
		// 					// to match WebGL display canvas.
		modelMatrix.scale(1.5, 1.5, 0.25);
		// 						// Make it smaller:
		// modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		modelMatrix.translate(0.0, 0.0, 2.0); // 'set' means DISCARD old matrix,
		// 						// (drawing axes centered in CVV), and then make new
		// 						// drawing axes moved to the lower-left corner of CVV.
		// 					// to match WebGL display canvas.
		modelMatrix.scale(2.5, 2.5, 0.25);
		// 						// Make it smaller:
		// modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		modelMatrix.translate( 1.0, 1.0, 0.0); // 'set' means DISCARD old matrix,
		// 						// (drawing axes centered in CVV), and then make new
		// 						// drawing axes moved to the lower-left corner of CVV.
		// 					// to match WebGL display canvas.
		modelMatrix.scale(0.5, 0.5, 1.3);
		// 						// Make it smaller:
		// modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		modelMatrix.translate(-1.0, -1.0, 0.0); // 'set' means DISCARD old matrix,
		// 						// (drawing axes centered in CVV), and then make new
		// 						// drawing axes moved to the lower-left corner of CVV.
		// 					// to match WebGL display canvas.
		modelMatrix.scale(0.5, 0.5, 1.3);
		// 						// Make it smaller:
		// modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		modelMatrix.translate(1.0, -1.0, 0.0); // 'set' means DISCARD old matrix,
		// 						// (drawing axes centered in CVV), and then make new
		// 						// drawing axes moved to the lower-left corner of CVV.
		// 					// to match WebGL display canvas.
		modelMatrix.scale(0.5, 0.5, 1.3);
		// 						// Make it smaller:
		// modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
		//--------Draw Spinning Sphere
		modelMatrix.translate(-1.0, 1.0, 0.0); // 'set' means DISCARD old matrix,
		// 						// (drawing axes centered in CVV), and then make new
		// 						// drawing axes moved to the lower-left corner of CVV.
		// 					// to match WebGL display canvas.
		modelMatrix.scale(0.5, 0.5, 1.3);
		// 						// Make it smaller:
		// modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.


  //===========================================================

  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  //--------Draw Spinning torus
    modelMatrix.translate(-1.5, -1.5, 1.0);	// 'set' means DISCARD old matrix,
  
    modelMatrix.scale(0.2, 0.2, 0.2);
    						// Make it smaller:
    modelMatrix.rotate(currentAngle, 0, 1, 1);  // Spin on YZ axis

  	// Drawing:		
  	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    		// Draw just the torus's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
    						  torStart/floatsPerVertex,	// start at this vertex number, and
    						  torVerts.length/floatsPerVertex);	// draw this many vertices.


	pushMatrix(modelMatrix);  // SAVE world drawing coords.
	//--------Draw Spinning torus
		// modelMatrix.translate(0.0, 0.0, 6.0);	// 'set' means DISCARD old matrix,
		modelMatrix.rotate(-currentAngle * 2, 0, 1, 0);  // Spin on YZ axis
		modelMatrix.scale(1.5, 1.5, 7.5);
								// Make it smaller:

		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the torus's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
								torStart/floatsPerVertex,	// start at this vertex number, and
								torVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
	//--------Draw Spinning torus
		// modelMatrix.translate(-1.0, -1.0, 1.0);	// 'set' means DISCARD old matrix,
	
		modelMatrix.scale(2.5, 2.5, 1.5);
								// Make it smaller:
		modelMatrix.rotate(45, 0, 1, 0);  // Spin on YZ axis

		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the torus's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
								torStart/floatsPerVertex,	// start at this vertex number, and
								torVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
	//--------Draw Spinning torus
		// modelMatrix.translate(-1.0, -1.0, 1.0);	// 'set' means DISCARD old matrix,
	
		modelMatrix.scale(3.5, 3.5, 1.0);
								// Make it smaller:
		modelMatrix.rotate(-45, 0, 1, 0);  // Spin on YZ axis

		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the torus's vertices
		gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
								torStart/floatsPerVertex,	// start at this vertex number, and
								torVerts.length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.


  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.


  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  	//---------Draw Ground Plane, without spinning.
  	// position it.
  	modelMatrix.translate( 0.4, -0.4, 0.0);	
  	modelMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:

  	// Drawing:
  	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
    						  gndStart/floatsPerVertex,	// start at this vertex number, and
    						  gndVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  	//---------Draw Axes
  	// position it.
  	modelMatrix.translate( 0.4, -0.4, 0.0);	
  	modelMatrix.scale(4.5, 4.5, 2.5);	

  	// Drawing:
  	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
    						  axesStart/floatsPerVertex,	// start at this vertex number, and
    						  axesVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();



function animate() {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;    
  
  var newAngle = currentAngle + (ANGLE_STEP * elapsed) / 1000.0;

  // Satellite Joint 1 Angle
  if(satJoint1Angle >=  20.0 || satJoint1Angle <= -20.0) SAT_JOINT_1_ANGLE_STEP = -SAT_JOINT_1_ANGLE_STEP;
  var newSatJoint1Angle = satJoint1Angle + SAT_JOINT_1_ANGLE_STEP;

  // Satellite Joint 2 Angle
  if(satJoint2Angle >=  10.0 || satJoint2Angle <= -10.0) SAT_JOINT_2_ANGLE_STEP = -SAT_JOINT_2_ANGLE_STEP;
  var newSatJoint2Angle = satJoint2Angle + SAT_JOINT_2_ANGLE_STEP;

  // Satellite Joint 3 Angle
  if(satJoint3Angle >=  7.0 || satJoint3Angle <= -7.0) SAT_JOINT_3_ANGLE_STEP = -SAT_JOINT_3_ANGLE_STEP;
  var newSatJoint3Angle = satJoint3Angle + SAT_JOINT_3_ANGLE_STEP;

  // Satellite Joint 4 Angle
  if(satJoint4Angle >=  2.0 || satJoint4Angle <= -2.0) SAT_JOINT_4_ANGLE_STEP = -SAT_JOINT_4_ANGLE_STEP;
  var newSatJoint4Angle = satJoint4Angle + SAT_JOINT_4_ANGLE_STEP;

  // Satellite Joint 5 Angle
  var newSatJoint5Angle = satJoint5Angle + (SAT_JOINT_5_ANGLE_STEP * elapsed) / 1000.0;


  return {
    angle: newAngle %= 360,
    satJoint1Angle: newSatJoint1Angle, 
	satJoint2Angle: newSatJoint2Angle, 
	satJoint3Angle: newSatJoint3Angle,
	satJoint4Angle: newSatJoint4Angle, 
	satJoint5Angle: newSatJoint5Angle
  }
}

function drawResize(gl, n, modelMatrix, u_ModelMatrix) {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	//Report our current browser-window contents:

	// console.log('g_Canvas width,height=', canvas.width, canvas.height);		
	// console.log('Browser window: innerWidth,innerHeight=', innerWidth, innerHeight);	
																// http://www.w3schools.com/jsref/obj_window.asp

	
	//Make canvas fill the top 3/4 of our browser window:
	var xtraMargin = 16;    // keep a margin (otherwise, browser adds scroll-bars)
	canvas.width = innerWidth - xtraMargin;
	canvas.height = (innerHeight*3/4) - xtraMargin;
	// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
	drawAll(gl, n, modelMatrix, u_ModelMatrix);
}


//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev, gl, canvas) {
    //==============================================================================
    // Called when user PRESSES down any mouse button
	//==============================================================================


    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
    var xp = ev.clientX - rect.left; // x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge

    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width / 2) / // move origin to center of canvas and
        (canvas.width / 2); // normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height / 2) / // -1 <= y < +1.
        (canvas.height / 2);

    isDrag = true; // set our mouse-dragging flag
    xMclik = x; // record where mouse-dragging began
    yMclik = y;
}


function myMouseMove(ev, gl, canvas) {
	//==============================================================================
	// Called when user MOVES the mouse with a button already pressed down.
	//==============================================================================


	// Ignore mouse moves unless dragging
	if (!isDrag) return;
  
	// Get canvas rectangle and compute mouse position in WebGL's pixel coordinates
	var rect = ev.target.getBoundingClientRect();
	var xp = ev.clientX - rect.left; // x=0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top); // y=0 at canvas bottom edge
  
	// Convert pixel coordinates to Canonical View Volume (CVV) coordinates
	var x = (xp - canvas.width / 2) / (canvas.width / 2); // Normalize x to [-1, +1]
	var y = (yp - canvas.height / 2) / (canvas.height / 2); // Normalize y to [-1, +1]
  
	// Accumulate total mouse drag distances
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);
  
	// Use the drag distance to update quaternions
	dragQuat(x - xMclik, y - yMclik);
  
	// Update click positions for the next drag measurement
	xMclik = x;
	yMclik = y;

}


function myMouseUp(ev, gl, canvas) {
	//==============================================================================
	// Called when the user releases the mouse button
	//==============================================================================
  
	// Calculate mouse position in pixel coordinates relative to the WebGL canvas
	var rect = ev.target.getBoundingClientRect();
	var xp = ev.clientX - rect.left; // x=0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top); // y=0 at canvas bottom edge
  
	// Convert pixel coordinates to Canonical View Volume (CVV) coordinates
	var x = (xp - canvas.width / 2) / (canvas.width / 2); // Normalize x to [-1, +1]
	var y = (yp - canvas.height / 2) / (canvas.height / 2); // Normalize y to [-1, +1]
  
	// Clear the mouse-dragging flag and accumulate any final bit of mouse dragging
	isDrag = false;
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);
  
	// Use the final drag distance to update quaternions
	dragQuat(x - xMclik, y - yMclik);
}


function dragQuat(xdrag, ydrag) {
	//==============================================================================
	// Updates the rotation based on mouse drag in CVV coordinates
	// We find a rotation axis perpendicular to the drag direction, and convert the 
	// drag distance to an angular rotation amount, and use both to set the value of 
	// the quaternion qNew.  We then combine this new rotation with the current 
	// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
	// 'draw()' function converts this current 'qTot' quaternion to a rotation 
	// matrix for drawing.
	//==============================================================================

	var qTmp = new Quaternion(0, 0, 0, 1);
	
	var dist = Math.sqrt(xdrag * xdrag + ydrag * ydrag);
	// Calculate new quaternion based on the axis perpendicular to the drag direction
	// Adding a small value to avoid a zero-length rotation axis
	qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist * 150.0);
	
	// Apply the new rotation to the current rotation
	qTmp.multiply(qNew, qTot);
  
	// Quaternion multiplication order is crucial for correct rotation application
	// Normalizing the quaternion to maintain unit length is important but omitted here for brevity
	qTot.copy(qTmp);
}
  