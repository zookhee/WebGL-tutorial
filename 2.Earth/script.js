"use strict";

const maxNumVertices = 10000;

var gl;

var compVertices = null; // for the quad covering all the viewport

var program, comptex_prog, xformtex_prog;
var vPositionLoc, vNormalLoc, vTangentLoc, vTexCoordLoc;
var compVPosLoc, compParamsLoc, compSCorrLoc, compModeLoc;
var xformVPosLoc, xformTex0Loc, xformUPelLoc, xformUPel = flatten([1,1]);

// the render-to-texture frame buffers and their associated textures
var rttFBO = [];

// each object will use these buffers in turn when it's time to render itself 
var vertexBuffer, normalBuffer, tangentBuffer, texCoordsBuffer, indexBuffer;

// the camera moves on a sphere of the given radius; the two angles
// signify the latitude/longitude coordinates (in radians)
var radius = 3.0;
var theta  = 0.0;
var phi    = 0.0;

// the camera looks at the origin point without tilting
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// perspective projection
const fovy       = 45;  // in degrees
var   aspect     = 1.0; // this is determined dynamically
const persp_near = 0.5;
const persp_far  = 25;

// fill color
var sceneColor = vec4(0.85,0.85,0.94,1);

// the position of the light #0 (in world coordinates)
var light0PosWorld = vec4(1.5, 1.0, 1.0, 1.0);
var light0AmbCol   = vec3(0.0, 0.0, 0.0);
var light0DiffCol  = vec3(1.0, 1.0, 1.0);
var light0SpecCol  = vec3(0.5, 0.5, 0.5);

var TEXTURING   = false;
var LIGHTING    = false;
var NORMMAPPING = false;
var ENVMAPPING  = false;
var SPECMAPPING = false; 

var updateModel = null;

// the current view and projection matrices (these are global - only the model ones are one per object)
var viewMatrix = [], projectionMatrix = [];

// locations of the uniform variables in the GLSL code (vertex shader & fragment shader)
var modelViewMatrixLoc, projectionMatrixLoc, normalsMatrixLoc;
var flagsLoc, solidColorLoc, lightPos0Loc, lightAmb0Loc, lightDiff0Loc, lightSpec0Loc, matShininessLoc;

// the types of the known geometric objects
var OBJ_T = { CUBE: 0, CONE: 1, CYLINDER: 2, SPHERE: 3 };

// 24 vertices
const cubeVertices = flatten(
[
  vec4( -0.5, -0.5,  0.5, 1.0 ), vec4(  0.5, -0.5,  0.5, 1.0 ), vec4(  0.5,  0.5,  0.5, 1.0 ), vec4( -0.5,  0.5,  0.5, 1.0 ), // Front
  vec4( -0.5, -0.5, -0.5, 1.0 ), vec4( -0.5,  0.5, -0.5, 1.0 ), vec4(  0.5,  0.5, -0.5, 1.0 ), vec4(  0.5, -0.5, -0.5, 1.0 ), // Back
  vec4( -0.5,  0.5, -0.5, 1.0 ), vec4( -0.5,  0.5,  0.5, 1.0 ), vec4(  0.5,  0.5,  0.5, 1.0 ), vec4(  0.5,  0.5, -0.5, 1.0 ), // Top
  vec4( -0.5, -0.5, -0.5, 1.0 ), vec4(  0.5, -0.5, -0.5, 1.0 ), vec4(  0.5, -0.5,  0.5, 1.0 ), vec4( -0.5, -0.5,  0.5, 1.0 ), // Bottom
  vec4(  0.5, -0.5, -0.5, 1.0 ), vec4(  0.5,  0.5, -0.5, 1.0 ), vec4(  0.5,  0.5,  0.5, 1.0 ), vec4(  0.5, -0.5,  0.5, 1.0 ), // Right
  vec4( -0.5, -0.5, -0.5, 1.0 ), vec4( -0.5, -0.5,  0.5, 1.0 ), vec4( -0.5,  0.5,  0.5, 1.0 ), vec4( -0.5,  0.5, -0.5, 1.0 ), // Left
]);

// 24 normals - each vertex has a corresponding normal vector 
const cubeNormals = flatten(
[
  vec3(0.0,  0.0,  1.0 ), vec3(0.0,  0.0,  1.0 ), vec3(0.0,  0.0,  1.0 ), vec3(0.0,  0.0,  1.0 ), // Front
  vec3(0.0,  0.0, -1.0 ), vec3(0.0,  0.0, -1.0 ), vec3(0.0,  0.0, -1.0 ), vec3(0.0,  0.0, -1.0 ), // Back
  vec3(0.0,  1.0,  0.0 ), vec3(0.0,  1.0,  0.0 ), vec3(0.0,  1.0,  0.0 ), vec3(0.0,  1.0,  0.0 ), // Top
  vec3(0.0, -1.0,  0.0 ), vec3(0.0, -1.0,  0.0 ), vec3(0.0, -1.0,  0.0 ), vec3(0.0, -1.0,  0.0 ), // Bottom
  vec3(1.0,  0.0,  0.0 ), vec3(1.0,  0.0,  0.0 ), vec3(1.0,  0.0,  0.0 ), vec3(1.0,  0.0,  0.0 ), // Right
  vec3(-1.0, 0.0,  0.0 ), vec3(-1.0, 0.0,  0.0 ), vec3(-1.0, 0.0,  0.0 ), vec3(-1.0, 0.0,  0.0 ), // Left
]);

// tex coords for each of the vertices of the cube
const cubeTexCoords = flatten(
[
  vec2( 0.0, 0.0 ), vec2( 1.0, 0.0 ), vec2( 1.0, 1.0 ), vec2( 0.0, 1.0 ), // Front
  vec2( 1.0, 0.0 ), vec2( 1.0, 1.0 ), vec2( 0.0, 1.0 ), vec2( 0.0, 0.0 ), // Back
  vec2( 0.0, 1.0 ), vec2( 0.0, 0.0 ), vec2( 1.0, 0.0 ), vec2( 1.0, 1.0 ), // Top
  vec2( 1.0, 1.0 ), vec2( 0.0, 1.0 ), vec2( 0.0, 0.0 ), vec2( 1.0, 0.0 ), // Bottom
  vec2( 1.0, 0.0 ), vec2( 1.0, 1.0 ), vec2( 0.0, 1.0 ), vec2( 0.0, 0.0 ), // Right
  vec2( 0.0, 0.0 ), vec2( 1.0, 0.0 ), vec2( 1.0, 1.0 ), vec2( 0.0, 1.0 ), // Left
]);

// 6 faces = 6 * 2 triangles = 12 * 3 = 36 indices
const cubeIndices = new Uint16Array(
[
  0,  1,  2,      0,  2,  3,    // front
  4,  5,  6,      4,  6,  7,    // back
  8,  9,  10,     8,  10, 11,   // top
  12, 13, 14,     12, 14, 15,   // bottom
  16, 17, 18,     16, 18, 19,   // right
  20, 21, 22,     20, 22, 23,   // left
]);

// calculate the vertex tangents with the same function used for the other geometric figures
const cubeTangents = calculateTangents( cubeVertices, cubeNormals, cubeTexCoords, cubeIndices );

// cone-related vertex data
var coneVertices = [], coneNormals = [], coneTexCoords = [], coneIndices = [], coneTangents = [];

// cylinder-related vertex data
var cylinderVertices = [], cylinderNormals = [], cylinderTexCoords = [], cylinderIndices = [], cylinderTangents = [];

// sphere-related vertex data
var sphereVertices = [], sphereNormals = [], sphereTexCoords = [], sphereIndices = [], sphereTangents = [];

// the list of all the objects in the scene
var objects = [];

// the index of the currently selected object (hardcoded to 0 for these demos)
const selIdx = 0;

// the amount to add to the rotation around X-axis
var autoRotX = 0;
var autoRotY = 0;
var autoRotZ = 0;

// these are used to generate obj names such as "Cube 1" and "Sphere 3"
const obj_names  = [ "Cube", "Cone", "Cylinder", "Sphere", "Light" ];



WebGLUtils = function init() {

  /**
   * Creates the HTLM for a failure message
   * @param {string} canvasContainerId id of container of th
   *        canvas.
   * @return {string} The html.
   */
  var makeFailHTML = function(msg) {
    return '' +
      '<table style="background-color: #8CE; width: 100%; height: 100%;"><tr>' +
      '<td align="center">' +
      '<div style="display: table-cell; vertical-align: middle;">' +
      '<div style="">' + msg + '</div>' +
      '</div>' +
      '</td></tr></table>';
  };
  
  /**
   * Mesasge for getting a webgl browser
   * @type {string}
   */
  var GET_A_WEBGL_BROWSER = '' +
    'This page requires a browser that supports WebGL.<br/>' +
    '<a href="http://get.webgl.org">Click here to upgrade your browser.</a>';
  
  /**
   * Mesasge for need better hardware
   * @type {string}
   */
  var OTHER_PROBLEM = '' +
    "It doesn't appear your computer can support WebGL.<br/>" +
    '<a href="http://get.webgl.org/troubleshooting/">Click here for more information.</a>';
  
  /**
   * Creates a webgl context. If creation fails it will
   * change the contents of the container of the <canvas>
   * tag to an error message with the correct links for WebGL.
   * @param {Element} canvas. The canvas element to create a
   *     context from.
   * @param {WebGLContextCreationAttirbutes} opt_attribs Any
   *     creation attributes you want to pass in.
   * @return {WebGLRenderingContext} The created context.
   */
  var setupWebGL = function(canvas, opt_attribs) {
    function showLink(str) {
      var container = canvas.parentNode;
      if (container) {
        container.innerHTML = makeFailHTML(str);
      }
    };
  
    if (!window.WebGLRenderingContext) {
      showLink(GET_A_WEBGL_BROWSER);
      return null;
    }
  
    var context = create3DContext(canvas, opt_attribs);
    if (!context) {
      showLink(OTHER_PROBLEM);
    }
    return context;
  };
  
  /**
   * Creates a webgl context.
   * @param {!Canvas} canvas The canvas tag to get context
   *     from. If one is not passed in one will be created.
   * @return {!WebGLContext} The created context.
   */
  var create3DContext = function(canvas, opt_attribs) {
    var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    var context = null;
    for (var ii = 0; ii < names.length; ++ii) {
      try {
        context = canvas.getContext(names[ii], opt_attribs);
      } catch(e) {}
      if (context) {
        break;
      }
    }
    return context;
  }
  
  return {
    create3DContext: create3DContext,
    setupWebGL: setupWebGL
  };
  }();
  
  /**
   * Provides requestAnimationFrame in a cross browser way.
   */
  window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame ||
           window.msRequestAnimationFrame ||
           function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
             window.setTimeout(callback, 1000/60);
           };
  })();

  
function initShaders( gl, vertexShaderId, fragmentShaderId )
{
    var vertShdr;
    var fragShdr;

    var vertElem = document.getElementById( vertexShaderId );
    if ( !vertElem ) { 
        alert( "Unable to load vertex shader " + vertexShaderId );
        return -1;
    }
    else {
        vertShdr = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vertShdr, vertElem.text );
        gl.compileShader( vertShdr );
        if ( !gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS) ) {
            var msg = "Vertex shader failed to compile.  The error log is:"
        	+ "<pre>" + gl.getShaderInfoLog( vertShdr ) + "</pre>";
            alert( msg );
            return -1;
        }
    }

    var fragElem = document.getElementById( fragmentShaderId );
    if ( !fragElem ) { 
        alert( "Unable to load vertex shader " + fragmentShaderId );
        return -1;
    }
    else {
        fragShdr = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( fragShdr, fragElem.text );
        gl.compileShader( fragShdr );
        if ( !gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS) ) {
            var msg = "Fragment shader failed to compile.  The error log is:"
        	+ "<pre>" + gl.getShaderInfoLog( fragShdr ) + "</pre>";
            alert( msg );
            return -1;
        }
    }

    var program = gl.createProgram();
    gl.attachShader( program, vertShdr );
    gl.attachShader( program, fragShdr );
    gl.linkProgram( program );
    
    if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
        var msg = "Shader program failed to link.  The error log is:"
            + "<pre>" + gl.getProgramInfoLog( program ) + "</pre>";
        alert( msg );
        return -1;
    }

    return program;
}

  
  
