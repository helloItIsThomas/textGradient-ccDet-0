// ── Pipeline config ──────────────────────────────────────────────────
// Each entry is one render pass. The last pass draws to screen;
// all others render to offscreen framebuffers.
//
// Available keys per pass:
//   frag  (required) — path to the fragment shader file
//   vert  (optional) — path to a vertex shader file (default: fullscreen quad)
//   scale (optional) — FBO resolution multiplier (e.g. 0.5 = half res, default: 1)
//
// Inside any fragment shader you get these uniforms for free:
//   uniform float     u_time;
//   uniform vec2      u_resolution;
//   uniform sampler2D u_pass0, u_pass1, …  (outputs of earlier passes)
//
// You can also call pipeline.setUniform(name, value) at runtime to push
// custom uniforms (float, vec2/3/4, sampler2D from image URL).

// Helper: generates a dual-Kawase blur chain (down then up).
//   iterations — number of downsamples (and upsamples). More = wider blur.
function dualBlur(iterations = 4) {
  const passes = [];
  for (let i = 1; i <= iterations; i++) {
    passes.push({
      frag: "shaders/dualBlurDown.frag",
      scale: 1 / Math.pow(2, i),
    });
  }
  for (let i = iterations - 1; i >= 0; i--) {
    passes.push({
      frag: "shaders/dualBlurUp.frag",
      scale: i === 0 ? 1 : 1 / Math.pow(2, i),
    });
  }
  return passes;
}

const passes = [{ frag: "shaders/shader.frag" }, ...dualBlur(4)];

// ── Custom uniforms ─────────────────────────────────────────────────
// Called once the pipeline is ready. Set any extra uniforms here.
function onReady(pipeline) {
  pipeline.setUniform("u_brightness", 0.15);
  pipeline.setUniform("u_tex", "/assets/helloWorld.png");
  pipeline.setUniform("u_texResW", 2198.0);
  pipeline.setUniform("u_texResH", 1537.0);
  pipeline.setUniform("u_texRes", [2198.0, 1537.0]);
}

// ─────────────────────────────────────────────────────────────────────
// Engine — you shouldn't need to touch anything below here.
// ─────────────────────────────────────────────────────────────────────

const DEFAULT_VERT = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fetch a shader source file, returning its text.
async function fetchShader(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load shader: ${url}`);
  return res.text();
}

// Load an image from a URL, returning {texture, width, height}.
function loadTexture(gl, url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      resolve({
        texture: tex,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`Shader compile error:\n${log}`);
  }
  return s;
}

function createProgram(gl, vertSrc, fragSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "a_position");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link error:\n${log}`);
  }
  return prog;
}

function createFBO(gl, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { fbo, texture: tex, width, height };
}

