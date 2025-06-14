document.addEventListener("DOMContentLoaded", function () {
  const c = document.getElementById("glslCanvas");
  var sandbox = new GlslCanvas(c);
  c.width = window.innerWidth;
  c.height = window.innerHeight;

  fetch("shaders/shader.frag")
    .then((response) => response.text())
    .then((data) => {
      sandbox.load(data);
      sandbox.setUniform("u_brightness", 0.15);
      sandbox.setUniform("u_tex", "/assets/iceland-ice-2.jpg");
      sandbox.setUniform("u_texRes", [2198.0, 1537.0]);
      sandbox.setUniform("u_texResW", 2198.0);
      sandbox.setUniform("u_texResH", 1537.0);
    })
    .catch((error) => console.error("Error loading shader:", error));
});