//----------------------------------------------------------------------------
//
//  Helper functions
//

function _argumentsToArray( args )
{
    return [].concat.apply( [], Array.prototype.slice.apply(args) );
}

//----------------------------------------------------------------------------

function radians( degrees ) {
    return degrees * Math.PI / 180.0;
}

//----------------------------------------------------------------------------
//
//  Vector Constructors
//

function vec2()
{
    var result = _argumentsToArray( arguments );

    switch ( result.length ) {
    case 0: result.push( 0.0 );
    case 1: result.push( 0.0 );
    }

    return result.splice( 0, 2 );
}

function vec3()
{
    var result = _argumentsToArray( arguments );

    switch ( result.length ) {
    case 0: result.push( 0.0 );
    case 1: result.push( 0.0 );
    case 2: result.push( 0.0 );
    }

    return result.splice( 0, 3 );
}

function vec4()
{
    var result = _argumentsToArray( arguments );

    switch ( result.length ) {
    case 0: result.push( 0.0 );
    case 1: result.push( 0.0 );
    case 2: result.push( 0.0 );
    case 3: result.push( 1.0 );
    }

    return result.splice( 0, 4 );
}

//----------------------------------------------------------------------------
//
//  Matrix Constructors
//

function mat2()
{
    var v = _argumentsToArray( arguments );

    var m = [];
    switch ( v.length ) {
    case 0:
        v[0] = 1;
    case 1:
        m = [
            vec2( v[0],  0.0 ),
            vec2(  0.0, v[0] )
        ];
        break;

    default:
        m.push( vec2(v) );  v.splice( 0, 2 );
        m.push( vec2(v) );
        break;
    }

    m.matrix = true;

    return m;
}

//----------------------------------------------------------------------------

function mat3()
{
    var v = _argumentsToArray( arguments );

    var m = [];
    switch ( v.length ) {
    case 0:
        v[0] = 1;
    case 1:
        m = [
            vec3( v[0],  0.0,  0.0 ),
            vec3(  0.0, v[0],  0.0 ),
            vec3(  0.0,  0.0, v[0] )
        ];
        break;

    default:
        m.push( vec3(v) );  v.splice( 0, 3 );
        m.push( vec3(v) );  v.splice( 0, 3 );
        m.push( vec3(v) );
        break;
    }

    m.matrix = true;

    return m;
}

//----------------------------------------------------------------------------

function mat4()
{
    var v = _argumentsToArray( arguments );

    var m = [];
    switch ( v.length ) {
    case 0:
        v[0] = 1;
    case 1:
        m = [
            vec4( v[0], 0.0,  0.0,   0.0 ),
            vec4( 0.0,  v[0], 0.0,   0.0 ),
            vec4( 0.0,  0.0,  v[0],  0.0 ),
            vec4( 0.0,  0.0,  0.0,  v[0] )
        ];
        break;

    default:
        m.push( vec4(v) );  v.splice( 0, 4 );
        m.push( vec4(v) );  v.splice( 0, 4 );
        m.push( vec4(v) );  v.splice( 0, 4 );
        m.push( vec4(v) );
        break;
    }

    m.matrix = true;

    return m;
}

//----------------------------------------------------------------------------
//
//  Generic Mathematical Operations for Vectors and Matrices
//

function equal( u, v )
{
    if ( u.length != v.length ) { return false; }

    if ( u.matrix && v.matrix ) {
        for ( var i = 0; i < u.length; ++i ) {
            if ( u[i].length != v[i].length ) { return false; }
            for ( var j = 0; j < u[i].length; ++j ) {
                if ( u[i][j] !== v[i][j] ) { return false; }
            }
        }
    }
    else if ( u.matrix && !v.matrix || !u.matrix && v.matrix ) {
        return false;
    }
    else {
        for ( var i = 0; i < u.length; ++i ) {
            if ( u[i] !== v[i] ) { return false; }
        }
    }

    return true;
}

//----------------------------------------------------------------------------

function add( u, v )
{
    var result = [];

    if ( u.matrix && v.matrix ) {
        if ( u.length != v.length ) {
            throw "add(): trying to add matrices of different dimensions";
        }

        for ( var i = 0; i < u.length; ++i ) {
            if ( u[i].length != v[i].length ) {
                throw "add(): trying to add matrices of different dimensions";
            }
            result.push( [] );
            for ( var j = 0; j < u[i].length; ++j ) {
                result[i].push( u[i][j] + v[i][j] );
            }
        }

        result.matrix = true;

        return result;
    }
    else if ( u.matrix && !v.matrix || !u.matrix && v.matrix ) {
        throw "add(): trying to add matrix and non-matrix variables";
    }
    else {
        if ( u.length != v.length ) {
            throw "add(): vectors are not the same dimension";
        }

        for ( var i = 0; i < u.length; ++i ) {
            result.push( u[i] + v[i] );
        }

        return result;
    }
}

//----------------------------------------------------------------------------

function subtract( u, v )
{
    var result = [];

    if ( u.matrix && v.matrix ) {
        if ( u.length != v.length ) {
            throw "subtract(): trying to subtract matrices" +
                " of different dimensions";
        }

        for ( var i = 0; i < u.length; ++i ) {
            if ( u[i].length != v[i].length ) {
                throw "subtract(): trying to subtact matrices" +
                    " of different dimensions";
            }
            result.push( [] );
            for ( var j = 0; j < u[i].length; ++j ) {
                result[i].push( u[i][j] - v[i][j] );
            }
        }

        result.matrix = true;

        return result;
    }
    else if ( u.matrix && !v.matrix || !u.matrix && v.matrix ) {
        throw "subtact(): trying to subtact  matrix and non-matrix variables";
    }
    else {
        if ( u.length != v.length ) {
            throw "subtract(): vectors are not the same length";
        }

        for ( var i = 0; i < u.length; ++i ) {
            result.push( u[i] - v[i] );
        }

        return result;
    }
}

//----------------------------------------------------------------------------

function mult( u, v )
{
    var result = [];

    if ( u.matrix && v.matrix ) {
        if ( u.length != v.length ) {
            throw "mult(): trying to add matrices of different dimensions";
        }

        for ( var i = 0; i < u.length; ++i ) {
            if ( u[i].length != v[i].length ) {
                throw "mult(): trying to add matrices of different dimensions";
            }
        }

        for ( var i = 0; i < u.length; ++i ) {
            result.push( [] );

            for ( var j = 0; j < v.length; ++j ) {
                var sum = 0.0;
                for ( var k = 0; k < u.length; ++k ) {
                    sum += u[i][k] * v[k][j];
                }
                result[i].push( sum );
            }
        }

        result.matrix = true;

        return result;
    }
    else {
        if ( u.length != v.length ) {
            throw "mult(): vectors are not the same dimension";
        }

        for ( var i = 0; i < u.length; ++i ) {
            result.push( u[i] * v[i] );
        }

        return result;
    }
}

//----------------------------------------------------------------------------
//
//  Basic Transformation Matrix Generators
//

function translate( x, y, z )
{
    if ( Array.isArray(x) && x.length == 3 ) {
        z = x[2];
        y = x[1];
        x = x[0];
    }

    var result = mat4();
    result[0][3] = x;
    result[1][3] = y;
    result[2][3] = z;

    return result;
}

//----------------------------------------------------------------------------

function rotate( angle, axis )
{
    if ( !Array.isArray(axis) ) {
        axis = [ arguments[1], arguments[2], arguments[3] ];
    }

    var v = normalize( axis );

    var x = v[0];
    var y = v[1];
    var z = v[2];

    var c = Math.cos( radians(angle) );
    var omc = 1.0 - c;
    var s = Math.sin( radians(angle) );

    var result = mat4(
        vec4( x*x*omc + c,   x*y*omc - z*s, x*z*omc + y*s, 0.0 ),
        vec4( x*y*omc + z*s, y*y*omc + c,   y*z*omc - x*s, 0.0 ),
        vec4( x*z*omc - y*s, y*z*omc + x*s, z*z*omc + c,   0.0 ),
        vec4()
    );

    return result;
}

function rotateX(theta) {
  var c = Math.cos( radians(theta) );
  var s = Math.sin( radians(theta) );
  var rx = mat4( 1.0,  0.0,  0.0, 0.0,
      0.0,  c,  s, 0.0,
      0.0, -s,  c, 0.0,
      0.0,  0.0,  0.0, 1.0 );
  return rx;
}
function rotateY(theta) {
  var c = Math.cos( radians(theta) );
  var s = Math.sin( radians(theta) );
  var ry = mat4( c, 0.0, -s, 0.0,
      0.0, 1.0,  0.0, 0.0,
      s, 0.0,  c, 0.0,
      0.0, 0.0,  0.0, 1.0 );
  return ry;
}
function rotateZ(theta) {
  var c = Math.cos( radians(theta) );
  var s = Math.sin( radians(theta) );
  var rz = mat4( c, s, 0.0, 0.0,
      -s,  c, 0.0, 0.0,
      0.0,  0.0, 1.0, 0.0,
      0.0,  0.0, 0.0, 1.0 );
  return rz;
}


//----------------------------------------------------------------------------

function scalem( x, y, z )
{
    if ( Array.isArray(x) && x.length == 3 ) {
        z = x[2];
        y = x[1];
        x = x[0];
    }

    var result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;

    return result;
}

//----------------------------------------------------------------------------
//
//  ModelView Matrix Generators
//

function lookAt( eye, at, up )
{
    if ( !Array.isArray(eye) || eye.length != 3) {
        throw "lookAt(): first parameter [eye] must be an a vec3";
    }

    if ( !Array.isArray(at) || at.length != 3) {
        throw "lookAt(): first parameter [at] must be an a vec3";
    }

    if ( !Array.isArray(up) || up.length != 3) {
        throw "lookAt(): first parameter [up] must be an a vec3";
    }

    if ( equal(eye, at) ) {
        return mat4();
    }

    var v = normalize( subtract(at, eye) );  // view direction vector
    var n = normalize( cross(v, up) );       // perpendicular vector
    var u = normalize( cross(n, v) );        // "new" up vector

    v = negate( v );

    var result = mat4(
        vec4( n, -dot(n, eye) ),
        vec4( u, -dot(u, eye) ),
        vec4( v, -dot(v, eye) ),
        vec4()
    );

    return result;
}

//----------------------------------------------------------------------------
//
//  Projection Matrix Generators
//

function ortho( left, right, bottom, top, near, far )
{
    if ( left == right ) { throw "ortho(): left and right are equal"; }
    if ( bottom == top ) { throw "ortho(): bottom and top are equal"; }
    if ( near == far )   { throw "ortho(): near and far are equal"; }

    var w = right - left;
    var h = top - bottom;
    var d = far - near;

    var result = mat4();
    result[0][0] = 2.0 / w;
    result[1][1] = 2.0 / h;
    result[2][2] = -2.0 / d;
    result[0][3] = -(left + right) / w;
    result[1][3] = -(top + bottom) / h;
    result[2][3] = -(near + far) / d;

    return result;
}

//----------------------------------------------------------------------------

function perspective( fovy, aspect, near, far )
{
    var f = 1.0 / Math.tan( radians(fovy) / 2 );
    var d = far - near;

    var result = mat4();
    result[0][0] = f / aspect;
    result[1][1] = f;
    result[2][2] = -(near + far) / d;
    result[2][3] = -2 * near * far / d;
    result[3][2] = -1;
    result[3][3] = 0.0;

    return result;
}

//----------------------------------------------------------------------------
//
//  Matrix Functions
//

function transpose( m )
{
    if ( !m.matrix ) {
        return "transpose(): trying to transpose a non-matrix";
    }

    var result = [];
    for ( var i = 0; i < m.length; ++i ) {
        result.push( [] );
        for ( var j = 0; j < m[i].length; ++j ) {
            result[i].push( m[j][i] );
        }
    }

    result.matrix = true;

    return result;
}

//----------------------------------------------------------------------------
//
//  Vector Functions
//

