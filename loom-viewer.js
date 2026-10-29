/* Просмотрщик 3D-модели ткацкого станка (чистый WebGL, без внешних библиотек).
 *
 * Разметка (см. index.html):
 *   <section class="model-viewer" id="modelViewer" data-model="./models/TkatskiyStanok.glb"> ... </section>
 *
 * Управление:
 *   - вращение: перетаскивание мышью / одним пальцем
 *   - масштаб: колесо мыши / щипок двумя пальцами
 *   - перемещение: правая кнопка мыши (или Shift + перетаскивание) / два пальца
 *   - клик (тап) по станку: открывает карточку с информацией; клик по пустому месту или Esc закрывает
 *   - двойной клик: вернуть исходный вид
 */
(function () {
    'use strict';

    var root = document.getElementById('modelViewer');
    if (!root) return;

    var stage = root.querySelector('.model-viewer__stage');
    var canvas = root.querySelector('.model-viewer__canvas');
    var statusEl = root.querySelector('.model-viewer__status');
    var hintEl = root.querySelector('.model-viewer__hint');
    var infoEl = root.querySelector('.model-info');
    var infoClose = root.querySelector('.model-info__close');
    var modelUrl = root.getAttribute('data-model');

    function setStatus(text) {
        statusEl.textContent = text;
        statusEl.classList.remove('is-hidden');
    }

    /* ---------- WebGL ---------- */
    var glOpts = { antialias: true, alpha: true, premultipliedAlpha: true };
    var gl = canvas.getContext('webgl', glOpts) || canvas.getContext('experimental-webgl', glOpts);
    if (!gl) {
        setStatus('Ваш браузер не поддерживает WebGL, поэтому модель показать не удаётся.');
        return;
    }
    gl.getExtension('OES_element_index_uint');

    /* ---------- математика (матрицы column-major) ---------- */
    function mul(a, b) {
        var o = new Float32Array(16);
        for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
            var s = 0;
            for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
            o[c * 4 + r] = s;
        }
        return o;
    }
    function perspective(fovy, aspect, near, far) {
        var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), o = new Float32Array(16);
        o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf;
        return o;
    }
    function lookAt(e, t, up) {
        var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2], l = Math.hypot(zx, zy, zz);
        zx /= l; zy /= l; zz /= l;
        var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
        l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
        var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
        return new Float32Array([
            xx, yx, zx, 0,  xy, yy, zy, 0,  xz, yz, zz, 0,
            -(xx * e[0] + xy * e[1] + xz * e[2]),
            -(yx * e[0] + yy * e[1] + yz * e[2]),
            -(zx * e[0] + zy * e[1] + zz * e[2]), 1
        ]);
    }
    function normalMatrix(m) {          // обратная транспонированная 3x3 (column-major)
        var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
        var A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
        var det = a * A + b * B + c * C;
        if (Math.abs(det) < 1e-12) return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        var id = 1 / det;
        return new Float32Array([
            A * id, B * id, C * id,
            (c * h - b * i) * id, (a * i - c * g) * id, (b * g - a * h) * id,
            (b * f - c * e) * id, (c * d - a * f) * id, (a * e - b * d) * id
        ]);
    }
    function trsToMat(t, q, s) {
        var x = q[0], y = q[1], z = q[2], w = q[3];
        var x2 = x + x, y2 = y + y, z2 = z + z;
        var xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
        return new Float32Array([
            (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
            (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
            (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
            t[0], t[1], t[2], 1
        ]);
    }

    /* ---------- шейдеры ---------- */
    function makeProgram(vs, fs) {
        function sh(type, src) {
            var s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            return s;
        }
        var p = gl.createProgram();
        gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
        gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        return p;
    }
    function uniforms(p, names) {
        var o = {};
        names.forEach(function (n) { o[n] = gl.getUniformLocation(p, n); });
        return o;
    }

    var FS_PRECISION = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

    var progModel, progShadow, uM, uS;
    try {
        progModel = makeProgram(
            'attribute vec3 aPos; attribute vec3 aNor;' +
            'uniform mat4 uVP; uniform mat4 uModel; uniform mat3 uNMat;' +
            'varying vec3 vPos; varying vec3 vNor;' +
            'void main(){ vec4 w = uModel * vec4(aPos, 1.0); vPos = w.xyz; vNor = uNMat * aNor; gl_Position = uVP * w; }',

            FS_PRECISION +
            'uniform vec3 uCam; uniform vec4 uBase; uniform float uMetal; uniform float uRough; uniform float uHL;' +
            'varying vec3 vPos; varying vec3 vNor;' +
            'vec3 hemi(vec3 d){ float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0); return mix(vec3(0.34, 0.28, 0.22), vec3(0.80, 0.82, 0.88), t); }' +
            'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }' +
            'void main(){' +
            '  vec3 N = normalize(vNor); if (!gl_FrontFacing) N = -N;' +
            '  vec3 V = normalize(uCam - vPos);' +
            '  vec3 base = uBase.rgb;' +
            '  float rough = clamp(uRough, 0.08, 1.0);' +
            '  vec3 diffuse = base * (1.0 - uMetal);' +
            '  vec3 F0 = mix(vec3(0.04), base, uMetal);' +
            '  vec3 L1 = normalize(vec3(-0.45, 0.85, 0.55));' +     /* основной свет: сверху-спереди-слева */
            '  vec3 L2 = normalize(vec3(0.75, 0.25, -0.55));' +     /* заполняющий: сзади-справа */
            '  vec3 L3 = normalize(vec3(0.1, -0.6, 0.8));' +        /* слабая подсветка снизу */
            '  float d1 = max(dot(N, L1), 0.0), d2 = max(dot(N, L2), 0.0), d3 = max(dot(N, L3), 0.0);' +
            '  vec3 col = diffuse * (hemi(N) * 1.0 + d1 * vec3(1.35, 1.25, 1.1) + d2 * vec3(0.55, 0.6, 0.72) + d3 * vec3(0.2, 0.18, 0.16));' +
            '  float shin = 2.0 / (rough * rough) - 2.0;' +
            '  vec3 H = normalize(L1 + V);' +
            '  float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);' +
            '  vec3 F = F0 + (1.0 - F0) * fres;' +
            '  float spec = pow(max(dot(N, H), 0.0), shin) * (shin + 8.0) / 25.0 * d1;' +
            '  vec3 R = reflect(-V, N);' +
            '  vec3 env = hemi(R) * F * (1.0 - 0.55 * rough);' +
            '  col += spec * F * vec3(1.15, 1.08, 0.98) + env;' +
            '  col += uHL * vec3(0.05, 0.034, 0.018);' +             /* подсветка при наведении / открытой карточке */
            '  gl_FragColor = vec4(pow(aces(col), vec3(1.0 / 2.2)), 1.0);' +
            '}'
        );
        uM = uniforms(progModel, ['uVP', 'uModel', 'uNMat', 'uCam', 'uBase', 'uMetal', 'uRough', 'uHL']);

        progShadow = makeProgram(
            'attribute vec3 aPos; uniform mat4 uVP; varying vec2 vP;' +
            'void main(){ vP = aPos.xz; gl_Position = uVP * vec4(aPos, 1.0); }',
            FS_PRECISION +
            'uniform vec2 uCenter; uniform vec2 uHalf; varying vec2 vP;' +
            'void main(){ vec2 q = (vP - uCenter) / uHalf; float r = length(q);' +
            '  float a = 0.30 * (1.0 - smoothstep(0.35, 1.0, r)); gl_FragColor = vec4(0.18 * a, 0.12 * a, 0.08 * a, a); }'
        );
        uS = uniforms(progShadow, ['uVP', 'uCenter', 'uHalf']);
    } catch (err) {
        console.error(err);
        setStatus('Не удалось запустить 3D-просмотр: ' + err.message);
        return;
    }
    var aPos = gl.getAttribLocation(progModel, 'aPos');
    var aNor = gl.getAttribLocation(progModel, 'aNor');
    var aShadowPos = gl.getAttribLocation(progShadow, 'aPos');

    /* ---------- загрузка GLB ---------- */
    function parseGLB(buf) {
        var dv = new DataView(buf);
        if (buf.byteLength < 20 || dv.getUint32(0, true) !== 0x46546C67) throw new Error('это не GLB-файл');
        var off = 12, json = null, bin = null;
        while (off + 8 <= buf.byteLength) {
            var len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
            off += 8;
            if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off, len)));
            else if (type === 0x004E4942) bin = buf.slice(off, off + len);
            off += len;
        }
        if (!json || !bin) throw new Error('в GLB нет данных');
        return { json: json, bin: bin };
    }
    function accessorData(j, bin, idx) {
        var a = j.accessors[idx], bv = j.bufferViews[a.bufferView];
        var comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
        var Ctor = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }[a.componentType];
        var start = (bv.byteOffset || 0) + (a.byteOffset || 0);
        if (bv.byteStride && bv.byteStride !== comps * Ctor.BYTES_PER_ELEMENT) {      // «чересстрочные» данные
            var out = new Ctor(a.count * comps), src = new DataView(bin), sz = Ctor.BYTES_PER_ELEMENT;
            for (var i = 0; i < a.count; i++) for (var c = 0; c < comps; c++) {
                var o = start + i * bv.byteStride + c * sz;
                out[i * comps + c] = sz === 4 ? (Ctor === Float32Array ? src.getFloat32(o, true) : src.getUint32(o, true)) : sz === 2 ? src.getUint16(o, true) : src.getUint8(o);
            }
            return out;
        }
        return new Ctor(bin, start, a.count * comps);
    }
    function makeBuffer(target, data) {
        var b = gl.createBuffer();
        gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW);
        return b;
    }

    var draws = [];                              // что рисовать
    var bbMin = [1e9, 1e9, 1e9], bbMax = [-1e9, -1e9, -1e9];

    function loadScene(glb) {
        var j = glb.json, bin = glb.bin;
        var meshes = (j.meshes || []).map(function (m) {
            return m.primitives.filter(function (p) { return p.mode == null || p.mode === 4; }).map(function (p) {
                var idx = accessorData(j, bin, p.indices);
                if (idx instanceof Uint8Array) idx = new Uint16Array(idx);
                if (idx instanceof Uint32Array && !gl.getExtension('OES_element_index_uint')) throw new Error('нужны 32-битные индексы');
                var pos = accessorData(j, bin, p.attributes.POSITION);
                var mat = (j.materials && j.materials[p.material]) || {};
                var pbr = mat.pbrMetallicRoughness || {};
                return {
                    posData: pos, idxData: idx,
                    pos: makeBuffer(gl.ARRAY_BUFFER, pos),
                    nor: makeBuffer(gl.ARRAY_BUFFER, accessorData(j, bin, p.attributes.NORMAL)),
                    idx: makeBuffer(gl.ELEMENT_ARRAY_BUFFER, idx),
                    count: idx.length,
                    type: idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
                    base: pbr.baseColorFactor || [0.8, 0.8, 0.8, 1],
                    metal: pbr.metallicFactor == null ? 0 : pbr.metallicFactor,
                    rough: pbr.roughnessFactor == null ? 0.6 : pbr.roughnessFactor
                };
            });
        });

        function walk(ni, parent) {
            var n = j.nodes[ni];
            var local = n.matrix ? new Float32Array(n.matrix) :
                trsToMat(n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]);
            var world = mul(parent, local);
            if (n.mesh != null) {
                var nm = normalMatrix(world);
                meshes[n.mesh].forEach(function (p) {
                    // координаты в мировой системе — для определения клика и габаритов
                    var wp = new Float32Array(p.posData.length);
                    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
                    for (var i = 0; i < p.posData.length; i += 3) {
                        var x = p.posData[i], y = p.posData[i + 1], z = p.posData[i + 2];
                        var wx = world[0] * x + world[4] * y + world[8] * z + world[12];
                        var wy = world[1] * x + world[5] * y + world[9] * z + world[13];
                        var wz = world[2] * x + world[6] * y + world[10] * z + world[14];
                        wp[i] = wx; wp[i + 1] = wy; wp[i + 2] = wz;
                        if (wx < mn[0]) mn[0] = wx; if (wx > mx[0]) mx[0] = wx;
                        if (wy < mn[1]) mn[1] = wy; if (wy > mx[1]) mx[1] = wy;
                        if (wz < mn[2]) mn[2] = wz; if (wz > mx[2]) mx[2] = wz;
                    }
                    for (var k = 0; k < 3; k++) { bbMin[k] = Math.min(bbMin[k], mn[k]); bbMax[k] = Math.max(bbMax[k], mx[k]); }
                    draws.push({ p: p, model: world, nmat: nm, wpos: wp, min: mn, max: mx });
                });
            }
            (n.children || []).forEach(function (c) { walk(c, world); });
        }
        var ident = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        (j.scenes[j.scene || 0].nodes || []).forEach(function (n) { walk(n, ident); });
        if (!draws.length) throw new Error('в файле нет геометрии');
    }

    /* ---------- камера ---------- */
    var FOV = 35 * Math.PI / 180;
    var center = [0, 0, 0], radius = 1;
    var cam = { az: 0.62, pol: 1.12, dist: 10, target: [0, 0, 0] };
    var home = null;
    var minDist = 1, maxDist = 100;
    var shadowBuf = null, shadowInfo = null;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function fitDistance() {
        var aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
        var hfov = 2 * Math.atan(Math.tan(FOV / 2) * aspect);
        return radius / Math.sin(Math.min(FOV, hfov) / 2) * 1.08;
    }
    function setupCamera() {
        center = [(bbMin[0] + bbMax[0]) / 2, (bbMin[1] + bbMax[1]) / 2, (bbMin[2] + bbMax[2]) / 2];
        radius = Math.hypot(bbMax[0] - bbMin[0], bbMax[1] - bbMin[1], bbMax[2] - bbMin[2]) / 2;
        cam.target = center.slice();
        cam.dist = fitDistance();
        minDist = radius * 0.25; maxDist = radius * 6;
        home = { az: cam.az, pol: cam.pol, dist: cam.dist, target: cam.target.slice() };

        // мягкая «тень» под моделью
        var y = bbMin[1] - 0.01 * radius, e = radius * 3;
        shadowBuf = makeBuffer(gl.ARRAY_BUFFER, new Float32Array([
            center[0] - e, y, center[2] - e,  center[0] - e, y, center[2] + e,  center[0] + e, y, center[2] + e,
            center[0] - e, y, center[2] - e,  center[0] + e, y, center[2] + e,  center[0] + e, y, center[2] - e
        ]));
        shadowInfo = { c: [center[0], center[2]], h: [(bbMax[0] - bbMin[0]) * 0.75, (bbMax[2] - bbMin[2]) * 0.75] };
    }
    function camPos() {
        var s = Math.sin(cam.pol);
        return [cam.target[0] + cam.dist * s * Math.sin(cam.az),
                cam.target[1] + cam.dist * Math.cos(cam.pol),
                cam.target[2] + cam.dist * s * Math.cos(cam.az)];
    }

    /* ---------- отрисовка ---------- */
    var dirty = true, raf = 0, highlight = 0;
    var shift = { x: 0, y: 0 }, shiftT = { x: 0, y: 0 };   // сдвиг картинки в NDC: модель уезжает от открытой карточки
    function invalidate() { dirty = true; if (!raf) raf = requestAnimationFrame(frame); }

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }

    function render() {
        resize();
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (!draws.length) return;

        var eye = camPos();
        var near = Math.max(radius * 0.01, cam.dist * 0.02), far = cam.dist + radius * 30;
        var proj = perspective(FOV, canvas.width / canvas.height, near, far);
        proj[8] = -shift.x; proj[9] = -shift.y;
        var vp = mul(proj, lookAt(eye, cam.target, [0, 1, 0]));

        // тень под моделью (видна только сверху)
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.useProgram(progShadow);
        gl.uniformMatrix4fv(uS.uVP, false, vp);
        gl.uniform2fv(uS.uCenter, shadowInfo.c); gl.uniform2fv(uS.uHalf, shadowInfo.h);
        gl.bindBuffer(gl.ARRAY_BUFFER, shadowBuf);
        gl.enableVertexAttribArray(aShadowPos); gl.vertexAttribPointer(aShadowPos, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.disableVertexAttribArray(aShadowPos);
        gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);

        // модель
        gl.useProgram(progModel);
        gl.uniformMatrix4fv(uM.uVP, false, vp);
        gl.uniform3fv(uM.uCam, eye);
        gl.uniform1f(uM.uHL, highlight);
        gl.enableVertexAttribArray(aPos); gl.enableVertexAttribArray(aNor);
        for (var i = 0; i < draws.length; i++) {
            var d = draws[i], p = d.p;
            gl.uniformMatrix4fv(uM.uModel, false, d.model);
            gl.uniformMatrix3fv(uM.uNMat, false, d.nmat);
            gl.uniform4fv(uM.uBase, p.base);
            gl.uniform1f(uM.uMetal, p.metal); gl.uniform1f(uM.uRough, p.rough);
            gl.bindBuffer(gl.ARRAY_BUFFER, p.pos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, p.nor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.idx);
            gl.drawElements(gl.TRIANGLES, p.count, p.type, 0);
        }
        gl.disableVertexAttribArray(aPos); gl.disableVertexAttribArray(aNor);
    }

    /* ---------- определение клика по модели (луч из камеры) ---------- */
    function cameraRay(clientX, clientY) {
        var r = canvas.getBoundingClientRect();
        var nx = (clientX - r.left) / r.width * 2 - 1 - shift.x, ny = 1 - (clientY - r.top) / r.height * 2 - shift.y;
        var e = camPos();
        var fx = cam.target[0] - e[0], fy = cam.target[1] - e[1], fz = cam.target[2] - e[2];
        var fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
        var rx = -fz, ry = 0, rz = fx, rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;           // right = forward × up
        var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;             // up = right × forward
        var th = Math.tan(FOV / 2), asp = r.width / r.height;
        var dx = fx + rx * nx * th * asp + ux * ny * th, dy = fy + ry * nx * th * asp + uy * ny * th, dz = fz + rz * nx * th * asp + uz * ny * th;
        var dl = Math.hypot(dx, dy, dz);
        return { o: e, d: [dx / dl, dy / dl, dz / dl] };
    }
    function hitBox(o, d, mn, mx) {
        var t0 = 0, t1 = Infinity;
        for (var k = 0; k < 3; k++) {
            if (Math.abs(d[k]) < 1e-9) { if (o[k] < mn[k] || o[k] > mx[k]) return false; continue; }
            var a = (mn[k] - o[k]) / d[k], b = (mx[k] - o[k]) / d[k];
            if (a > b) { var tmp = a; a = b; b = tmp; }
            t0 = Math.max(t0, a); t1 = Math.min(t1, b);
            if (t0 > t1) return false;
        }
        return true;
    }
    function pickModel(clientX, clientY) {
        var ray = cameraRay(clientX, clientY), o = ray.o, d = ray.d;
        for (var n = 0; n < draws.length; n++) {
            var dr = draws[n];
            if (!hitBox(o, d, dr.min, dr.max)) continue;
            var P = dr.wpos, I = dr.p.idxData;
            for (var i = 0; i < I.length; i += 3) {
                var a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
                var e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
                var e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
                var px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
                var det = e1x * px + e1y * py + e1z * pz;
                if (det > -1e-12 && det < 1e-12) continue;
                var inv = 1 / det;
                var tx = o[0] - P[a], ty = o[1] - P[a + 1], tz = o[2] - P[a + 2];
                var u = (tx * px + ty * py + tz * pz) * inv;
                if (u < 0 || u > 1) continue;
                var qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
                var v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
                if (v < 0 || u + v > 1) continue;
                if ((e2x * qx + e2y * qy + e2z * qz) * inv > 0) return true;
            }
        }
        return false;
    }

    /* ---------- карточка с информацией ---------- */
    var infoOpen = false;
    function updateHighlight() { highlight = infoOpen ? 1 : (hovering ? 0.55 : 0); invalidate(); }
    function openInfo() {
        if (!infoEl || infoOpen) return;
        infoOpen = true;
        infoEl.classList.add('is-open'); infoEl.setAttribute('aria-hidden', 'false');
        var sw = stage.clientWidth, sh = stage.clientHeight, pw = infoEl.offsetWidth, ph = infoEl.offsetHeight, m = 16;
        if (pw < sw * 0.8) { shiftT.x = -(pw + m) / sw; shiftT.y = 0; }      // карточка сбоку: сдвигаем модель влево
        else { shiftT.x = 0; shiftT.y = (ph + m) / sh; }                       // карточка снизу: сдвигаем модель вверх
        hideHint(); updateHighlight();
    }
    function closeInfo() {
        if (!infoEl || !infoOpen) return;
        infoOpen = false;
        infoEl.classList.remove('is-open'); infoEl.setAttribute('aria-hidden', 'true');
        shiftT.x = 0; shiftT.y = 0;
        updateHighlight();
    }
    if (infoClose) infoClose.addEventListener('click', function () { closeInfo(); canvas.focus({ preventScroll: true }); });

    /* ---------- управление ---------- */
    var vel = { az: 0, pol: 0 };               // инерция вращения (рад/мс)
    var tween = null, lastT = 0, hovering = false;
    var POL_MIN = 0.06, POL_MAX = Math.PI - 0.06;

    function clampCam() {
        cam.pol = Math.min(POL_MAX, Math.max(POL_MIN, cam.pol));
        cam.dist = Math.min(maxDist, Math.max(minDist, cam.dist));
    }
    function frame(t) {
        raf = 0;
        var dt = lastT ? Math.min(50, t - lastT) : 16;
        lastT = t;
        var animating = false;

        if (tween) {
            var k = Math.min(1, (t - tween.t0) / tween.dur), e = 1 - Math.pow(1 - k, 3);
            cam.az = tween.from.az + (tween.to.az - tween.from.az) * e;
            cam.pol = tween.from.pol + (tween.to.pol - tween.from.pol) * e;
            cam.dist = tween.from.dist + (tween.to.dist - tween.from.dist) * e;
            for (var i = 0; i < 3; i++) cam.target[i] = tween.from.target[i] + (tween.to.target[i] - tween.from.target[i]) * e;
            if (k >= 1) tween = null; else animating = true;
            dirty = true;
        } else if (!pointers.size && (Math.abs(vel.az) > 1e-5 || Math.abs(vel.pol) > 1e-5)) {
            cam.az += vel.az * dt; cam.pol += vel.pol * dt; clampCam();
            var damp = Math.pow(0.0025, dt / 1000);
            vel.az *= damp; vel.pol *= damp;
            animating = true; dirty = true;
        }

        if (Math.abs(shift.x - shiftT.x) > 1e-4 || Math.abs(shift.y - shiftT.y) > 1e-4) {
            var kk = reduceMotion ? 1 : 1 - Math.exp(-dt / 90);
            shift.x += (shiftT.x - shift.x) * kk; shift.y += (shiftT.y - shift.y) * kk;
            animating = true; dirty = true;
        } else if (shift.x !== shiftT.x || shift.y !== shiftT.y) { shift.x = shiftT.x; shift.y = shiftT.y; dirty = true; }

        if (dirty) { dirty = false; render(); }
        if (animating) raf = requestAnimationFrame(frame); else lastT = 0;
    }

    var pointers = new Map();
    var gesture = null;
    var hintHidden = false;
    function hideHint() { if (!hintHidden && hintEl) { hintHidden = true; hintEl.classList.add('is-hidden'); } }

    function pan(dx, dy) {
        var perPx = 2 * cam.dist * Math.tan(FOV / 2) / canvas.clientHeight;
        var s = Math.sin(cam.pol), c = Math.cos(cam.pol), sa = Math.sin(cam.az), ca = Math.cos(cam.az);
        var right = [ca, 0, -sa], up = [-c * sa, s, -c * ca];
        for (var i = 0; i < 3; i++) cam.target[i] += (-dx * right[i] + dy * up[i]) * perPx;
    }
    function centroid() {
        var x = 0, y = 0; pointers.forEach(function (p) { x += p.x; y += p.y; });
        return { x: x / pointers.size, y: y / pointers.size };
    }
    function spread() {
        var a = Array.from(pointers.values());
        return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
    }

    canvas.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
        canvas.focus({ preventScroll: true });
        canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        tween = null; vel.az = vel.pol = 0;
        if (pointers.size >= 2) gesture = { mode: 'pinch', c: centroid(), s: spread(), tap: false };
        else gesture = {
            mode: (e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey) ? 'pan' : 'rotate',
            tap: e.button === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey,
            x0: e.clientX, y0: e.clientY, t0: e.timeStamp, lt: 0
        };
        canvas.classList.add('is-dragging');
    });

    canvas.addEventListener('pointermove', function (e) {
        if (!pointers.has(e.pointerId)) {                       // просто наведение мыши
            if (e.pointerType === 'mouse') {
                var over = pickModel(e.clientX, e.clientY);
                if (over !== hovering) { hovering = over; canvas.classList.toggle('is-over-model', over); updateHighlight(); }
            }
            return;
        }
        if (!gesture) return;
        var prev = pointers.get(e.pointerId);
        var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (gesture.tap && Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > 6) gesture.tap = false;
        if (gesture.tap) return;                                // пока это может быть клик — камеру не двигаем
        var k = 2 * Math.PI / canvas.clientHeight;
        if (gesture.mode === 'rotate') {
            cam.az -= dx * k; cam.pol -= dy * k;
            var dtm = Math.max(1, e.timeStamp - (gesture.lt || e.timeStamp - 16));
            vel.az = -dx * k / dtm * 0.9 + vel.az * 0.1; vel.pol = -dy * k / dtm * 0.9 + vel.pol * 0.1;
            gesture.lt = e.timeStamp;
            hideHint();
        } else if (gesture.mode === 'pan') {
            pan(dx, dy); hideHint();
        } else if (gesture.mode === 'pinch') {
            var c = centroid(), s = spread();
            pan(c.x - gesture.c.x, c.y - gesture.c.y);
            if (gesture.s > 0 && s > 0) cam.dist *= gesture.s / s;
            gesture.c = c; gesture.s = s; hideHint();
        }
        clampCam(); invalidate();
    });

    function endPointer(e) {
        if (!pointers.has(e.pointerId)) return;
        var g = gesture;
        pointers.delete(e.pointerId);
        if (e.type === 'pointerup' && g && g.tap && pointers.size === 0 && e.timeStamp - g.t0 < 600) {
            // короткий клик без перетаскивания: по станку — открыть информацию, мимо — закрыть
            if (pickModel(e.clientX, e.clientY)) openInfo(); else closeInfo();
        }
        if (pointers.size === 1) gesture = { mode: 'rotate', tap: false, lt: 0 };
        else if (!pointers.size) { gesture = null; canvas.classList.remove('is-dragging'); if (reduceMotion) vel.az = vel.pol = 0; invalidate(); }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse' && hovering && !pointers.size) { hovering = false; canvas.classList.remove('is-over-model'); updateHighlight(); }
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    canvas.addEventListener('wheel', function (e) {
        e.preventDefault();
        var dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
        cam.dist *= Math.exp(dy * 0.0012);
        tween = null; clampCam(); hideHint(); invalidate();
    }, { passive: false });

    function resetView() {
        if (!home) return;
        home.dist = fitDistance();
        var from = { az: cam.az, pol: cam.pol, dist: cam.dist, target: cam.target.slice() };
        var to = { az: home.az, pol: home.pol, dist: home.dist, target: home.target.slice() };
        var d = ((to.az - from.az) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        to.az = from.az + d;
        tween = { from: from, to: to, t0: performance.now(), dur: reduceMotion ? 1 : 450 };
        vel.az = vel.pol = 0; invalidate();
    }
    canvas.addEventListener('dblclick', resetView);

    // клавиатура: стрелки — вращение, +/− — масштаб, Enter — информация, 0 — исходный вид, Esc — закрыть
    canvas.addEventListener('keydown', function (e) {
        var step = 0.08, handled = true;
        if (e.key === 'ArrowLeft') cam.az -= step;
        else if (e.key === 'ArrowRight') cam.az += step;
        else if (e.key === 'ArrowUp') cam.pol -= step;
        else if (e.key === 'ArrowDown') cam.pol += step;
        else if (e.key === '+' || e.key === '=') cam.dist *= 0.9;
        else if (e.key === '-' || e.key === '_') cam.dist *= 1.1;
        else if (e.key === 'Enter' || e.key === ' ') { infoOpen ? closeInfo() : openInfo(); }
        else if (e.key === '0' || e.key === 'Home') { resetView(); }
        else handled = false;
        if (handled) { e.preventDefault(); tween = null; clampCam(); hideHint(); invalidate(); }
    });
    root.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && infoOpen) { closeInfo(); canvas.focus({ preventScroll: true }); }
    });

    if (window.ResizeObserver) new ResizeObserver(invalidate).observe(stage);
    else window.addEventListener('resize', invalidate);
    setTimeout(hideHint, 12000);

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); setStatus('Графический контекст потерян. Обновите страницу.'); });

    /* ---------- старт ---------- */
    setStatus('Загрузка модели…');
    fetch(modelUrl)
        .then(function (r) {
            if (!r.ok) throw new Error('файл ' + modelUrl + ' не найден (код ' + r.status + ')');
            return r.arrayBuffer();
        })
        .then(function (buf) {
            loadScene(parseGLB(buf));
            setupCamera();
            statusEl.classList.add('is-hidden');
            invalidate();
        })
        .catch(function (err) {
            console.error(err);
            var hint = location.protocol === 'file:' ? ' Откройте сайт через локальный сервер (например, Live Server) или после публикации.' : '';
            setStatus('Не удалось загрузить модель: ' + err.message + '.' + hint);
        });

    // для отладки в консоли браузера
    window.loomViewer = { cam: cam, reset: resetView, open: openInfo, close: closeInfo, pick: pickModel };
})();
