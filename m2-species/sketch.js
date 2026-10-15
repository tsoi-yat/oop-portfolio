// =====================================================================
// 後未來動物園 M2：硫鐵岩鱗古螺 (Loricata ferrosulfuris)
// 實時 3D 連動引擎 (UMD 無模組版，徹底相容本機雙擊 file:/// 零伺服器環境)
// 直接載入 Blender 4.4 導出之具厚度與生長橫紋實體模型
// 支援 360° 滑鼠拖曳旋轉、滾輪縮放、生化呼吸脈動與警覺縮殼互鎖
// =====================================================================

var scene, camera, renderer, controls;
var snailModel = null;
var scaleObjects = [];      // 儲存所有 3D 瓦片物件
var initialScalesData = []; // 記錄甲片原始位置與旋轉
var ventObj = null;
var particlesMesh = null;

var isAlert = false;
var breathTime = 0;
var currentDefenseProgress = 0; // 0 = 舒張, 1 = 完全縮殼

// 將 Base64 轉為 ArrayBuffer（純記憶體解析，避開瀏覽器本機 CORS 限制）
function base64ToArrayBuffer(base64) {
  var binaryString = window.atob(base64);
  var len = binaryString.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function init3DViewer() {
  var container = document.getElementById('canvas-container');
  if (!container) return;

  // 確保取得正確寬高（若容器尺寸尚未計算則使用視窗尺寸保底）
  var width = container.clientWidth || (window.innerWidth > 500 ? window.innerWidth - 360 : window.innerWidth) || 800;
  var height = container.clientHeight || window.innerHeight || 600;

  if (typeof THREE === 'undefined') {
    container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#d4a754;font-size:16px;">⚠️ 正在載入 3D 引擎，請確認網路連線或重新整理頁面...</div>';
    return;
  }

  // 1. 建立 3D 場景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080c14);
  scene.fog = new THREE.FogExp2(0x080c14, 0.08);

  // 2. 建立攝影機 (45 度俯視全景)
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(2.8, -3.2, 2.5);

  // 3. 建立 WebGL 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (renderer.toneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
  }
  container.innerHTML = ''; // 清空舊畫布
  container.appendChild(renderer.domElement);

  // 4. 建立軌道控制器 (滑鼠 360 度旋轉與滾輪縮放)
  if (THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0.35);
    controls.maxDistance = 8.0;
    controls.minDistance = 1.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
  }

  // 5. 3D 深海光影系統
  setupLighting();

  // 6. 建立深海漂浮微粒
  setupDeepSeaParticles();

  // 7. 載入 Blender 4.4 導出的 3D 模型
  loadBlenderModel();

  // 8. 視窗縮放適配
  window.addEventListener('resize', onWindowResize);

  // 9. 啟動主渲染循環
  animate();
}

function setupLighting() {
  // 微弱深海冷色環境光
  var ambientLight = new THREE.AmbientLight(0x35485e, 0.9);
  scene.add(ambientLight);

  // 頂部冰層微弱漫射冷光
  var topLight = new THREE.DirectionalLight(0xa5d6ff, 1.8);
  topLight.position.set(3, -2, 6);
  scene.add(topLight);

  // 底部黑煙囪熱羽流暖橘紅發光 (PointLight)
  var ventWarmLight = new THREE.PointLight(0xff6a28, 4.5, 6.0);
  ventWarmLight.position.set(0, 0, -0.6);
  scene.add(ventWarmLight);

  // 側光捕捉幾何瓦片金屬反射
  var rimLight = new THREE.DirectionalLight(0xd4a754, 1.2);
  rimLight.position.set(-4, 3, 2);
  scene.add(rimLight);
}