function dot( u, v )
{
    if ( u.length != v.length ) {
        throw "dot(): vectors are not the same dimension";
    }

    var sum = 0.0;
    for ( var i = 0; i < u.length; ++i ) {
        sum += u[i] * v[i];
    }

    return sum;
}

//----------------------------------------------------------------------------

function negate( u )
{
    var result = [];
    for ( var i = 0; i < u.length; ++i ) {
        result.push( -u[i] );
    }

    return result;
}

//----------------------------------------------------------------------------

function cross( u, v )
{
    if ( !Array.isArray(u) || u.length < 3 ) {
        throw "cross(): first argument is not a vector of at least 3";
    }

    if ( !Array.isArray(v) || v.length < 3 ) {
        throw "cross(): second argument is not a vector of at least 3";
    }

    var result = [
        u[1]*v[2] - u[2]*v[1],
        u[2]*v[0] - u[0]*v[2],
        u[0]*v[1] - u[1]*v[0]
    ];

    return result;
}

//----------------------------------------------------------------------------

function length( u )
{
    return Math.sqrt( dot(u, u) );
}

//----------------------------------------------------------------------------

function normalize( u, excludeLastComponent )
{
    if ( excludeLastComponent ) {
        var last = u.pop();
    }

    var len = length( u );

    if ( !isFinite(len) ) {
        throw "normalize: vector " + u + " has zero length";
    }

    for ( var i = 0; i < u.length; ++i ) {
        u[i] /= len;
    }

    if ( excludeLastComponent ) {
        u.push( last );
    }

    return u;
}

//----------------------------------------------------------------------------

function mix( u, v, s )
{
    if ( typeof s !== "number" ) {
        throw "mix: the last paramter " + s + " must be a number";
    }

    if ( u.length != v.length ) {
        throw "vector dimension mismatch";
    }

    var result = [];
    for ( var i = 0; i < u.length; ++i ) {
        result.push( (1.0 - s) * u[i] + s * v[i] );
    }

    return result;
}

//----------------------------------------------------------------------------
//
// Vector and Matrix functions
//

function scale( s, u )
{
    if ( !Array.isArray(u) ) {
        throw "scale: second parameter " + u + " is not a vector";
    }

    var result = [];
    for ( var i = 0; i < u.length; ++i ) {
        result.push( s * u[i] );
    }

    return result;
}

//----------------------------------------------------------------------------
//
//
//

function flatten( v )
{
    if ( v.matrix === true ) {
        v = transpose( v );
    }

    var n = v.length;
    var elemsAreArrays = false;

    if ( Array.isArray(v[0]) ) {
        elemsAreArrays = true;
        n *= v[0].length;
    }

    var floats = new Float32Array( n );

    if ( elemsAreArrays ) {
        var idx = 0;
        for ( var i = 0; i < v.length; ++i ) {
            for ( var j = 0; j < v[i].length; ++j ) {
                floats[idx++] = v[i][j];
            }
        }
    }
    else {
        for ( var i = 0; i < v.length; ++i ) {
            floats[i] = v[i];
        }
    }

    return floats;
}

//----------------------------------------------------------------------------

var sizeof = {
    'vec2' : new Float32Array( flatten(vec2()) ).byteLength,
    'vec3' : new Float32Array( flatten(vec3()) ).byteLength,
    'vec4' : new Float32Array( flatten(vec4()) ).byteLength,
    'mat2' : new Float32Array( flatten(mat2()) ).byteLength,
    'mat3' : new Float32Array( flatten(mat3()) ).byteLength,
    'mat4' : new Float32Array( flatten(mat4()) ).byteLength
};

// new functions 5/2/2015

// printing

function printm(m)
{
    if(m.length == 2)
    for(var i=0; i<m.length; i++)
       console.log(m[i][0], m[i][1]);
    else if(m.length == 3)
    for(var i=0; i<m.length; i++)
       console.log(m[i][0], m[i][1], m[i][2]);
    else if(m.length == 4)
    for(var i=0; i<m.length; i++)
       console.log(m[i][0], m[i][1], m[i][2], m[i][3]);
}
// determinants

function det2(m)
{

     return m[0][0]*m[1][1]-m[0][1]*m[1][0];

}

function det3(m)
{
     var d = m[0][0]*m[1][1]*m[2][2]
           + m[0][1]*m[1][2]*m[2][0]
           + m[0][2]*m[2][1]*m[1][0]
           - m[2][0]*m[1][1]*m[0][2]
           - m[1][0]*m[0][1]*m[2][2]
           - m[0][0]*m[1][2]*m[2][1]
           ;
     return d;
}

function det4(m)
{
     var m0 = [
         vec3(m[1][1], m[1][2], m[1][3]),
         vec3(m[2][1], m[2][2], m[2][3]),
         vec3(m[3][1], m[3][2], m[3][3])
     ];
     var m1 = [
         vec3(m[1][0], m[1][2], m[1][3]),
         vec3(m[2][0], m[2][2], m[2][3]),
         vec3(m[3][0], m[3][2], m[3][3])
     ];
     var m2 = [
         vec3(m[1][0], m[1][1], m[1][3]),
         vec3(m[2][0], m[2][1], m[2][3]),
         vec3(m[3][0], m[3][1], m[3][3])
     ];
     var m3 = [
         vec3(m[1][0], m[1][1], m[1][2]),
         vec3(m[2][0], m[2][1], m[2][2]),
         vec3(m[3][0], m[3][1], m[3][2])
     ];
     return m[0][0]*det3(m0) - m[0][1]*det3(m1)
         + m[0][2]*det3(m2) - m[0][3]*det3(m3);

}

function det(m)
{
     if(m.matrix != true) console.log("not a matrix");
     if(m.length == 2) return det2(m);
     if(m.length == 3) return det3(m);
     if(m.length == 4) return det4(m);
}

//---------------------------------------------------------

// inverses

function inverse2(m)
{
     var a = mat2();
     var d = det2(m);
     a[0][0] = m[1][1]/d;
     a[0][1] = -m[0][1]/d;
     a[1][0] = -m[1][0]/d;
     a[1][1] = m[0][0]/d;
     a.matrix = true;
     return a;
}

function inverse3(m)
{
    var a = mat3();
    var d = det3(m);

    var a00 = [
       vec2(m[1][1], m[1][2]),
       vec2(m[2][1], m[2][2])
    ];
    var a01 = [
       vec2(m[1][0], m[1][2]),
       vec2(m[2][0], m[2][2])
    ];
    var a02 = [
       vec2(m[1][0], m[1][1]),
       vec2(m[2][0], m[2][1])
    ];
    var a10 = [
       vec2(m[0][1], m[0][2]),
       vec2(m[2][1], m[2][2])
    ];
    var a11 = [
       vec2(m[0][0], m[0][2]),
       vec2(m[2][0], m[2][2])
    ];
    var a12 = [
       vec2(m[0][0], m[0][1]),
       vec2(m[2][0], m[2][1])
    ];
    var a20 = [
       vec2(m[0][1], m[0][2]),
       vec2(m[1][1], m[1][2])
    ];
    var a21 = [
       vec2(m[0][0], m[0][2]),
       vec2(m[1][0], m[1][2])
    ];
    var a22 = [
       vec2(m[0][0], m[0][1]),
       vec2(m[1][0], m[1][1])
    ];

   a[0][0] = det2(a00)/d;
   a[0][1] = -det2(a10)/d;
   a[0][2] = det2(a20)/d;
   a[1][0] = -det2(a01)/d;
   a[1][1] = det2(a11)/d;
   a[1][2] = -det2(a21)/d;
   a[2][0] = det2(a02)/d;
   a[2][1] = -det2(a12)/d;
   a[2][2] = det2(a22)/d;

   return a;

}

function inverse4(m)
{
    var a = mat4();
    var d = det4(m);

    var a00 = [
       vec3(m[1][1], m[1][2], m[1][3]),
       vec3(m[2][1], m[2][2], m[2][3]),
       vec3(m[3][1], m[3][2], m[3][3])
    ];
    var a01 = [
       vec3(m[1][0], m[1][2], m[1][3]),
       vec3(m[2][0], m[2][2], m[2][3]),
       vec3(m[3][0], m[3][2], m[3][3])
    ];
    var a02 = [
       vec3(m[1][0], m[1][1], m[1][3]),
       vec3(m[2][0], m[2][1], m[2][3]),
       vec3(m[3][0], m[3][1], m[3][3])
    ];
    var a03 = [
       vec3(m[1][0], m[1][1], m[1][2]),
       vec3(m[2][0], m[2][1], m[2][2]),
       vec3(m[3][0], m[3][1], m[3][2])
    ];
    var a10 = [
       vec3(m[0][1], m[0][2], m[0][3]),
       vec3(m[2][1], m[2][2], m[2][3]),
       vec3(m[3][1], m[3][2], m[3][3])
    ];
    var a11 = [
       vec3(m[0][0], m[0][2], m[0][3]),
       vec3(m[2][0], m[2][2], m[2][3]),
       vec3(m[3][0], m[3][2], m[3][3])
    ];
    var a12 = [
       vec3(m[0][0], m[0][1], m[0][3]),
       vec3(m[2][0], m[2][1], m[2][3]),
       vec3(m[3][0], m[3][1], m[3][3])
    ];
    var a13 = [
       vec3(m[0][0], m[0][1], m[0][2]),
       vec3(m[2][0], m[2][1], m[2][2]),
       vec3(m[3][0], m[3][1], m[3][2])
    ];
    var a20 = [
       vec3(m[0][1], m[0][2], m[0][3]),
       vec3(m[1][1], m[1][2], m[1][3]),
       vec3(m[3][1], m[3][2], m[3][3])
    ];
    var a21 = [
       vec3(m[0][0], m[0][2], m[0][3]),
       vec3(m[1][0], m[1][2], m[1][3]),
       vec3(m[3][0], m[3][2], m[3][3])
    ];
    var a22 = [
       vec3(m[0][0], m[0][1], m[0][3]),
       vec3(m[1][0], m[1][1], m[1][3]),
       vec3(m[3][0], m[3][1], m[3][3])
    ];
    var a23 = [
       vec3(m[0][0], m[0][1], m[0][2]),
       vec3(m[1][0], m[1][1], m[1][2]),
       vec3(m[3][0], m[3][1], m[3][2])
    ];

    var a30 = [
       vec3(m[0][1], m[0][2], m[0][3]),
       vec3(m[1][1], m[1][2], m[1][3]),
       vec3(m[2][1], m[2][2], m[2][3])
    ];
    var a31 = [
       vec3(m[0][0], m[0][2], m[0][3]),
       vec3(m[1][0], m[1][2], m[1][3]),
       vec3(m[2][0], m[2][2], m[2][3])
    ];
    var a32 = [
       vec3(m[0][0], m[0][1], m[0][3]),
       vec3(m[1][0], m[1][1], m[1][3]),
       vec3(m[2][0], m[2][1], m[2][3])
    ];
    var a33 = [
       vec3(m[0][0], m[0][1], m[0][2]),
       vec3(m[1][0], m[1][1], m[1][2]),
       vec3(m[2][0], m[2][1], m[2][2])
    ];



   a[0][0] = det3(a00)/d;
   a[0][1] = -det3(a10)/d;
   a[0][2] = det3(a20)/d;
   a[0][3] = -det3(a30)/d;
   a[1][0] = -det3(a01)/d;
   a[1][1] = det3(a11)/d;
   a[1][2] = -det3(a21)/d;
   a[1][3] = det3(a31)/d;
   a[2][0] = det3(a02)/d;
   a[2][1] = -det3(a12)/d;
   a[2][2] = det3(a22)/d;
   a[2][3] = -det3(a32)/d;
   a[3][0] = -det3(a03)/d;
   a[3][1] = det3(a13)/d;
   a[3][2] = -det3(a23)/d;
   a[3][3] = det3(a33)/d;

   return a;
}
function inverse(m)
{
   if(m.matrix != true) console.log("not a matrix");
   if(m.length == 2) return inverse2(m);
   if(m.length == 3) return inverse3(m);
   if(m.length == 4) return inverse4(m);
}

