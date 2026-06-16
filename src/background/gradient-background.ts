const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 uv = vec2(
      gl_FragCoord.x / u_resolution.x,
      1.0 - (gl_FragCoord.y / u_resolution.y)
    );

    vec2 mouse = u_mouse;
    float mouseX = mouse.x - 0.5;
    float mouseY = mouse.y - 0.5;

    float edgeFalloffX = 1.0 - smoothstep(0.35, 0.5, abs(mouseX));
    float edgeFalloffY = 1.0 - smoothstep(0.35, 0.5, abs(mouseY));
    float edgeFalloff = min(edgeFalloffX, edgeFalloffY);

    mouseX *= edgeFalloff;
    mouseY *= edgeFalloff;

    float smoothMouseX = smoothstep(-0.5, 0.5, mouseX * 2.0 + 0.5) - 0.5;
    float smoothMouseY = smoothstep(-0.5, 0.5, mouseY * 2.0 + 0.5) - 0.5;

    mouseX = mix(mouseX, smoothMouseX, 0.7);
    mouseY = mix(mouseY, smoothMouseY, 0.7);
    mouseX = mix(mouseX, 0.0, 0.1);
    mouseY = mix(mouseY, 0.0, 0.1);
    mouseX = clamp(mouseX, -0.4, 0.4);
    mouseY = clamp(mouseY, -0.4, 0.4);

    float speedX = clamp(0.03 + mouseX * 0.04, 0.02, 0.08);
    float speedY = clamp(0.04 + mouseY * 0.04, 0.02, 0.08);

    float noise1 = noise(uv * 0.3 + vec2(u_time * speedX, u_time * speedY)) - 0.5;
    float noise2 = noise(uv * 0.4 + vec2(u_time * (speedX * 1.1), u_time * (speedY * 0.9))) - 0.5;
    float noise3 = noise(uv * 0.2 + vec2(u_time * (speedX * 0.7), u_time * (speedY * 1.2))) - 0.5;

    float mouseDistance = length(vec2(mouseX, mouseY));
    float smoothedDistance = smoothstep(0.0, 0.4, mouseDistance) * edgeFalloff;
    float movementIntensity = 0.04 + smoothedDistance * 0.03;

    float horizontalInfluence = 1.0 + mouseX * 0.15 * edgeFalloff;
    float verticalInfluence = 1.0 + mouseY * 0.15 * edgeFalloff;

    vec2 randomOffset = vec2(
      (noise1 * 0.4 + noise2 * 0.3 + noise3 * 0.2) * movementIntensity * horizontalInfluence,
      (noise2 * 0.4 + noise3 * 0.3 + noise1 * 0.2) * movementIntensity * verticalInfluence
    );

    vec2 mouseDirection = vec2(mouseX * 3.0, mouseY * 3.0);

    float wave1 = sin(u_time * 0.6 + uv.x * 2.0 + uv.y * 1.5 + mouseDirection.x * 2.0 + mouseDirection.y * 1.5) * 0.03;
    float wave2 = sin(u_time * 0.5 + uv.x * 1.3 + uv.y * 2.2 + mouseDirection.x * 1.8 + mouseDirection.y * 2.0) * 0.025;
    float wave3 = cos(u_time * 0.7 + uv.x * 2.5 + uv.y * 1.8 + mouseDirection.x * 2.2 + mouseDirection.y * 1.5) * 0.02;

    vec2 mouseWaveOffset = mouseDirection * 0.05;
    vec2 waveOffset = vec2(wave1 + wave2, wave2 + wave3) + mouseWaveOffset;

    vec2 pos = uv + randomOffset + waveOffset;

    vec2 mouseFromCenter = mouse - vec2(0.5, 0.5);
    vec2 gradientDir = normalize(length(mouseFromCenter) > 0.01 ? mouseFromCenter : vec2(0.5, 0.5));

    vec2 centeredPos = pos - vec2(0.5, 0.5);
    float gradientPos = dot(centeredPos, gradientDir) * 0.707 + 0.5;

    float gradientNoiseSpeed = clamp(0.08 + smoothedDistance * 0.05, 0.06, 0.12);
    float gradientNoise = noise(uv * 0.3 + u_time * gradientNoiseSpeed) * 0.008;
    gradientPos += gradientNoise;

    float pulse = sin(u_time * 0.4) * 0.15;
    gradientPos += pulse;
    gradientPos = clamp(gradientPos, 0.0, 1.0);

    // World Cup green palette
    vec3 color1 = vec3(0.157, 0.365, 0.275); // #285d46
    vec3 color2 = vec3(0.220, 0.510, 0.376); // #388260
    vec3 color3 = vec3(0.118, 0.294, 0.216); // #1e4b37
    vec3 color4 = vec3(0.059, 0.102, 0.086); // #0f1a16
    vec3 color5 = vec3(0.012, 0.020, 0.016); // #030504

    vec3 color;
    if (gradientPos < 0.17354) {
      float t = gradientPos / 0.17354;
      color = mix(color1, color2, t);
    } else if (gradientPos < 0.35425) {
      float t = (gradientPos - 0.17354) / (0.35425 - 0.17354);
      color = mix(color2, color3, t);
    } else if (gradientPos < 0.51586) {
      float t = (gradientPos - 0.35425) / (0.51586 - 0.35425);
      color = mix(color3, color3, t);
    } else if (gradientPos < 0.76087) {
      float t = (gradientPos - 0.51586) / (0.76087 - 0.51586);
      color = mix(color3, color4, t);
    } else if (gradientPos < 0.94158) {
      float t = (gradientPos - 0.76087) / (0.94158 - 0.76087);
      color = mix(color4, color5, t);
    } else {
      color = color5;
    }

    float colorSpeed = clamp(0.05 + smoothedDistance * 0.03, 0.04, 0.08);
    float colorNoise = noise(uv * 0.2 + u_time * colorSpeed) * 0.005;
    color.r += colorNoise * 0.01 * (1.0 + mouseX * 0.1 * edgeFalloff);
    color.g += colorNoise * 0.012 * (1.0 + mouseY * 0.1 * edgeFalloff);

    vec2 center = vec2(0.5, 0.5);
    float dist = length(uv - center);
    float vignetteIntensity = 0.08 + smoothedDistance * 0.01 * edgeFalloff;
    float vignette = 1.0 - smoothstep(0.4, 1.2, dist) * vignetteIntensity;
    color *= vignette;

    color = pow(color, vec3(0.98));

    float brightnessPulse = 1.0 + sin(u_time * 0.5) * 0.08;
    color *= brightnessPulse;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function initGradientBackground(): void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.id = 'gradient-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
  if (!gl || !(gl instanceof WebGLRenderingContext)) {
    canvas.remove();
    document.body.classList.add('has-static-background');
    return;
  }

  const bg = new GradientBackground(gl, canvas, !reducedMotion);
  bg.start();
}

