let sampleColoursInterval;
let raa,rab, rac;
let rba,rbb, rbc;
function Texture(gl) {
    this.gl = gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

Texture.prototype.bind = function(n, program, name) {
    var gl = this.gl;
    gl.activeTexture([gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2][n]);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(program, name), n);
}

Texture.prototype.fill = function(width, height, data) {
    var gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
}

function setupCanvas(canvas, options,fragmentShaderSource) {
    var gl =
        canvas.getContext(
            "webgl",
            { preserveDrawingBuffer: Boolean(options.preserveDrawingBuffer) }
        );

    if (!gl)
        return gl;

    var program = gl.createProgram();
    
    var vertexShaderSource = [
        "attribute highp vec4 aVertexPosition;",
        "attribute vec2 aTextureCoord;",
        "varying highp vec2 vTextureCoord;",
        "void main(void) {",
        " gl_Position = aVertexPosition;",
        " vTextureCoord = aTextureCoord;",
        "}"
    ].join("\n");
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    raa = gl.getUniformLocation(program, 'raa');
    rab = gl.getUniformLocation(program, 'rab');
    rac = gl.getUniformLocation(program, 'rac');

    /*header remover*/
    rba = gl.getUniformLocation(program, 'rba');
    rbb = gl.getUniformLocation(program, 'rbb');
    rbc = gl.getUniformLocation(program, 'rbc');

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log("Shader link failed.");
    }
    var vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);
    var textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);

    var verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0]),
        gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0]),
        gl.STATIC_DRAW);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.y = new Texture(gl);
    gl.u = new Texture(gl);
    gl.v = new Texture(gl);
    gl.y.bind(0, program, "YTexture");
    gl.u.bind(1, program, "UTexture");
    gl.v.bind(2, program, "VTexture");
    

    return gl;
}

function frameSetup(canvas, gl, width, height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

let showPixels = true;

function renderFrame(gl, windowRenderFrame, width, height, uOffset, vOffset) {
    gl.y.fill(width, height,
        windowRenderFrame.subarray(0, uOffset));
    gl.u.fill(width >> 1, height >> 1,
        windowRenderFrame.subarray(uOffset, vOffset));
    gl.v.fill(width >> 1, height >> 1,
        windowRenderFrame.subarray(vOffset, windowRenderFrame.length));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (showPixels) {
        showPixels = false;
        try {
            const pixelPositions = [
                {x: 0,y: 0},
                {x: Math.round(width/4),y: Math.round(height/4)},
                {x: Math.round(width/2),y: Math.round(height/2)},
                {x: Math.round(width/1.5),y: Math.round(height/1.5)},
                {x: Math.round(width),y: 0},
            ]

            const foundRGB = {};

            pixelPositions.forEach(pixel => {
                const x = pixel.x;
                const y = pixel.y;
                const pixels = new Uint8Array(4); // RGBA values will be stored here
                gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                if (!foundRGB[`${pixels[0]}-${pixels[1]}-${pixels[2]}`]) foundRGB[`${pixels[0]}-${pixels[1]}-${pixels[2]}`] = 1;
                else foundRGB[`${pixels[0]}-${pixels[1]}-${pixels[2]}`]++;
            });
              
              // Convert object to array of arrays
              const unsortedArr = Object.entries(foundRGB);
              
              // Sort by keys
              const sortedByKey = unsortedArr.sort((a, b) => a[0].localeCompare(b[0]));
              
              

              if (sortedByKey.length && sortedByKey[sortedByKey.length-1][1] > 1) {
                console.log({sortedByKey});
                  const coloursSplit = sortedByKey[sortedByKey.length-1][0].split("-");

                  gl.uniform1f(raa, Number(coloursSplit[0]).toFixed(1));
                  gl.uniform1f(rab, Number(coloursSplit[1]).toFixed(1));
                  gl.uniform1f(rac, Number(coloursSplit[2]).toFixed(1));
                  
              }


              //For the top bars
              const pixelPositionsB = [
                {x: 0,y: 20},
                {x: Math.round(width/4),y: 20},
                {x: Math.round(width/2),y: 20},
                {x: Math.round(width/1.5),y: 20},
            ]

              const foundRGBB = {};

              pixelPositionsB.forEach(pixel => {
                const x = pixel.x;
                const y = pixel.y;
                const pixels = new Uint8Array(4); // RGBA values will be stored here
                gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                if (!foundRGBB[`${pixels[0]}-${pixels[1]}-${pixels[2]}`]) foundRGBB[`${pixels[0]}-${pixels[1]}-${pixels[2]}`] = 1;
                else foundRGBB[`${pixels[0]}-${pixels[1]}-${pixels[2]}`]++;
            });
              
              // Convert object to array of arrays
              const unsortedArrB = Object.entries(foundRGBB);
              
              // Sort by keys
              const sortedByKeyB = unsortedArrB.sort((a, b) => a[0].localeCompare(b[0]));
              
              

              if (sortedByKeyB.length && sortedByKeyB[sortedByKeyB.length-1][1] > 1) {
                //console.log({sortedByKeyB});
                  const coloursSplit = sortedByKeyB[sortedByKeyB.length-1][0].split("-");

                  gl.uniform1f(rba, Number(coloursSplit[0]).toFixed(1));
                  gl.uniform1f(rbb, Number(coloursSplit[1]).toFixed(1));
                  gl.uniform1f(rbc, Number(coloursSplit[2]).toFixed(1));
                  
              }
              


            
        } catch (e) {
            console.log("eror pixels: ",e)
        }
    }
}

function fillBlack(gl) {
    var arr1 = new Uint8Array(1),
        arr2 = new Uint8Array(1);

    arr1[0] = 0;
    arr2[0] = 128;

    gl.y.fill(1, 1, arr1);
    gl.u.fill(1, 1, arr2);
    gl.v.fill(1, 1, arr2);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

module.exports = {
    setupCanvas: function(canvas, options, fragmentShaderSource) {
        if (!canvas)
            return;

        if (typeof canvas === 'string')
            canvas = window.document.querySelector(canvas);

        if (!options) {
            options = {
                preserveDrawingBuffer: false
            };
        }

        var glContext = setupCanvas(canvas, options, fragmentShaderSource);
        if (!glContext)
            return;

        var renderContext = {
            canvas: canvas,
            gl: glContext,
            render: function(windowRenderFrame, width, height, uOffset, vOffset) {
                if (width != this.canvas.width || height != this.canvas.height)
                    frameSetup(canvas, this.gl, width, height);

                renderFrame(this.gl, windowRenderFrame, width, height, uOffset, vOffset);
            },
            fillBlack: function() {
                fillBlack(this.gl);
            }
        }

        if (sampleColoursInterval) clearInterval(sampleColoursInterval);

        sampleColoursInterval = setInterval(function () {
            showPixels = true;
        }, 5000);

        return renderContext;
    }
};
