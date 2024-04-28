const chroma = await (await fetch('chroma.frag')).text();

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const debugdiv = document.querySelector('#debug') as HTMLDivElement;

let debug = false;

function resizeCanvas() {
    canvas.setAttribute('width', `${canvas.clientWidth}`);
    canvas.setAttribute('height', `${canvas.clientHeight}`);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
if (!gl) {
    throw new Error('WebGL 2 not supported');
}

const vs = `#version 300 es
in vec4 a_position;
void main() {
  gl_Position = a_position;
}
`;

const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
gl.shaderSource(vertexShader, vs);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vertexShader);
    throw new Error(`Could not compile vertex shader\n\n${info}`);
}

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
gl.shaderSource(fragmentShader, chroma);
gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fragmentShader);
    throw new Error(`Could not compile fragment shader\n\n${info}`);
}

const program = gl.createProgram();
if (!program) {
    throw new Error('Could not create shader program');
}

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.useProgram(null);
    gl.deleteProgram(program);
    throw new Error(`Shader program did not link successfully\n\n${info}`);
}

gl.detachShader(program, vertexShader);
gl.detachShader(program, fragmentShader);
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);

let resLoc = gl.getUniformLocation(program, 'iResolution');
let mouseLoc = gl.getUniformLocation(program, 'iMouse');
let strengthLoc = gl.getUniformLocation(program, 'iFalloff');

var posBuf = gl.createBuffer();
var vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.enableVertexAttribArray(0);
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);

gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
);

gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

gl.useProgram(program);

let posX = 0;
let posY = 0;

let strength = 1.2;

let mX = 0;
let mY = 0;

window.addEventListener('mousemove', (ev) => {
    mX = ev.x;
    mY = window.innerHeight - ev.y;
});

let touchId: number | undefined;
window.addEventListener('touchstart', handleTouch);
window.addEventListener('touchmove', handleTouch);
window.addEventListener('touchend', handleTouch);
function handleTouch(ev: TouchEvent) {
    ev.preventDefault();

    let touch = Array.from(ev.touches).find(
        (touch) => touch.identifier == touchId
    );

    if (typeof touchId == 'undefined' || typeof touch == 'undefined') {
        touch = ev.touches.item(0)!;
        touchId = touch.identifier;
    }

    mX = touch.clientX;
    mY = window.innerHeight - touch.clientY;

    render();
}

let oldW: number = window.innerWidth;
let oldH: number = window.innerHeight;
window.addEventListener('resize', () => {
    let dW = window.innerWidth - oldW;
    let dH = window.innerHeight - oldH;
    mX += dW;
    mY += dH;

    render();

    oldW = window.innerWidth;
    oldH = window.innerHeight;
});

function numFormat(number: number): string {
    if (Number.isNaN(number)) return 'NaN';
    let sign = Math.sign(number);
    let fixed = number.toFixed(2).replace('-', '');
    let formatted = fixed.padStart(6, '0');

    formatted = (sign + 1 ? '+' : '-') + formatted;
    return formatted;
}

function clamp(x: number, lower: number, upper: number) {
    return Math.max(lower, Math.min(x, upper));
}

const speed = 10;
let prevTime = performance.now();
function step(timestamp: number = 0) {
    let ds = (timestamp - prevTime) / 1000;

    let distance = Math.hypot(mX - posX, mY - posY);

    let bearing = Math.atan2(mY - posY, mX - posX) || 0;

    posX += Math.cos(bearing) * distance * clamp(ds * speed, 0, 1);
    posY += Math.sin(bearing) * distance * clamp(ds * speed, 0, 1);

    debugdiv.innerText = `fps: ${Math.round(1 / ds)}
        mouse: (${numFormat(mX)}, ${numFormat(mY)})
        pos: (${numFormat(posX)}, ${numFormat(posY)})
        distance: ${numFormat(distance)}
        bearing: ${numFormat(bearing * (180 / Math.PI))}º`;
    render();

    prevTime = timestamp;
    window.requestAnimationFrame(step);
}

function render() {
    if (!gl) throw new Error('GL context has been lost');
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0, 0, 0, 1);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindVertexArray(vao);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform2f(mouseLoc, posX ?? NaN, posY ?? NaN);
    gl.uniform1f(strengthLoc, strength);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

step();

for (let elem of document.querySelectorAll('.before')) {
    (<HTMLElement>elem).classList.remove('before');
}

let urlStr = '';
window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.shiftKey) return;
    const orig = window.location.origin;
    if (ev.key == 'Escape') {
        ev.preventDefault();
        if (ev.repeat) return;
        debug = !debug;
        debugdiv.hidden = !debug;
        document.body.style.cursor = debug ? 'crosshair' : 'none';
    } else if (ev.key == 'ArrowUp') {
        ev.preventDefault();
        strength += 0.2;
        render();
    } else if (ev.key == 'ArrowDown') {
        ev.preventDefault();
        strength -= 0.2;
        render();
    } else if (/^.$/u.test(ev.key)) {
        ev.preventDefault();
        urlStr += ev.key;
        history.replaceState(null, '', `${orig}/${urlStr}`);
    } else if (ev.key == 'Backspace') {
        ev.preventDefault();
        urlStr = urlStr.slice(0, -1);
        history.replaceState(null, '', `${orig}/${urlStr}`);
    } else if (ev.key == 'Enter') {
        ev.preventDefault();
        if (urlStr.length == 0) return;

        history.replaceState(null, '', `${orig}`);

        // idk man
        if (navigator.userAgent.toLowerCase().includes('firefox')) {
            history.pushState(null, '', `${orig}/${urlStr}`);
            window.location.replace(`${orig}/${urlStr}`);
        } else {
            window.location.href = `${orig}/${urlStr}`;
        }
    }
});

export {};