class GradientBackground {
  private mouseX = 0.5;
  private mouseY = 0.5;
  private targetMouseX = 0.5;
  private targetMouseY = 0.5;
  private mouseVelocityX = 0;
  private mouseVelocityY = 0;
  private time = 0;
  private lastFrameTime = performance.now();
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private positionLocation = -1;
  private timeLocation: WebGLUniformLocation | null = null;
  private resolutionLocation: WebGLUniformLocation | null = null;
  private mouseLocation: WebGLUniformLocation | null = null;
  private rafId = 0;
  private readonly mouseSmoothness = 0.003;
  private readonly animateEnabled: boolean;

  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly canvas: HTMLCanvasElement,
    animateEnabled: boolean,
  ) {
    this.animateEnabled = animateEnabled;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    document.addEventListener('mousemove', (e) => {
      const newX = e.clientX / window.innerWidth;
      const newY = e.clientY / window.innerHeight;
      this.mouseVelocityX = (newX - this.targetMouseX) * 0.5;
      this.mouseVelocityY = (newY - this.targetMouseY) * 0.5;
      this.targetMouseX = newX;
      this.targetMouseY = newY;
    });

    this.initShader();
  }

  start(): void {
    if (!this.program) return;
    if (this.animateEnabled) {
      this.animate();
    } else {
      this.renderFrame();
    }
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private initShader(): void {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = this.gl.createProgram();
    if (!program) return;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      this.gl.deleteProgram(program);
      return;
    }

    this.program = program;

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    this.positionLocation = this.gl.getAttribLocation(program, 'a_position');
    this.timeLocation = this.gl.getUniformLocation(program, 'u_time');
    this.resolutionLocation = this.gl.getUniformLocation(program, 'u_resolution');
    this.mouseLocation = this.gl.getUniformLocation(program, 'u_mouse');

    this.gl.clearColor(0.012, 0.02, 0.016, 1);
    this.gl.disable(this.gl.DEPTH_TEST);
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private renderFrame(): void {
    if (!this.program || !this.positionBuffer) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.033);
    this.lastFrameTime = now;
    this.time += deltaTime;

    const deltaX = this.targetMouseX - this.mouseX;
    const deltaY = this.targetMouseY - this.mouseY;
    const damping = 0.92;
    this.mouseVelocityX = this.mouseVelocityX * damping + deltaX * (1 - damping);
    this.mouseVelocityY = this.mouseVelocityY * damping + deltaY * (1 - damping);

    const smoothFactor = 1 - Math.pow(1 - this.mouseSmoothness, deltaTime * 60);
    this.mouseX += deltaX * smoothFactor;
    this.mouseY += deltaY * smoothFactor;
    this.mouseX = Math.max(0, Math.min(1, this.mouseX));
    this.mouseY = Math.max(0, Math.min(1, this.mouseY));

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.uniform1f(this.timeLocation, this.time);
    this.gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.mouseLocation, this.mouseX, this.mouseY);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  private animate = (): void => {
    this.renderFrame();
    this.rafId = requestAnimationFrame(this.animate);
  };
}