function normalMatrix(m, flag)
{
    var a = mat4();
    a = inverse(transpose(m));
    if(flag != true) return a;
    else {
    var b = mat3();
    for(var i=0;i<3;i++) for(var j=0; j<3; j++) b[i][j] = a[i][j];
    return b;
    }

}
// returns a vec3 color from a hexadecimal string (format '#FFFFFF')
function parseHexColor( colStr )
{
  var fact  = 1.0 / 255;
  var red   = parseInt(colStr.substr(1,2),16) * fact;
  var green = parseInt(colStr.substr(3,2),16) * fact;
  var blue =  parseInt(colStr.substr(5,2),16) * fact;
  return [red, green, blue];
}

// single color to its two-character hex representation
function float2Hex( x ) { var hex = Number(parseInt(x * 255)).toString(16); return (hex.length == 2) ? hex : "0" + hex; }

// inverse of the parseHexColor() function - col is assumed to be vec3 (or vec4 although the 4th comp. is ignored)
function color2Hex( col ) { return "#" + float2Hex(col[0]) + float2Hex(col[1]) + float2Hex(col[2]); }

// return value is the vec3 ( x, y, z ) corresp. to ( radius, theta, phi )
function spherical2cartesian( radius, theta, phi ) { return [ radius * Math.sin(theta) * Math.cos(phi), radius * Math.sin(theta) * Math.sin(phi), radius * Math.cos(theta) ]; }

// available demos
const demos = [ demo_0, demo_1, demo_2 ];

// current demo
var crtDemo = 0;

// mouse rotation
var mouseDown = false, lastMouseX = 0, lastMouseY = 0;  

function handleMouseDown(event)
{
  // store the mouse position
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  // set the 'mouseDown' flag so that we can discern in handleMouseMove()
  // a drag operation from a simple movement
  mouseDown = true;
}

function handleMouseUp(event)
{
  // reset the 'mouseDown' flag
  mouseDown = false;
}

function handleMouseMove(event)
{
  // if not in dragging mode
  if (!mouseDown) return;

  // the new mouse position
  var newMouseX = event.clientX, newMouseY = event.clientY;

  // determine the relative mouse movement
  var deltaX = newMouseX - lastMouseX, deltaY = newMouseY - lastMouseY;

  // is there currently a selected object
  if (selIdx >= 0)
  {
    var obj = objects[selIdx];

    var relRotX = deltaY / 10, relRotY = deltaX / 10; // relative rotation around x-, resp. y-axis
    obj.rotate[0] -= relRotX; obj.rotate[1] += relRotY;
    
    obj_updModelMatrix( obj );
  }

  // record the new position
  lastMouseX = newMouseX; lastMouseY = newMouseY;
}

window.onload = function init()
{
  var canvas = document.getElementById( "gl-canvas" );
  
  gl = WebGLUtils.setupWebGL( canvas );
  if ( !gl ) { alert( "WebGL isn't available" ); }

  gl.viewport( 0, 0, canvas.width, canvas.height );
  aspect = canvas.width / canvas.height;
  
  xformUPel[0] = 1.0 / (canvas.width);
  xformUPel[1] = 1.0 / (canvas.height);
  
  var v = new Float32Array(8);
  v[0] = -1; v[1] = 1; v[2] = -1; v[3] = -1;
  v[4] = 1;  v[5] = 1; v[6] =  1; v[7] = -1;
  compVertices = v;
  
  gl.clearColor( sceneColor[0], sceneColor[1], sceneColor[2], 1.0 );
  
  // enable depth testing (no multipass so gl.LESS should be okay)
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); //gl.depthFunc(gl.LEQUAL);

  comptex_prog  = initShaders( gl, "comptex_vs", "comptex_fs" );
  compVPosLoc   = gl.getAttribLocation( comptex_prog, "vPosition" );
  compParamsLoc = gl.getUniformLocation( comptex_prog, "uParams" );
  compSCorrLoc  = gl.getUniformLocation( comptex_prog, "SCorr" );
  compModeLoc   = gl.getUniformLocation( comptex_prog, "mode" );
  
  xformtex_prog = initShaders( gl, "xformtex_vs", "xformtex_fs" );
  xformVPosLoc  = gl.getAttribLocation( xformtex_prog, "vPosition" );
  xformTex0Loc  = gl.getUniformLocation( xformtex_prog, "Tex0" );
  xformUPelLoc  = gl.getUniformLocation( xformtex_prog, "uPel" );
  
  // create two off-screen framebuffers (the first to compute the image into
  // and the second to compute the spherical mapping of the first image)
  for (var i = 0; i != 2; ++i)
  {
    rttFBO.push( newRTTFramebuffer( 512, 512, false, false ) );
  }

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders( gl, "vertex-shader", "fragment-shader" );
  gl.useProgram( program );

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // create the vertex buffer (vec4 entries)
  vertexBuffer = gl.createBuffer(); gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
  gl.bufferData( gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.DYNAMIC_DRAW);

  // each vertex will get the value of the attribute 'vNormal' from the vertexBuffer
  vPositionLoc = gl.getAttribLocation( program, "vPosition" ); // 4D vertices so 4*4=16 bytes each
  gl.vertexAttribPointer( vPositionLoc, 4, gl.FLOAT, false, 0, 0 ); gl.enableVertexAttribArray( vPositionLoc );
  
  /////////////////////////////////////////////////////////////////////////////////////////////////
  // create the normal buffer (this will store the normal-to-surface vectors) (vec3 entries)
  normalBuffer = gl.createBuffer(); gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
  gl.bufferData( gl.ARRAY_BUFFER, 12 * maxNumVertices, gl.DYNAMIC_DRAW);

  // each vertex will get the value of the attribute 'vNormal' from the normalBuffer
  vNormalLoc = gl.getAttribLocation( program, "vNormal" ); // 3D vertices so 3*4=12 bytes each
  gl.vertexAttribPointer( vNormalLoc, 3, gl.FLOAT, false, 0, 0 ); gl.enableVertexAttribArray( vNormalLoc );

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // create the tangent buffer (vec4 entries)
  tangentBuffer = gl.createBuffer(); gl.bindBuffer( gl.ARRAY_BUFFER, tangentBuffer );
  gl.bufferData( gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.DYNAMIC_DRAW);

  // each vertex will get the value of the attribute 'vTangent' from the tangentBuffer
  vTangentLoc = gl.getAttribLocation( program, "vTangent" ); // 4D vertices so 4*4=16 bytes each
  gl.vertexAttribPointer( vTangentLoc, 4, gl.FLOAT, false, 0, 0 ); gl.enableVertexAttribArray( vTangentLoc );
  
  /////////////////////////////////////////////////////////////////////////////////////////////////
  // create the texture coordinates buffer (this will store 2D texture coords) (vec2 entries)
  texCoordsBuffer = gl.createBuffer(); gl.bindBuffer( gl.ARRAY_BUFFER, texCoordsBuffer );
  gl.bufferData( gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.DYNAMIC_DRAW);
  
  // each vertex will get the value of the attribute 'vTexCoord' from the normalBuffer
  vTexCoordLoc = gl.getAttribLocation( program, "vTexCoord" ); // 2D vertices so 2*4=8 bytes each
  gl.vertexAttribPointer( vTexCoordLoc, 2, gl.FLOAT, false, 0, 0 ); gl.enableVertexAttribArray( vTexCoordLoc );
    
  /////////////////////////////////////////////////////////////////////////////////////////////////
  // array element (index) buffer
  indexBuffer = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 2 * maxNumVertices, gl.DYNAMIC_DRAW);

  // get the uniforms' locations
  modelViewMatrixLoc  = gl.getUniformLocation( program, "modelViewMatrix" );
  projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
  normalsMatrixLoc    = gl.getUniformLocation( program, "normalsMatrix" );

  flagsLoc        = gl.getUniformLocation( program, "flags" );
  solidColorLoc   = gl.getUniformLocation( program, "solidColor" );
  lightPos0Loc    = gl.getUniformLocation( program, "lightPos0" );
  lightAmb0Loc    = gl.getUniformLocation( program, "lightAmb0" );
  lightDiff0Loc   = gl.getUniformLocation( program, "lightDiff0" );
  lightSpec0Loc   = gl.getUniformLocation( program, "lightSpec0" );
  matShininessLoc = gl.getUniformLocation( program, "matShininess" );
  
  // hardcode the sampler uniforms to the first 4 tex units
  gl.uniform1i( gl.getUniformLocation( program, "Tex0"   ), 0 );
  gl.uniform1i( gl.getUniformLocation( program, "EnvTex" ), 1 );
  gl.uniform1i( gl.getUniformLocation( program, "NormMap"), 2 );
  gl.uniform1i( gl.getUniformLocation( program, "SpecMap"), 3 );
  
  // set-up the view and projection matrices
  gbl_updViewMatrix(); gbl_updProjectionMatrix();
  
  canvas.onmousedown   = handleMouseDown;
  document.onmouseup   = handleMouseUp;
  document.onmousemove = handleMouseMove;  

//  const TEX_SIZE = 512, NUM_CHECKS = 16;
//  var img = makeCheckerboxImage( TEX_SIZE, NUM_CHECKS, [0,0,1,1], [1,1,1,1] );
//  img = spherical_correction(img, TEX_SIZE, TEX_SIZE);
//  set2DTexture( makeGLTexture( img, TEX_SIZE, TEX_SIZE ), 0 );

  demos[crtDemo]();
  
  document.getElementById("NextDemo").onclick = function(){ demos[++crtDemo % demos.length]() };  
  document.getElementById("ToggleRot").onclick = function(){ autoRotX = 0.5 - autoRotX; };
  document.getElementById("+Scale").onclick = function(){ radius -= 0.1; gbl_updViewMatrix();};
  document.getElementById("-Scale").onclick = function(){ radius += 0.1; gbl_updViewMatrix();};
  
  tick();
}

// TODO: change to false when deploying on codepen.io
const local = false;

// see here for other textures: https://ktmpower.imgur.com/all/
const URLs = {
  EARTH_TEX:  (local ? 'earthmap1k.jpg'  : 'https://i.imgur.com/n0QcbBy.jpg'),
  EARTH_BUMP: (local ? 'earthbump1k.jpg' : 'https://i.imgur.com/pXfLR6T.jpg'),
  EARTH_NORM: (local ? 'earthnorm1k.jpg' : 'https://i.imgur.com/TFyvAus.jpg'),
  EARTH_SPEC: (local ? 'earthspec1k.jpg' : 'https://i.imgur.com/JPMhdcg.jpg'),
  SKY_ENV   : (local ? 'sky_map.jpg'     : 'https://i.imgur.com/3onoPEj.jpg'),
};

function demo_0()
{
  document.getElementById("demoDesc").innerHTML = "Lighting w/ normal mapping with dynamically generated texture and normal map (render-to-texture)";
  document.getElementById("ToggleRot").hidden = true;
  
  // no rotation for this
  autoRotX = 0;
  
  // clear the object list up-front (so nothing will show up until the new demo is ready)
  objects = [];

  init_sphere_model();

  update_dynamic_texture();
  
  // create a new sphere object
  var obj = createNewObject( OBJ_T.SPHERE, false );
  
  // TODO: rotate it? change other attributes?
  obj.rotate = vec3(170,0,0); obj.shininess = 0.5;
  obj_updModelMatrix( obj );
  
  // set the shader flags to appropriate values for this demo
  TEXTURING   = true;
  LIGHTING    = true;
  NORMMAPPING = true;
  ENVMAPPING  = false;
  SPECMAPPING = false;
  
  // pass the current flags to the shaders
  setFlagsUniforms();
  
  // set the callback to update the model
  updateModel = update_demo_0;
  
  // okay, ready for rendering...
  objects.push( obj );
}

function update_demo_0()
{
//  var obj = objects[0];
//  obj.rotate[1] += 1; if (obj.rotate[1] >= 360) obj.rotate[1] -= 360;
//  obj_updModelMatrix( obj );
  update_dynamic_texture();
}

