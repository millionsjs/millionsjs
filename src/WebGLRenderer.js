const utils = require('./WebGLUtils');
const ChunkBufferManager = require('./WebGLChunkBufferManager');

export default class WebGLRenderer {
    constructor(canvas) {
        this.gl = canvas.getContext("experimental-webgl", {
            premultipliedAlpha: false
        });

        this.prevCanvasWidth = null;
        this.prevCanvasHeight = null;
        this.uniforms = {};
        this.attributes = {};
        this.chunkBufferManager = new ChunkBufferManager(this.gl);

        this._setupWebGL();
    }

    render(chunks, pixelDensity, bgColor, focalPoint, zoom) {
        const gl = this.gl;
        const canvas = gl.canvas;
        this._updateViewport(pixelDensity);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(bgColor.r / 255.0, bgColor.g / 255.0, bgColor.b / 255.0,
                      bgColor.a / 255.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.prog);

        // shader uniforms
        gl.uniform2f(this.uniforms.frameSize, canvas.clientWidth, canvas.clientHeight);
        gl.uniform2f(this.uniforms.focalPoint, focalPoint.x, focalPoint.y);
        gl.uniform1f(this.uniforms.zoom, zoom);
        gl.uniform1f(this.uniforms.pixelDensity, pixelDensity);

        for (let i = 0; i < chunks.length; ++i) {
            let chunk = chunks[i];
            this._renderChunk(chunk, chunks.slice(i + 1));
        }

        gl.useProgram(null);
    }

    _setupWebGL() {
        const gl = this.gl;

        // shader, attribute and uniform locations
        this.prog = utils.loadProgram(this.gl, require('raw!./shader.vs'),
                                      require('raw!./shader.fs'));

        ['pos', 'linePos', 'color', 'radius'].forEach((name) => {
            this.attributes[name] = gl.getAttribLocation(this.prog, name);
        });

        ['frameSize', 'focalPoint', 'zoom', 'pixelDensity'].forEach((name) => {
            this.uniforms[name] = gl.getUniformLocation(this.prog, name);
        });

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    _updateViewport(pixelDensity) {
        const canvas = this.gl.canvas;

        if (this.prevCanvasWidth != Math.round(canvas.clientWidth * pixelDensity) ||
            this.prevCanvasHeight != Math.round(canvas.clientHeight * pixelDensity))
        {
            this.prevCanvasWidth = Math.round(canvas.clientWidth * pixelDensity);
            this.prevCanvasHeight = Math.round(canvas.clientHeight * pixelDensity);

            canvas.width = this.prevCanvasWidth;
            canvas.height = this.prevCanvasHeight;
            console.log('canvas resized to', canvas.width, canvas.height);
        }
    }

    _renderChunk(chunk, upcomingChunks) {
        const gl = this.gl;

        const buffer = this.chunkBufferManager.getBufferForChunk(chunk, upcomingChunks);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vbo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.ibo);

        // enable vertex attribs and setup their offsets
        gl.enableVertexAttribArray(this.attributes.pos);
        gl.vertexAttribPointer(this.attributes.pos, 2, gl.FLOAT, false, 24, 0);

        gl.enableVertexAttribArray(this.attributes.linePos);
        gl.vertexAttribPointer(this.attributes.linePos, 2, gl.FLOAT, false, 24, 8);

        gl.enableVertexAttribArray(this.attributes.radius);
        gl.vertexAttribPointer(this.attributes.radius, 1, gl.FLOAT, false, 24, 16);

        gl.enableVertexAttribArray(this.attributes.color);
        gl.vertexAttribPointer(this.attributes.color, 4, gl.UNSIGNED_BYTE, true, 24, 20);

        // and draw
        gl.drawElements(gl.TRIANGLES, buffer.numIndices, gl.UNSIGNED_SHORT, 0);
    }
}