function setupDeepSeaParticles() {
  var particleCount = 200;
  var geometry = new THREE.BufferGeometry();
  var positions = new Float32Array(particleCount * 3);

  for (var i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 8;
    positions[i + 1] = (Math.random() - 0.5) * 8;
    positions[i + 2] = (Math.random() - 0.5) * 6;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  var material = new THREE.PointsMaterial({
    color: 0xd4a754,
    size: 0.04,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending
  });

  particlesMesh = new THREE.Points(geometry, material);
  scene.add(particlesMesh);
}

function loadBlenderModel() {
  if (typeof SNAIL_GLB_BASE64 === 'undefined' || !THREE.GLTFLoader) {
    console.warn('正在等待模型數據或 GLTFLoader 載入...');
    return;
  }

  var loader = new THREE.GLTFLoader();
  var arrayBuffer = base64ToArrayBuffer(SNAIL_GLB_BASE64);

  loader.parse(arrayBuffer, '', function(gltf) {
    snailModel = gltf.scene;
    scene.add(snailModel);

    // 遍歷模型內部結構，找出每片瓦片並記錄初始幾何狀態
    snailModel.traverse(function(child) {
      if (child.isMesh) {
        if (child.name && child.name.indexOf('Scale_L') === 0) {
          scaleObjects.push(child);
          initialScalesData.push({
            pos: child.position.clone(),
            rot: child.rotation.clone(),
            distFromCenter: Math.sqrt(child.position.x * child.position.x + child.position.y * child.position.y)
          });
        }
        if (child.name && child.name.indexOf('Central_Vent') !== -1) {
          ventObj = child;
        }
      }
    });

    console.log("Blender 3D 模型載入成功！共捕獲 " + scaleObjects.length + " 片具備厚度與橫紋的實體瓦片。");
  }, function(err) {
    console.error('Blender 模型解析失敗:', err);
  });
}

function onWindowResize() {
  var container = document.getElementById('canvas-container');
  if (!container || !renderer || !camera) return;
  var width = container.clientWidth;
  var height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  breathTime += 0.035;

  // 1. 旋轉與微動深海微粒
  if (particlesMesh) {
    particlesMesh.rotation.z += 0.001;
    var pos = particlesMesh.geometry.attributes.position.array;
    for (var i = 2; i < pos.length; i += 3) {
      pos[i] += 0.005;
      if (pos[i] > 3) pos[i] = -3;
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;
  }

  // 2. 演算法驅動生物動態（呼吸舒張 ⇄ 縮殼互鎖平滑插值）
  var targetDefense = isAlert ? 1.0 : 0.0;
  currentDefenseProgress += (targetDefense - currentDefenseProgress) * 0.12;

  var breathWave = Math.sin(breathTime) * 0.03;

  if (scaleObjects.length > 0) {
    for (var j = 0; j < scaleObjects.length; j++) {
      var obj = scaleObjects[j];
      var data = initialScalesData[j];

      // 舒張時向外微翹，警覺時向內收縮鎖死
      var contractionFactor = 1.0 - (currentDefenseProgress * 0.14) + (breathWave * (1.0 - currentDefenseProgress));
      obj.position.x = data.pos.x * contractionFactor;
      obj.position.y = data.pos.y * contractionFactor;

      var alertTilt = currentDefenseProgress * -0.18;
      obj.rotation.x = data.rot.x + alertTilt;
    }
  }

  // 3. 中央呼吸孔開闔微光
  if (ventObj) {
    var ventScale = 1.0 + (breathWave * 1.5) - (currentDefenseProgress * 0.25);
    ventObj.scale.set(ventScale, ventScale, 1.0);
  }

  // 4. 整體微幅緩慢自轉
  if (snailModel) {
    snailModel.rotation.z += 0.0012;
  }

  if (controls) {
    controls.update();
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }

  // 5. 更新生物即時生理數值
  updateDashboardMetrics();
}

function updateDashboardMetrics() {
  var bpmElem = document.getElementById('metric-bpm');
  var effElem = document.getElementById('metric-eff');
  var stateElem = document.getElementById('state-badge');

  if (bpmElem && effElem && stateElem) {
    if (isAlert) {
      bpmElem.innerText = "88 BPM";
      effElem.innerText = "42.1 %";
      stateElem.innerText = "狀態：【警覺縮殼互鎖】（防禦掠食天敵震波）";
      stateElem.className = "alert-mode";
    } else {
      var liveBpm = Math.floor(40 + Math.sin(breathTime) * 3);
      bpmElem.innerText = liveBpm + " BPM";
      effElem.innerText = "96.4 %";
      stateElem.innerText = "狀態：【舒張代謝】（共生菌吸收硫化物中）";
      stateElem.className = "calm-mode";
    }
  }
}

// 暴露給 HTML 按鈕觸發
window.toggleDefense = function() {
  isAlert = !isAlert;
};

// 頁面加載完成後自動啟動
window.addEventListener('load', function() {
  init3DViewer();
});