function demo_1()
{
  document.getElementById("demoDesc").innerHTML = "Lighting, normal and specular mapping with static textures";
  document.getElementById("ToggleRot").hidden = false;

  // this starts with auto rotation
  autoRotX = 0.5;
  
  // clear the object list up-front (so nothing will show up until the new demo is ready)
  objects = [];
  
  // load the needed resources
  loadTextureImage( URLs.EARTH_TEX );
  loadBumpMapImage( URLs.EARTH_BUMP );
  loadSpecMapImage( URLs.EARTH_SPEC );

  init_sphere_model();
 
  // create a new sphere object
  var obj = createNewObject( OBJ_T.SPHERE, false );
  
  // TODO: rotate it? change other attributes?
  obj.rotate = vec3(170,0,0); obj.shininess = 0.5;
  obj_updModelMatrix( obj );
  
  // set the shader flags to appropriate values for this demo
  TEXTURING   = true;
  LIGHTING    = true;
  NORMMAPPING = true;
  ENVMAPPING  = false;
  SPECMAPPING = true; 
  
  // pass the current flags to the shaders
  setFlagsUniforms();
  
  // set the callback to update the model
  updateModel = update_demo_1;
  
  // okay, ready for rendering...
  objects.push( obj );
}

function update_demo_1()
{
  var obj = objects[0];
  obj.rotate[1] += autoRotX; if (obj.rotate[1] >= 360) obj.rotate[1] -= 360;
  obj_updModelMatrix( obj );
}

function demo_2()
{
  document.getElementById("demoDesc").innerHTML = "Lighting, normal, specular and environment mapping with static textures";
  document.getElementById("ToggleRot").hidden = false;

  // this starts with auto rotation
  autoRotX = 0.5;
  
  // clear the object list up-front (so nothing will show up until the new demo is ready)
  objects = [];
  
  // load the needed resources
  loadTextureImage( URLs.EARTH_TEX );
  loadBumpMapImage( URLs.EARTH_BUMP );  
  loadEnvMapImage ( URLs.SKY_ENV    );
  loadSpecMapImage( URLs.EARTH_SPEC );

  init_sphere_model();
  
  // create a new sphere object
  var obj = createNewObject( OBJ_T.SPHERE, false );
  
  // TODO: rotate it? change other attributes?
  obj.rotate = vec3(170,0,0); obj.shininess = 0.5;
  obj_updModelMatrix( obj );
  
  // set the shader flags to appropriate values for this demo
  TEXTURING   = true;
  LIGHTING    = true;
  NORMMAPPING = true;
  ENVMAPPING  = true;
  SPECMAPPING = true; 
  
  // pass the current flags to the shaders
  setFlagsUniforms();
  
  // set the callback to update the model
  updateModel = update_demo_2;
  
  // okay, ready for rendering...
  objects.push( obj );  
}

function update_demo_2()
{
  var obj = objects[0];
  obj.rotate[1] += autoRotX; if (obj.rotate[1] >= 360) obj.rotate[1] -= 360;
  obj_updModelMatrix( obj );
}

// called when either the model matrix was changed (the object was transformed somehow)
// or the view position/angle changed (the view matrix was changed)
function obj_updModelViewMatrix( obj )
{
  // combine the transformations to form the modelViewMatrix for this object
  obj.modelViewMatrix = mult( viewMatrix, obj.modelMatrix );

  // compute the transformation matrix to be applied to the normal vectors
  obj.normalsMatrix = transpose_inverse3( obj.modelViewMatrix );  
}

// updates the model matrix for the current object (from the scale, rotate and translate attributes)
function obj_updModelMatrix ( obj )
{
  // scale by the same factor in all dimensions
  const scaleMatrix     = scale3( obj.scale );
  const rotateMatrix    = rotate3( obj.rotate );
  const translateMatrix = translate3( obj.translate );
  
  obj.modelMatrix = mult( translateMatrix, mult( rotateMatrix, scaleMatrix) );

  // update the matrices dependent on the model matrix
  obj_updModelViewMatrix( obj );  
}

// updates the global ViewMatrix (when the camera position or the 'at', 'up' vectors change)
function gbl_updViewMatrix()
{
  // compute the view matrix (based on the position of the camera, where it looks at and the up vector)
  viewMatrix = lookAt( spherical2cartesian( radius, theta, phi ), at, up );
  
  // go through all objects and update their matrices that are dependent on the view matrix
  for (var obj of objects) obj_updModelViewMatrix( obj );
}

// updates the global ProjectionMatrix (if field-of-view angle or the viewport aspect changes)
function gbl_updProjectionMatrix()
{
  // use perspective projection
  projectionMatrix = perspective ( fovy, aspect, persp_near, persp_far );

  // pass it also to WebGL here
  gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
}

// send the light attributes (the position is 
function setLightingUniforms()
{
  // the light position is converted to view coordinates
  const light0PosView = matXvec3(viewMatrix, light0PosWorld);

  // set the light information to the GPU
  gl.uniform3fv(lightPos0Loc,  flatten(light0PosView));
  gl.uniform3fv(lightAmb0Loc,  flatten(light0AmbCol));
  gl.uniform3fv(lightDiff0Loc, flatten(light0DiffCol));
  gl.uniform3fv(lightSpec0Loc, flatten(light0SpecCol));
}

// used to modify the flags to the WebGL shaders
function setFlagsUniforms()
{
  var flags = new Int32Array( 5 );
  
  flags[0] = TEXTURING;
  flags[1] = LIGHTING;
  flags[2] = NORMMAPPING;
  flags[3] = ENVMAPPING;
  flags[4] = SPECMAPPING; 
  
  gl.uniform1iv(flagsLoc, flags);
}

function loadTextureImage ( image_url, sphere_corr )
{
  var img = new Image(); img.crossOrigin = ''; img.src = image_url;
  img.onload = function() { newTexImageLoaded( img, sphere_corr, false, 0 ); }
}

function loadEnvMapImage ( image_url )
{
  var img = new Image(); img.crossOrigin = ''; img.src = image_url;
  img.onload = function() { newCubemapLoaded( img ); }
}

function loadBumpMapImage ( image_url )
{
  var img = new Image(); img.crossOrigin = ''; img.src = image_url;
  img.onload = function() { newTexImageLoaded( img, false, true, 2 ); }
}

function loadNormalMapImage ( image_url )
{
  var img = new Image(); img.crossOrigin = ''; img.src = image_url;
  img.onload = function() { newTexImageLoaded( img, false, false, 2 ); }
}

function loadSpecMapImage ( image_url )
{
  var img = new Image(); img.crossOrigin = ''; img.src = image_url;
  img.onload = function() { newTexImageLoaded( img, false, false, 3 ); }
}

function newTexImageLoaded ( img, sp_corr, bump2norm, unit )
{
  // create an off-screen canvas object (of the same size as the image)
  var canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  
  // get the handle to its 2d context
  var ctx = canvas.getContext('2d');
  
  // draw the image on the canvas
  ctx.drawImage(img, 0, 0);
  
  // get the image data in RGBA format
  var img_data = new Uint8Array(ctx.getImageData( 0, 0, img.width, img.height ).data.buffer);
  
  // this step is optional (can be used for mapping a regular texture onto a sphere)
  if (sp_corr)
  {
    img_data = spherical_correction( img_data, img.width, img.height );
  }

  // if a bump map image that should be converted to a normal map
  if (bump2norm)
  {
    img_data = normalMapFromBumpMap( img_data, img.width, img.height );
  }
  
  // 'cast' the Uint8ClampedArray returned to a plain Uint8Array needed by the texImage2D() function...
  var texture = makeGLTexture( img_data, img.width, img.height );
  
  // set the input texture as the GL texture 'unit'
  gl.activeTexture( gl.TEXTURE0 + unit );
  gl.bindTexture  ( gl.TEXTURE_2D, texture );
}

// called when an image representing a cubemap texture was loaded
function newCubemapLoaded ( img )
{
  if ( img.width * 3 != img.height * 4 )
  {
    alert('The cube map is not a 4:3 (width : height) format image\n'); return;
  }
  const tex_size = img.width / 4.0;
  if ( !isPowerOf2(tex_size) )
  {
    alert('The size of the cube sides is not a power of 2\n'); return;
  }
  
  // create an off-screen canvas object (of the size of a cube side)
  var canvas = document.createElement('canvas');
  canvas.width = tex_size; canvas.height = tex_size;
  
  // get the handle to its 2d context
  var ctx = canvas.getContext('2d');
  
  // the GL target names for the sides of the cube texture
  const sideName = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, // swap pos-y with neg-y b/c of the UNPACK_FLIP_Y_WEBGL flag used below
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
  ];
  // the position of each cube side inside the big image
  const sideRow = [ 1, 1, 0, 2, 1, 1 ];
  const sideCol = [ 2, 0, 1, 1, 1, 3 ];
  
  // create a GL texture to be used as the cube map texture
  var texture = gl.createTexture();
  
  // set it as the current GL texture for texture unit #1
  gl.activeTexture( gl.TEXTURE1 );
  gl.bindTexture( gl.TEXTURE_CUBE_MAP, texture );
  
  // flip the Y coordinate (top-down to bottom-up) b/c the images usually have the origin
  // in the top-left corner while GL considers it to be the lower-left corner
  gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true ); // TODO: needed in this case ?
  
  // for each side
  for ( var i = 0; i != 6; ++i )
  {
    // draw the side image on the canvas
    ctx.drawImage(img, sideCol[i] * tex_size, sideRow[i] * tex_size,
                  tex_size, tex_size, 0, 0, tex_size, tex_size);
                  
    // get the side data in RGBA format
    var side_data = new Uint8Array(ctx.getImageData( 0, 0, tex_size, tex_size ).data.buffer);

    // upload the data to the corresponding GL cube side
    gl.texImage2D( sideName[i], 0 /*level*/, gl.RGBA, tex_size, tex_size,
                   0 /* border */, gl.RGBA, gl.UNSIGNED_BYTE, side_data );
  }
  
  // generate the mipmap for the cube texture
  gl.generateMipmap( gl.TEXTURE_CUBE_MAP );
  
  // choose a filtering quality (pick the best one in general for now)
  gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER,
                    //gl.NEAREST_MIPMAP_NEAREST); // choose the best mip, then pick one pixel from that mip
                    //gl.LINEAR_MIPMAP_NEAREST ); // choose the best mip, then blend 4 pixels from that mip
                    gl.NEAREST_MIPMAP_LINEAR ); // choose the best 2 mips, choose 1 pixel from each, blend them
                    //gl.LINEAR_MIPMAP_LINEAR  ); // choose the best 2 mips. choose 4 pixels from each, blend them
  gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    
  // no coordinates wrap       
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  // the cube map texture remains bound to texunit #1
//  gl.bindTexture( gl.TEXTURE_CUBE_MAP, null );
}

function tick()
{
  window.requestAnimFrame(tick);
  render_scene();
}

function matXvec3( m, v )
{
  const v0 = v[0], v1 = v[1], v2 = v[2], m0 = m[0], m1 = m[1], m2 = m[2];
  return [ m0[0] * v0 + m0[1] * v1 + m0[2] * v2,
           m1[0] * v0 + m1[1] * v1 + m1[2] * v2,
           m2[0] * v0 + m2[1] * v1 + m2[2] * v2 ];
}

function scale3( sV )
{
    var result = mat4();
    
    result[0][0] = sV[0];
    result[1][1] = sV[1];
    result[2][2] = sV[2];

    return result;
}

function rotate3( rV )
{
  return mult( rotateX(rV[0]), mult( rotateY(rV[1]), rotateZ(rV[2]) ) );
}

function translate3( tV )
{
  var result = mat4();

  result[0][3] = tV[0];
  result[1][3] = tV[1];
  result[2][3] = tV[2];

  return result;
}

// creates a new "object" with the specified type
function createNewObject( obj_type, update )
{
  var obj = {
    type       : obj_type,
    solidColor : [0.2,0.7,0.5],
    shininess  : 0.5,
    scale      : [1,1,1],
    rotate     : [0,0,0],               // in degrees
    translate  : [0,0,0],
  };

  // make sure the object matrices are computed before returning
  if ( update ) obj_updModelMatrix( obj );
  return obj;
}

