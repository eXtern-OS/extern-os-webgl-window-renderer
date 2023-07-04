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

function setupCanvas(canvas, options) {
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
    var fragmentShaderSource = [
    "precision highp float;",
    "varying lowp vec2 vTextureCoord;",
    "uniform sampler2D YTexture;",
    "uniform sampler2D UTexture;",
    "uniform sampler2D VTexture;",
    "const mat4 YUV2RGB = mat4",
    "(",
    " 1.1643828125, 0, 1.59602734375, -.87078515625,",
    " 1.1643828125, -.39176171875, -.81296875, .52959375,",
    " 1.1643828125, 2.017234375, 0, -1.081390625,",
    " 0, 0, 0, 1",
    ");",
    "const float threshold = 0.2;", // Adjust the threshold value as needed
    "const float targetAlpha = 0.7;", // Adjust the target alpha value as needed
    "void main(void) {",
    " vec4 yuvColor = vec4( texture2D(YTexture, vTextureCoord).x, texture2D(UTexture, vTextureCoord).x, texture2D(VTexture, vTextureCoord).x, 1);",
    " vec4 rgbColor = yuvColor * YUV2RGB;",
    " float colorDistance = length(rgbColor.rgb - vec3(0, 0, 0));",
    " if (colorDistance < threshold) {",
    "   //gl_FragColor = vec4(rgbColor.rgb, targetAlpha);", // Set the target alpha value for colors close to black
    "   gl_FragColor = rgbColor;",
    " } else {",
    "   gl_FragColor = rgbColor;",
    " }",
    "}"
].join("\n");



    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
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

function renderFrame(gl, windowRenderFrame, width, height, uOffset, vOffset) {
    gl.y.fill(width, height,
        windowRenderFrame.subarray(0, uOffset));
    gl.u.fill(width >> 1, height >> 1,
        windowRenderFrame.subarray(uOffset, vOffset));
    gl.v.fill(width >> 1, height >> 1,
        windowRenderFrame.subarray(vOffset, windowRenderFrame.length));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
    setupCanvas: function(canvas, options) {
        if (!canvas)
            return;

        if (typeof canvas === 'string')
            canvas = window.document.querySelector(canvas);

        if (!options) {
            options = {
                preserveDrawingBuffer: false
            };
        }

        var glContext = setupCanvas(canvas, options);
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

        return renderContext;
    }
};