function resizeFBO(gl, fboObj, width, height) {
  fboObj.width = width;
  fboObj.height = height;
  gl.bindTexture(gl.TEXTURE_2D, fboObj.texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
}

// ── Pipeline ─────────────────────────────────────────────────────────

class Pipeline {
  constructor(canvas, gl, compiledPasses, quadVAO) {
    this._canvas = canvas;
    this._gl = gl;
    this._passes = compiledPasses; // [{ program, fbo|null }]
    this._quadVAO = quadVAO;
    this._startTime = performance.now();
    this._uniforms = {}; // name → { type, value, texture? }
    this._textureCache = {}; // url → {texture, width, height}
    this._nextTexUnit = 0; // assigned per-frame
  }

  // Public: set a custom uniform.
  //   float:    setUniform("u_foo", 1.5)
  //   vec2:     setUniform("u_foo", [1, 2])
  //   vec3:     setUniform("u_foo", [1, 2, 3])
  //   vec4:     setUniform("u_foo", [1, 2, 3, 4])
  //   texture:  setUniform("u_foo", "/path/to/image.jpg")
  setUniform(name, value) {
    if (typeof value === "string") {
      // treat as image URL — load async, store when ready
      this._uniforms[name] = { type: "sampler2D", value: null, loading: true };
      loadTexture(this._gl, value).then((res) => {
        this._uniforms[name] = {
          type: "sampler2D",
          value: res.texture,
          width: res.width,
          height: res.height,
        };
        this._textureCache[value] = res;
      });
    } else if (Array.isArray(value)) {
      const t = ["", "", "vec2", "vec3", "vec4"][value.length] || "vec4";
      this._uniforms[name] = { type: t, value };
    } else {
      this._uniforms[name] = { type: "float", value };
    }
  }

  _resize() {
    const gl = this._gl;
    const c = this._canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
      for (const p of this._passes) {
        if (p.fbo) {
          const sw = Math.max(1, Math.round(w * p.scale));
          const sh = Math.max(1, Math.round(h * p.scale));
          resizeFBO(gl, p.fbo, sw, sh);
        }
      }
    }
  }

  _bindBuiltins(program, time, passWidth, passHeight) {
    const gl = this._gl;
    const tLoc = gl.getUniformLocation(program, "u_time");
    if (tLoc) gl.uniform1f(tLoc, time);
    const rLoc = gl.getUniformLocation(program, "u_resolution");
    if (rLoc) gl.uniform2f(rLoc, passWidth, passHeight);
  }

  _bindCustomUniforms(program) {
    const gl = this._gl;
    for (const [name, u] of Object.entries(this._uniforms)) {
      const loc = gl.getUniformLocation(program, name);
      if (!loc) continue;
      switch (u.type) {
        case "float":
          gl.uniform1f(loc, u.value);
          break;
        case "vec2":
          gl.uniform2fv(loc, u.value);
          break;
        case "vec3":
          gl.uniform3fv(loc, u.value);
          break;
        case "vec4":
          gl.uniform4fv(loc, u.value);
          break;
        case "sampler2D":
          if (!u.value) break; // still loading
          {
            const unit = this._nextTexUnit++;
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, u.value);
            gl.uniform1i(loc, unit);
          }
          break;
      }
    }
  }

  _bindPerPassUniforms(program, uniforms) {
    const gl = this._gl;
    for (const [name, value] of Object.entries(uniforms)) {
      const loc = gl.getUniformLocation(program, name);
      if (!loc) continue;
      if (Array.isArray(value)) {
        if (value.length === 2) gl.uniform2fv(loc, value);
        else if (value.length === 3) gl.uniform3fv(loc, value);
        else if (value.length === 4) gl.uniform4fv(loc, value);
      } else {
        gl.uniform1f(loc, value);
      }
    }
  }

  _bindPassTextures(program, passIndex) {
    const gl = this._gl;
    for (let i = 0; i < passIndex; i++) {
      const loc = gl.getUniformLocation(program, `u_pass${i}`);
      if (!loc) continue;
      const unit = this._nextTexUnit++;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, this._passes[i].fbo.texture);
      gl.uniform1i(loc, unit);
    }
    // u_input — always the immediately preceding pass's output
    if (passIndex > 0) {
      const loc = gl.getUniformLocation(program, "u_input");
      if (loc) {
        const unit = this._nextTexUnit++;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this._passes[passIndex - 1].fbo.texture);
        gl.uniform1i(loc, unit);
      }
    }
  }

  _frame = () => {
    const gl = this._gl;
    this._resize();
    const time = (performance.now() - this._startTime) / 1000;

    for (let i = 0; i < this._passes.length; i++) {
      const pass = this._passes[i];
      const isLast = i === this._passes.length - 1;

      this._nextTexUnit = 0;
      gl.useProgram(pass.program);

      // bind target — use pass FBO dimensions or canvas for final pass
      let passW, passH;
      if (isLast) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        passW = this._canvas.width;
        passH = this._canvas.height;
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, pass.fbo.fbo);
        passW = pass.fbo.width;
        passH = pass.fbo.height;
      }
      gl.viewport(0, 0, passW, passH);

      this._bindBuiltins(pass.program, time, passW, passH);
      this._bindCustomUniforms(pass.program);
      this._bindPerPassUniforms(pass.program, pass.uniforms);
      this._bindPassTextures(pass.program, i);

      gl.bindVertexArray(this._quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    requestAnimationFrame(this._frame);
  };

  start() {
    requestAnimationFrame(this._frame);
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("glslCanvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL2 not supported");
    return;
  }

  // Fullscreen quad geometry
  const quadVerts = new Float32Array([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ]);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // Build passes
  const compiledPasses = [];
  for (let i = 0; i < passes.length; i++) {
    const cfg = passes[i];
    const fragSrc = await fetchShader(cfg.frag);
    const vertSrc = cfg.vert ? await fetchShader(cfg.vert) : DEFAULT_VERT;
    const program = createProgram(gl, vertSrc, fragSrc);
    const isLast = i === passes.length - 1;
    const scale = cfg.scale || 1;
    const fboW = Math.max(1, Math.round((canvas.width || 1) * scale));
    const fboH = Math.max(1, Math.round((canvas.height || 1) * scale));
    const fbo = isLast ? null : createFBO(gl, fboW, fboH);
    compiledPasses.push({ program, fbo, scale, uniforms: cfg.uniforms || {} });
  }

  const pipeline = new Pipeline(canvas, gl, compiledPasses, vao);
  onReady(pipeline);
  pipeline.start();
});