function render_cube( obj, first )
{
  // optimization: only the first obj in a sequence sends vertex data to the GPU
  if ( first )
  {
    // send the vertex data to the GPU
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, cubeVertices );

    // the normals data
    gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, cubeNormals );

    // the tangent data
    gl.bindBuffer( gl.ARRAY_BUFFER, tangentBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, cubeTangents );
    
    gl.bindBuffer( gl.ARRAY_BUFFER, texCoordsBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, cubeTexCoords );
    
    // and finally the indices  
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
    gl.bufferSubData( gl.ELEMENT_ARRAY_BUFFER, 0, cubeIndices );
  }
 
  // pass the material attributes to the shader code
  gl.uniform3fv(solidColorLoc,   flatten(obj.solidColor));
  gl.uniform1f (matShininessLoc, obj.shininess);

  // draw all the cube triangles with a single drawElements() call
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

// computes the un-normalized normal (vec3) at vertex A (perpendicular on plane formed by A->C and A->B)
// NOTE: the opposite direction is returned if the B and C vertices are swapped
function triangle_normal( A, B, C )
{
  return cross(subtract(C, A), subtract(B, A));
}

// A and B are two points in the same plane with constant y;
// returns the normal/perpedicular to the A->B vector in the same plane (as a vec3)
function const_y_normal( A, B )
{
  if ( !Array.isArray(A) || A.length < 3 || !Array.isArray(B) || B.length < 3 ) {
    throw "const_y_normal(): params must be vec3 or vec4";
  }

  if ( A[1] != B[1] ) {
    throw "const_y_normal(): A and B don't have the same y-coordinate";
  }
  
  // determine the displacement on x- and z- coordinates
  const dx = B[0] - A[0], dz = B[2] - A[2];
  
  // the two (opposite directions) normals to a 2D vector (dx,dy) are
  // (-dy,dx) and (dy,-dx)
  return [-dz, 0, dx];
}

const coneLat  = 8;  // how many vertical slices
const coneLong = 64; // how many divisions around each circle section

function init_cone_model()
{
  // if the model was already initialized, return
  if (coneTangents.length > 0) return;
  
  // top and base center vertices
  const top = vec4(0, 0.5, 0, 1), base_center = vec4(0, -0.5, 0, 1);

  // compute first the base vertices in a temporary array (coneLong + 1 entries)
  var base_vertices = [], base_normals = [], base_texCoords = [];
  for (var lng = 0; lng <= coneLong; ++lng)
  {
    const phi = lng * 2 * Math.PI / coneLong; // 0 <= phi <= 2 * pi
    const x = Math.cos(phi), z = Math.sin(phi);

    // the current vertex
    const p = vec4(x, -0.5, z, 1);
  
    // the two tangents to the cone in this point
    const long_tan = subtract(top, p), lat_tan = const_y_normal(base_center, p);

    // compute the normal to the cone surface as the cross product of the two tangents
    const N = normalize( cross( long_tan, lat_tan ) ); // TODO: need swapping?
  
    base_vertices.push(p);
    base_normals.push(N);
    
    base_texCoords.push(vec2(0.5 + 0.5 * x, 0.5 + 0.5 * z));
  }
  
  // calculate the cone vertices (the intersections of longitude and latitude lines)
  var vertices = [], normals = [], texCoords = [], indices = [];

  // for each section of the code (start at the top and going down the Y coordinate)
  for (var lat = 0; lat <= coneLat; ++lat)
  {
    const rad = lat / coneLat; // factor ranging from 0 to 1 (corresp. to the
                               // radius of circle i.e. of the current code section)
    const y = 0.5 - rad;       // y coordinate will range from 0.5 down to -0.5
    
    for (var lng = 0; lng <= coneLong; ++lng)
    {
      // the current vertex - interpolate from the top vertex to the crt base one
      // using the height ratio as the mix factor
      const p = mix(base_vertices[lng], top, rad);
      
      // the tangent is simply the corresponding one from the base normals
      const N = base_normals[lng];
      
      // add the crt vertex and its normal to the corresp. arrays
      vertices.push(p);
      normals.push(N);
      
      const base_coords = base_texCoords[lng], b0 = base_coords[0] - 0.5, b1 = base_coords[1] - 0.5;
      texCoords.push(vec2(0.5 + rad * b0, 0.5 + rad * b1));
    }
  }
  
  // for each "patch" of the cone surface/hull
  var crtLine = 0, nextLine = coneLong + 1;
  for (var lat = 0; lat != coneLat; ++lat)
  {
    for (var lng = 0; lng != coneLong; ++lng)
    {
      const first = crtLine + lng, second = nextLine + lng;

      // if not degenerated...
      if (lat > 0)
      {
        // vertex indices for the first triangle of the patch
        indices.push(first);
        indices.push(second);
        indices.push(first + 1);
      }

      // same for the second triangle
      indices.push(second);
      indices.push(second + 1);
      indices.push(first + 1);      
    }
    crtLine = nextLine; nextLine += coneLong + 1;
  }

  // this is constant for all the base triangles/vertices
  const base_normal = vec3(0, -1, 0);

  const base_centerCoords = vec2(0.5, 0.5);
  
  // also coneDivs triangles for the cone base (could've been a triangle fan)
  var ind = vertices.length;
  for (var i = 0; i != coneLong; ++i)
  {
    vertices.push( base_center );        normals.push( base_normal ); texCoords.push( base_centerCoords); indices.push(ind++);
    vertices.push( base_vertices[i] );   normals.push( base_normal ); texCoords.push( base_texCoords[i]); indices.push(ind++);
    vertices.push( base_vertices[i+1] ); normals.push( base_normal ); texCoords.push( base_texCoords[i+1]);indices.push(ind++);
  }
  
  // keep only the flattened versions of the arrays
  coneVertices  = flatten(vertices);
  coneNormals   = flatten(normals);
  coneTexCoords = flatten(texCoords);
  coneIndices   = new Uint16Array(indices);
  coneTangents  = calculateTangents( coneVertices, coneNormals, coneTexCoords, coneIndices );
}

function render_cone( obj, first )
{
  // optimization: only the first obj in a sequence sends vertex data to the GPU
  if ( first )
  {
    // send the vertex data to the GPU
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, coneVertices );
    
    // then the normal data
    gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, coneNormals );

    // the tangent data
    gl.bindBuffer( gl.ARRAY_BUFFER, tangentBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, coneTangents );
    
    // and the texture coordinates
    gl.bindBuffer( gl.ARRAY_BUFFER, texCoordsBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, coneTexCoords );
    
    // and finally the indices
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
    gl.bufferSubData( gl.ELEMENT_ARRAY_BUFFER, 0, coneIndices );
  }
  
  // pass the material attributes to the shader code
  gl.uniform3fv(solidColorLoc,   flatten(obj.solidColor));
  gl.uniform1f (matShininessLoc, obj.shininess);

  // draw the triangles for the cone hull + the cone base
  gl.drawElements( gl.TRIANGLES, coneIndices.length/*coneLong * coneLat * 6 + coneLong * 3*/, gl.UNSIGNED_SHORT, 0 );
}

// latitude and longitude divisions (applicable to the cylinder)
const cylLat  = 8;  
const cylLong = 64;

function init_cylinder_model()
{
  // if the model was already initialized, return
  if (cylinderTangents.length > 0) return;
  
  // top and base center vertices
  const top_center = vec4(0, 0.5, 0, 1), base_center = vec4(0, -0.5, 0, 1);

  // compute first the base vertices in a temporary array (coneLong + 1 entries)
  var base_vertices = [], base_normals = [], base_texCoords = [];
  for (var lng = 0; lng <= cylLong; ++lng)
  {
    const phi = lng * 2 * Math.PI / cylLong; // 0 <= phi <= 2 * pi
    const x = Math.cos(phi), z = Math.sin(phi);

    // the current vertex
    const p = vec4(x, -0.5, z, 1);
  
    // the normal is just the vector from the circle origin to this point, normalized
    const N = normalize( vec3 ( subtract (p, base_center) ) );
  
    base_vertices.push(p);
    base_normals.push(N); 
    base_texCoords.push(vec2(0.5 + 0.5 * x, 0.5 + 0.5 * z));
  }

  // generate two sets of vertices, one for the top disc and one for the bottom one
  var vertices = [], normals = [], texCoords = [], indices = [];

  for (var lat = 0; lat <= cylLat; ++lat)
  {
    const y = 0.5 - lat / cylLat; // y in 0.5 down to -0.5
    for (var lng = 0; lng <= cylLong; ++lng)
    {
      const q = base_vertices[lng];
      
      vertices.push( vec4(q[0], y, q[2], 1) );
      normals.push( base_normals[lng] );
      texCoords.push( vec2(Math.PI * lng / cylLong, y + 0.5) );
    }
  }
  
  // generate the indices for the triangles forming the cylinder hull
  var crtLine = 0, nextLine = cylLong + 1;
  for (var lat = 0; lat != cylLat; ++lat)
  {
    for (var lng = 0; lng != cylLong; ++lng)
    {
      const first = crtLine + lng, second = nextLine + lng;
      
      // vertex indices for the first triangle of the patch
      indices.push(first);
      indices.push(second);
      indices.push(first + 1);

      // same for the second triangle
      indices.push(second);
      indices.push(second + 1);
      indices.push(first + 1);      
    }
    crtLine = nextLine; nextLine += cylLong + 1;
  }  
  
  // also coneDivs triangles for the cone base (could've been a triangle fan)
  var ind = vertices.length, line = 0;
  
  const base_centerCoords = vec2(0.5, 0.5);
  for (var y = 0.5; y >= -0.5; y -= 1.0)
  {
    const center = vec4(0, y, 0, 1), normal = vec3(0, 2 * y, 0); // = normalize(vec3(center));
    for (var i = 0; i != cylLong; ++i)
    {
      const j = i + line;
      vertices.push( center );        normals.push( normal ); texCoords.push( base_centerCoords ); indices.push(ind++);
      vertices.push( vertices[j] );   normals.push( normal ); texCoords.push( base_texCoords[i] ); indices.push(ind++);
      vertices.push( vertices[j+1] ); normals.push( normal ); texCoords.push( base_texCoords[i+1] );indices.push(ind++);
    }  
    line = (cylLong + 1) * cylLat; // update line offset for the bottom disc
  }
 
  // keep only the flattened version of the vertex data
  cylinderVertices  = flatten( vertices );
  cylinderNormals   = flatten( normals );
  cylinderTexCoords = flatten( texCoords );
  cylinderIndices   = new Uint16Array (indices);
  cylinderTangents  = calculateTangents( cylinderVertices, cylinderNormals, cylinderTexCoords, cylinderIndices );
}

function render_cylinder( obj, first )
{
  // optimization: only the first obj in a sequence sends vertex data to the GPU
  if ( first )
  {
    // send the vertex data to the GPU
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, cylinderVertices );

    // then the normal data
    gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, cylinderNormals );
    
    // the tangent data
    gl.bindBuffer( gl.ARRAY_BUFFER, tangentBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, cylinderTangents );
    
    // and the texture coordinates
    gl.bindBuffer( gl.ARRAY_BUFFER, texCoordsBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, cylinderTexCoords );

    // and finally the indices  
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
    gl.bufferSubData( gl.ELEMENT_ARRAY_BUFFER, 0, cylinderIndices );
  }
  
  // pass the material attributes to the shader code
  gl.uniform3fv(solidColorLoc,   flatten(obj.solidColor));
  gl.uniform1f (matShininessLoc, obj.shininess);
  
  // draw the triangles for the cylinder hull + the two cylinder bases
  gl.drawElements( gl.TRIANGLES, cylinderIndices.length/*cylLong * (cylLat + 1) * 6*/, gl.UNSIGNED_SHORT, 0 );
}

// maps a (x, y, z) point on the surface of a sphere to a vec2
// (the corresponding texture coordinates) 
function sphere_map( x, y, z )
{
  const invPI = 1.0 / Math.PI;

  const v = Math.acos(y) * invPI;
  const u = Math.acos(x / Math.sin(Math.PI * v)) * 0.5 * invPI;

  return [ ((z > -1.e-10) ? u : (u + 0.5)), v ];
}

//const latBands = 8, longSegs = 16;
const latBands = 24, longSegs = 45;

