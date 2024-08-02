document.addEventListener("DOMContentLoaded", function () {
  const c = document.getElementById("glslCanvas");
  var sandbox = new GlslCanvas(c);

  fetch("shaders/shader.frag")
    .then((response) => response.text())
    .then((data) => {
      sandbox.load(data);
      sandbox.setUniform("u_brightness", 0.15);
    })
    .catch((error) => console.error("Error loading shader:", error));
});