function init_sphere_model()
{
  // if the model was already initialized, return
  if (sphereTangents.length > 0) return;
  
  var vertices = [], normals = [], texCoords = [], indices = [];
  
  for (var lat = 0; lat <= latBands; ++lat)
  {
    const v     = lat / latBands; // also used as the vertical texture coordinate
    const theta = v * Math.PI;    // 0 <= theta <= pi
    
    const y  = Math.cos(theta);   // y = cos(theta) - constant per latitude "slice"
    const st = Math.sin(theta);   // this will det. the radius of the latitude line
    
    for (var lng = 0; lng <= longSegs; ++lng)
    {
      const u   = lng / longSegs; // also used as the horizontal texture coordinate
      const phi = (lng / longSegs) * 2.0 * Math.PI; // 0 <= phi <= 2 * pi
      
      const x = st * Math.cos(phi); // x = sin(theta) * cos(phi)
      const z = st * Math.sin(phi); // z = sin(theta) * sin(phi)
      
      vertices.push( vec4(x, y, z, 1) );
      
      // the normals are easy for points on the sphere - there exactly the
      // vectors from the sphere centre to the points themselves
      // (with the length normalized to unit)
      normals.push( normalize(vec3(x, y, z)) );
      
      //console.log('lat='+lat+',lng='+lng+' => u='+tc[0]+', v='+tc[1]+'\n');
      texCoords.push( vec2( u, v) );
    }
  }

  // for each "patch" of the sphere surface
  var crtLine = 0, nextLine = longSegs + 1;
  for (var lat = 0; lat < latBands; ++lat)
  {
    for (var lng = 0; lng < longSegs; ++lng)
    {
      const first = crtLine + lng, second = nextLine + lng;
      
      // watch out for degenerate triangles
      if (lat > 0)
      {
        // vertex indices for the first triangle of the patch
        indices.push(first);
        indices.push(second);
        indices.push(first + 1);
      }

      // watch out for degenerate triangles
      if (lat + 1 < latBands)
      {
        // same for the second triangle
        indices.push(second);
        indices.push(second + 1);
        indices.push(first + 1);
      }      
    }
    crtLine = nextLine; nextLine += longSegs + 1;
  }

  // keep only the flattened version of the vertex data
  sphereVertices  = flatten( vertices ); 
  sphereNormals   = flatten( normals );
  sphereTexCoords = flatten( texCoords ); 
  sphereIndices   = new Uint16Array ( indices );  
  sphereTangents  = calculateTangents( sphereVertices, sphereNormals, sphereTexCoords, sphereIndices );
}

function render_sphere( obj, first )
{
  // optimization: only the first obj in a sequence sends vertex data to the GPU
  if ( first )
  {
    // send the vertex data to the GPU
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, sphereVertices );
    
    // then the normal data
    gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, sphereNormals );

    // the tangent data
    gl.bindBuffer( gl.ARRAY_BUFFER, tangentBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, sphereTangents );
    
    // then the texture coordinates
    gl.bindBuffer( gl.ARRAY_BUFFER, texCoordsBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, sphereTexCoords );
    
    // and finally the indices
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
    gl.bufferSubData( gl.ELEMENT_ARRAY_BUFFER, 0, sphereIndices );
  }
  
  // pass the material attributes to the shader code
  gl.uniform3fv(solidColorLoc,   flatten(obj.solidColor));
  gl.uniform1f (matShininessLoc, obj.shininess);
  
  // draw the solid triangles
  gl.drawElements( gl.TRIANGLES, sphereIndices.length/*latBands * longSegs * 6*/, gl.UNSIGNED_SHORT, 0 );
}

// computes the normal matrix from the model view one
// (transpose of the inverse of the 3x3 top-left submatrix)
function transpose_inverse3( m )
{
  // the input should be at least a 3x3 matrix
  // (if larger, only the 3x3 top-left elements are used)
  if ( !m.matrix || m.length < 3 || m[0].length < 3)
    return "inverse3(): input is not (at least) a 3x3 matrix";

  const m0 = m[0], m00 = m0[0], m01 = m0[1], m02 = m0[2];
  const m1 = m[1], m10 = m1[0], m11 = m1[1], m12 = m1[2];
  const m2 = m[2], m20 = m2[0], m21 = m2[1], m22 = m2[2];
  
  // compute its determinant
  const det = m00 * (m11 * m22 - m12 * m21) -
              m01 * (m10 * m22 - m12 * m20) +
              m02 * (m10 * m21 - m11 * m20);
  if (!det) return "singular input matrix";
  
  // the reciprocal of the determinant value
  const f = 1.0 / det;

  // then the transpose inverse matrix 
  var m = [
    [(m11 * m22 - m12 * m21) * f, (m12 * m20 - m10 * m22) * f, (m10 * m21 - m11 * m20) * f ],
    [(m02 * m21 - m01 * m22) * f, (m00 * m22 - m02 * m20) * f, (m01 * m20 - m00 * m21) * f ],
    [(m01 * m12 - m02 * m11) * f, (m02 * m10 - m00 * m12) * f, (m00 * m11 - m01 * m10) * f ]   
  ];
 
  m.matrix = true;
  return m;
}

function render_sequence( sequence, render_fn )
{
  // start with the 'first' flag set
  var first = true;

  // for each of the objects in the sequence
  for (var o of sequence)
  {
    // send the model view matrix to the GPU
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten( o.modelViewMatrix ) );

    // also send the normal matrix
    gl.uniformMatrix3fv( normalsMatrixLoc, false, flatten( o.normalsMatrix ) );
    
    // then let the object draw itself (depending on its type)
    render_fn( o, first );
    
    // reset the 'first' flag
    first = false;
  }
}

// object rendering functions
var render_fns = [ render_cube, render_cone, render_cylinder, render_sphere ];

function render_scene()
{
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

  // make sure the light is set-up ok (not the best thing to do but an acceptable
  // compromise that allows for a changeable view position)
  setLightingUniforms();
  
  // separate the different types of objects based on their type
  // (this could be done when adding/creating the items but anyway...)
  var sequences = [ [], [], [], [] ];

  // put each of the scene objects in the corresponding bin
  for (var o of objects) sequences[o.type].push( o );
  
  // then render the sequences
  for (var t = OBJ_T.CUBE; t <= OBJ_T.SPHERE; ++t)
  {
    render_sequence( sequences[t], render_fns[t] );
  }
  
  // call the current function that will update the model to render
  updateModel();
}

function isPowerOf2(value) { return (value & (value - 1)) == 0; }

// bgCol and fgCol are vec4 colors (in floating point normalized format)
function makeCheckerboxImage( texSize, numChecks, bgCol, fgCol )
{
  var img = new Uint8Array(4*texSize*texSize); // square image, each pel is a 32-bit (4x8-bit) RBGA value
  
  const bg0 = bgCol[0]*255, bg1 = bgCol[1]*255, bg2 = bgCol[2]*255, bg3 = bgCol[3]*255;
  const fg0 = fgCol[0]*255, fg1 = fgCol[1]*255, fg2 = fgCol[2]*255, fg3 = fgCol[3]*255;

  const f = numChecks / texSize;
  for (var y = 0, ofs = 0; y != texSize; ++y)
  {
    const odd_check_row = Math.floor(y * f) % 2;
    for (var x = 0; x != texSize; ++x, ofs += 4)
    {
      const odd_check_column = Math.floor(x * f) % 2;
      
      if (odd_check_row ^ odd_check_column)
      {
        img[ofs  ] = bg0;
        img[ofs+1] = bg1;
        img[ofs+2] = bg2;
        img[ofs+3] = bg3;      
      }
      else
      {
        img[ofs  ] = fg0;
        img[ofs+1] = fg1;
        img[ofs+2] = fg2;
        img[ofs+3] = fg3;
      }
    }
  }

  img.width  = texSize;
  img.height = texSize;
  
  // return the array holding the checkerbox image data
  return img;
}

// transforms a regular texture into a direct polar/spherical texture
// (i.e. so that it can be used to texture a sphere using latitude/longitude coordinates)
// hmm... this could be quite easily be done as a GLSL program B-)
function spherical_correction ( src, width, height )
{
  if (!(src instanceof Uint8Array))
    throw "The first parameter is not an Uint8Array";

  // create the array to represent the destination image
  var dst = new Uint8Array(4 * width * height);
  
  const h1 = height - 1, h_mid = 0.5 * h1, inv_h1 = 1.0 / h1;
  const w_mid = (width - 1) * 0.5, stride = 4 * width;
  
  for (var j = 0, line_ofs = 0; j < height; ++j, line_ofs += stride)
  {
    const theta = (j - h_mid) * inv_h1 * Math.PI; // theta is in [-pi/2, pi/2] range
    //const theta = j * inv_h1 * Math.PI;           // theta is in [0, pi] range
    const cos_t = Math.cos(theta);

    for (var i = 0, dofs = line_ofs; i < width; ++i, dofs += 4)
    {
      // sample nearest pel from the source image
      const src_i = Math.round((i - w_mid) * cos_t + w_mid);
      const sofs  = line_ofs + src_i * 4;
      
      // the pels are RGBA => we need to copy 4 bytes from src to dst img
      dst[dofs  ] = src[sofs  ];
      dst[dofs+1] = src[sofs+1];
      dst[dofs+2] = src[sofs+2];
      dst[dofs+3] = src[sofs+3];
    }
  }
  
  return dst;
}

function intensity( img, ofs )
{
  return 0.2989 * img[ofs] + 0.5870 * img[ofs + 1] + 0.1140 * img[ofs + 2];
}

// calculates a normal map from a bump map (the bump map is assumed to be a RGBA
// texture containing a grayscale image i.e. R=G=B values - we don't calculate the
// an intensity value but simply picking one the first component of a pixel to be
// its intensity/bump height)
function normalMapFromBumpMap ( src, width, height )
{
  if (!(src instanceof Uint8Array))
    throw "The first parameter is not an Uint8Array";

  // create the array to represent the destination image
  var dst = new Uint8Array(width * height * 4);
  
  // factor to convert a [0..255] value to a [0,1] one + line stride in bytes
  const f = 4.0/255.0, stride = width * 4;
  
  // for each line of the bump map
  var ofs = 0;
  for (var y = 1; y <= height; ++y)
  {
    const notLastLine = y != height;
    
    // for each pel in the bump map line
    for (var x = 1; x <= width; ++x, ofs += 4)
    {
      // the height of the current pixel and of the next pels in x and y directions
      const h00 = src[ofs];
      const h10 = x != width  ? src[ofs +      4] : h00;
      const h01 = notLastLine ? src[ofs + stride] : h00;
      
      // the un-normalized normal vector (z = 1)
      const nx = (h00 - h10) * f, ny = (h01 - h00) * f;
      
      // normalize factor so that each component value is in [-127,127] range
      const nf127 = 127.0 / Math.sqrt(nx * nx + ny * ny + 1.0);
      
      dst[ofs  ] = nx * nf127 + 128.0;
      dst[ofs+1] = ny * nf127 + 128.0;
      dst[ofs+2] =      nf127 + 128.0;
      dst[ofs+3] = h00; // save the original bump height in the alpha component
//      dst[ofs+3] = 255; // save the original bump height in the alpha component
/*
      const h00 = intensity(src, ofs) * f;
      const h10 = x != width  ? intensity(src, ofs + 4) * f : h00;
      const h01 = notLastLine ? intensity(src, ofs + stride) * f : h00;
      
      const v10 = [1, 0, h10 - h00], v01 = [0, 1, h01 - h00]; 
      
      const N = normalize(cross(v10, v01));
      
      dst[ofs  ] = N[0] * 127.0 + 128.0;
      dst[ofs+1] = N[1] * 127.0 + 128.0;
      dst[ofs+2] = N[2] * 127.0 + 128.0;
      dst[ofs+3] = 255;
*/      
    }
  }
  
  return dst;  
}

// takes a RGBA image as Uint8Array and uses it to create a GL texture
function makeGLTexture( img_data, img_width, img_height )
{
  // use unit #7 for creating new textures (so that we won't unbind useful textures)
  gl.activeTexture( gl.TEXTURE7 );
  
  // create a 2D GL texture
  var texture = gl.createTexture();
  
  // set it as the current GL texture
  gl.bindTexture( gl.TEXTURE_2D, texture );
  
  // flip the Y coordinate (top-down to bottom-up) b/c the images usually have the origin
  // in the top-left corner while GL considers it to be the lower-left corner
  gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );

/*  
  if (!(img_data instanceof Uint8Array))
  {
    // pass the image data to GL (level 0 means the first mipmap - the largest one)
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img_data );
  }
  else
*/
  {
    // pass the image data to GL (level 0 means the first mipmap - the largest one)
    gl.texImage2D( gl.TEXTURE_2D, 0 /*level*/, gl.RGBA, img_width, img_height,
                   0 /* border */, gl.RGBA, gl.UNSIGNED_BYTE, img_data );
  }
  
  // if the image can be mipmapped under WebGL's limitations...
  if ( img_width === img_height && isPowerOf2(img_width) && isPowerOf2(img_height) )
  {
    // do it
    gl.generateMipmap(gl.TEXTURE_2D);
    
    // choose a filtering quality (pick the best one in general for now)
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                      //gl.NEAREST_MIPMAP_NEAREST); // choose the best mip, then pick one pixel from that mip
                      //gl.LINEAR_MIPMAP_NEAREST ); // choose the best mip, then blend 4 pixels from that mip
                      gl.NEAREST_MIPMAP_LINEAR ); // choose the best 2 mips, choose 1 pixel from each, blend them
                      //gl.LINEAR_MIPMAP_LINEAR  ); // choose the best 2 mips. choose 4 pixels from each, blend them
                      
    // wrap texture coordinates 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }
  else
  {
     // WebGL does not support repeating textures with dimensions not powers of 2
     // but can use them in clamp mode
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
     // also no mipmaps for non-powers-of 2 textures, so just set the minification filter to linear
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  // always use bilinear filtering when magnifying
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
  //gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
  
  gl.bindTexture( gl.TEXTURE_2D, null );
  
  // return the texture object
  return texture;
}

/*
generateNormalAndTangent(float3 v1, float3 v2, text2 st1, text2 st2)
	{
		float3 normal = v1.crossProduct(v2);
		
		float coef = 1/ (st1.u * st2.v - st2.u * st1.v);
		float3 tangent;

		tangent.x = coef * ((v1.x * st2.v)  + (v2.x * -st1.v));
		tangent.y = coef * ((v1.y * st2.v)  + (v2.y * -st1.v));
		tangent.z = coef * ((v1.z * st2.v)  + (v2.z * -st1.v));
		
		float3 binormal = normal.crossProduct(tangent);
	}
*/

// adapted from the C++ code from this link: http://www.terathon.com/code/tangent.html
// "The code below generates a four-component tangent T in which the handedness of the local coordinate system
// is stored as ��1 in the w-coordinate. The bitangent vector B is then given by B = (N �� T) �� Tw."
function calculateTangents( vertices, normals, texcoords, indices )
{
  const vertexCount = vertices.length / 4; // the vertices are assumed to be flattened vec4s (i.e. 4 floats per vertex)
  
  // the normals and texcoords must correspond to the vertices (although each has 3, resp. 2 floating-point components)
  if ( normals.length !== vertexCount * 3 || texcoords.length !== vertexCount * 2 || !indices.length || indices.length % 3 != 0.0)
    throw "Something's wrongs with the params but I have no time for more detailed messages... :)";

  var tan1 = new Float32Array( normals.length );
  var tan2 = new Float32Array( normals.length );

  // the indices array specifies the triangles forming the object mesh (3 indices per triangle)
  const numIndices = indices.length; 
  
  // for each triangle (step through indices 3 by 3)
  for (var i = 0; i < numIndices; i += 3)
  {
    const i1 = indices[i], i2 = indices[i + 1], i3 = indices[i + 2];
    
    var j = i1 * 4; const v1x = vertices[j], v1y = vertices[j + 1], v1z = vertices[j + 2];
    var j = i2 * 4; const v2x = vertices[j], v2y = vertices[j + 1], v2z = vertices[j + 2];
    var j = i3 * 4; const v3x = vertices[j], v3y = vertices[j + 1], v3z = vertices[j + 2];
     
    const x1 = v2x - v1x, x2 = v3x - v1x;
    const y1 = v2y - v1y, y2 = v3y - v1y;
    const z1 = v2z - v1z, z2 = v3z - v1z;
    
    var j = i1 * 2; const w1x = texcoords[j], w1y = texcoords[j + 1];
    var j = i2 * 2; const w2x = texcoords[j], w2y = texcoords[j + 1];
    var j = i3 * 2; const w3x = texcoords[j], w3y = texcoords[j + 1];
    
    const s1 = w2x - w1x, s2 = w3x - w1x;
    const t1 = w2y - w1y, t2 = w3y - w1y;
      
    const r = 1.0 / (s1 * t2 - s2 * t1);
    
    const sx = (t2 * x1 - t1 * x2) * r, sy = (t2 * y1 - t1 * y2) * r, sz = (t2 * z1 - t1 * z2) * r;
    const tx = (s1 * x2 - s2 * x1) * r, ty = (s1 * y2 - s2 * y1) * r, tz = (s1 * z2 - s2 * z1) * r;

    var j = i1 * 3; tan1[j] += sx; tan1[j + 1] += sy; tan1[j + 2] += sz;
                    tan2[j] += tx; tan2[j + 1] += ty; tan2[j + 2] += tz;
    var j = i2 * 3; tan1[j] += sx; tan1[j + 1] += sy; tan1[j + 2] += sz;
                    tan2[j] += tx; tan2[j + 1] += ty; tan2[j + 2] += tz;
    var j = i3 * 3; tan1[j] += sx; tan1[j + 1] += sy; tan1[j + 2] += sz;
                    tan2[j] += tx; tan2[j + 1] += ty; tan2[j + 2] += tz;
  }
  
  const numVertices = vertices.length;
  var tangents = new Float32Array( numVertices );
    
  for (var i3 = 0, i4 = 0; i4 < numVertices; i3 += 3, i4 += 4)
  {
    // not very efficient here (used the vec3 type and dot/cross operations from MV.js)
    const n  = [ normals[i3], normals[i3 + 1], normals[i3 + 2] ];
    const t1 = [ tan1   [i3], tan1   [i3 + 1], tan1   [i3 + 2] ];
    const t2 = [ tan2   [i3], tan2   [i3 + 1], tan2   [i3 + 2] ];
    
    // Gram-Schmidt orthogonalize
    const tmp  = subtract(t1, scale(dot(n, t1), n));
    const len2 = tmp[0] * tmp[0] + tmp[1] * tmp[1] + tmp[2] * tmp[2];

    // normalize the vector only if non-zero length
    const txyz = (len2 > 0) ? scale(1.0 / Math.sqrt(len2), tmp) : tmp;
   
    // Calculate handedness
    const tw = (dot(cross(n, t1), t2) < 0.0) ? -1.0 : 1.0;

    tangents[i4    ] = txyz[0];
    tangents[i4 + 1] = txyz[1];
    tangents[i4 + 2] = txyz[2];
    tangents[i4 + 3] = tw;
  }
  
  return tangents;
}

// taken from here: http://learningwebgl.com/blog/?p=1786
function newRTTFramebuffer( width, height, depth_buffer, mipmapped )
{
  var rttFramebuffer = gl.createFramebuffer();
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
  rttFramebuffer.width  = width;
  rttFramebuffer.height = height;

  var rttTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, rttTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);  

  if (mipmapped)
  {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  else
  {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);

  if (depth_buffer)
  {
    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, rttFramebuffer.width, rttFramebuffer.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
  }

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
  // return an object containing the two references (to the frame buffer and its texture)
  return { rttFramebuffer: rttFramebuffer, rttTexture : rttTexture };
}

const compLimits = [ [-1,1], [-1,1], [-5, 5], [0, 2*Math.PI] ];
var compParams = new Float32Array(4), compSteps = new Float32Array(4), compInc = new Float32Array(4);

function randVal( min_v, max_v ) { return min_v + (max_v - min_v) * Math.random(); }

function update_comp_tex_params()
{
  for (var i = 0; i != 4; ++i)
  {
    var min_v = compLimits[i][0], max_v = compLimits[i][1];
    if (--compSteps[i] < 0)
    { 
      compSteps[i] = Math.floor(randVal(120, 480));
      compInc[i]   = (max_v - min_v) / randVal(240, 960);
    }
    compParams[i] += compInc[i];
    if (compParams[i] < min_v) { compParams[i] = min_v; compInc[i] = -compInc[i]; }
    if (compParams[i] > max_v) { compParams[i] = max_v; compInc[i] = -compInc[i]; }
  }
}

// will update the dynamic texture using a two-pass off-screen rendering
// (the dynamic texture is bound on unit #0 before returning)
function update_dynamic_texture()
{
  // bind the 1st off-screen framebuffer
  gl.bindFramebuffer( gl.FRAMEBUFFER, rttFBO[0].rttFramebuffer );
  gl.useProgram( comptex_prog );
  
  // put the four extreme points in the vertex buffer
  gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferSubData( gl.ARRAY_BUFFER, 0, compVertices );

  // update the texture generation params for this iteration
  update_comp_tex_params(); gl.uniform4fv( compParamsLoc, compParams );
  
  // enable/disable the spherical texture correction
  gl.uniform1i( compSCorrLoc, true );
  gl.uniform1i( compModeLoc, false );   
  
  // the "vPosition" attributes will be supplied from the vertex buffer
  gl.vertexAttribPointer( compVPosLoc, 2, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( compVPosLoc );
  
  // issue the draw call that will start the computation of the texture
  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
  
  //////////////////////////////////////////////////////////////////////////////////////
  // ok, now switch to the second off-screen framebuffer
  gl.bindFramebuffer( gl.FRAMEBUFFER, rttFBO[1].rttFramebuffer );
  //gl.useProgram( xformtex_prog );

  gl.uniform1i( compModeLoc, true );   
  
  // set the "Tex0" texture from the fragment shader to the previously rendered texture
  //gl.activeTexture( gl.TEXTURE0 ); gl.bindTexture( gl.TEXTURE_2D, rttFBO[0].rttTexture );
  //gl.uniform1i( xformTex0Loc, 0 );
  //gl.uniform2fv( xformUPelLoc, xformUPel );
  
  // the "vPosition" attributes will be supplied from the vertex buffer
  //gl.vertexAttribPointer( xformVPosLoc, 2, gl.FLOAT, false, 0, 0 );
  //gl.enableVertexAttribArray( xformVPosLoc );

  // then issue another drawing call that copy the texture to canvas
  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  // ok, now switch to the canvas framebuffer
  gl.bindFramebuffer( gl.FRAMEBUFFER, null ); gl.useProgram( program );

  // restore the bindings (necessary?)
  gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
  gl.vertexAttribPointer( vPositionLoc, 4, gl.FLOAT, false, 0, 0 ); gl.enableVertexAttribArray( vPositionLoc );
  gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
  gl.vertexAttribPointer( vNormalLoc, 3, gl.FLOAT, false, 0, 0 ); gl.enableVertexAttribArray( vNormalLoc );
  gl.bindBuffer( gl.ARRAY_BUFFER, tangentBuffer );
  gl.vertexAttribPointer( vTangentLoc, 4, gl.FLOAT, false, 0, 0 ); gl.enableVertexAttribArray( vTangentLoc );
  gl.bindBuffer( gl.ARRAY_BUFFER, texCoordsBuffer );
  gl.vertexAttribPointer( vTexCoordLoc, 2, gl.FLOAT, false, 0, 0 ); gl.enableVertexAttribArray( vTexCoordLoc );

  // set the "Tex0" texture from the fragment shader to the previously rendered texture
  gl.activeTexture( gl.TEXTURE0 ); 
  gl.bindTexture( gl.TEXTURE_2D, rttFBO[0].rttTexture );

  gl.activeTexture( gl.TEXTURE2 ); 
  gl.bindTexture( gl.TEXTURE_2D, rttFBO[1].rttTexture );
}
