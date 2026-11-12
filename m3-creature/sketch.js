// =====================================================================
// 後未來動物園 M3 個體行為與環境反應版：硫鐵岩鱗古螺 (Loricata ferrosulfuris)
// OOP 物件導向個體封裝 (class LoricataCreature) + 四態環境感知狀態機
// ---------------------------------------------------------------------
// 1. FORAGING (18~45°C 適溫趨熱覓食)：追隨游標熱源轉頭、暗金齒舌刮食、青綠共生螢光
// 2. HIBERNATION (<10°C 極寒低溫休眠)：冰晶幽藍微光、心率降至 9 BPM、甲片半收保溫、冰晶緩降
// 3. OVERHEAT (>60°C 噴泉過熱趨避)：琥珀黃高頻閃爍、身體後退左右擺動逃離熱源、呼吸孔張開排熱
// 4. DEFENSE (掠食者襲擊/滑鼠雙擊驚嚇)：熔岩橘紅警戒光、穿山甲縮殼互鎖、背部噴發黑煙障眼雲
// =====================================================================

var scene, camera, renderer, controls;
var snailModel = null;
var particlesMesh = null;
var defenseSmokeMesh = null;
var smokeVelocities = [];

var geoLightFront = null;
var geoLightBack = null;
var topBlueLight = null;

var showRockBase = true;
var autoDemoActive = false;
var autoDemoTimer = 0;
var autoDemoIndex = 0;
var AUTO_DEMO_STATES = ['FORAGING', 'HIBERNATION', 'OVERHEAT', 'DEFENSE'];

// 滑鼠感官追蹤座標 (Normalized Device Coordinates: -1 ~ +1)
var cursorNDC = { x: 0, y: 0, speed: 0, lastX: 0, lastY: 0 };

// =====================================================================
// 【OOP 核心類別】LoricataCreature：封裝單一個體之感官、生理恆定與運動器官
// =====================================================================
class LoricataCreature {
  constructor() {
    // 1. 外部環境感官輸入 (Sensory Inputs)
    this.envTemp = 32;          // 環境水溫 (°C)
    this.h2sLevel = 85;         // 硫化氫濃度 (%)
    this.externalThreat = false;// 是否遭受掠食者/劇烈震波威脅
    this.threatCooldown = 0;    // 驚嚇縮殼後自動解除倒數

    // 2. 內部生理恆定狀態 (Internal Homeostasis)
    this.state = 'FORAGING';    // FORAGING | HIBERNATION | OVERHEAT | DEFENSE
    this.bodyTemp = 31.5;       // 體內核心溫度 (°C)
    this.heartRate = 42;        // 心率 (BPM)
    this.symbiosisEff = 95.8;   // 化能自營碳固定率 (%)
    this.stressLevel = 8;       // 神經警戒壓力值 (%)

    // 3. 動畫平滑插值權重 (0.0 ~ 1.0)
    this.breathTime = 0;
    this.defenseProgress = 0;   // 縮殼防禦程度
    this.hibernateProgress = 0; // 低溫休眠程度
    this.overheatProgress = 0;  // 高溫趨避程度
    this.lookYaw = 0;           // 趨熱轉頭水平角
    this.lookPitch = 0;         // 趨熱轉頭俯仰角
    this.avoidOffsetZ = 0;      // 過熱後退位移
    this.avoidYaw = 0;          // 過熱逃離擺動角

    // 4. 水底飄遊與鐵片微流體推進 (Underwater Drifting & Scale Propulsion)
    this.isFloatingMode = true; // 是否處於水底飄游態 (預設開啟)
    this.swimTime = 0;          // 飄游動力時間軸
    this.floatElevation = 0.28; // 懸浮離底高度
    this.floatDriftX = 0;       // 側向水流漂移
    this.floatDriftZ = 0;       // 前後微幅推進
    this.floatPitch = 0;        // 游動俯仰角
    this.floatRoll = 0;         // 游動側傾角

    // 5. 3D 水中自主漫遊與滑鼠左鍵追隨推進系統
    this.worldPos = new THREE.Vector3(0, 0.45, 0);     // 3D 空間世界座標
    this.targetPos = new THREE.Vector3(0, 0.45, 0);    // 當前巡航/追隨目標
    this.wanderTimer = 0;                              // 隨機漫遊週期計時器
    this.isMouseGuiding = false;                       // 是否正由滑鼠左鍵按住引導
    this.headingYaw = 0;                               // 水平游動朝向角
    this.headingPitch = 0;                             // 俯仰角
    this.headingRoll = 0;                              // 轉彎側傾角
    this.swimSpeedRatio = 1.0;                         // 游動推進倍率
    this.model = null;                                 // 綁定之 3D 模型實例
    this.scaleVal = 0.38;                              // 體積縮放比例
    this.index = 0;                                    // 群體編號 (0:原版, 1:小25%, 2:小50%)

    // 6. 3D 解剖部位節點參照
    this.scaleObjects = [];
    this.initialScalesData = [];
    this.headShieldObjects = [];
    this.frontTentacleObjects = [];
    this.perimTentacleObjects = [];
    this.biolumMaterials = [];
    this.baseObjects = [];
    this.shellGroupObjects = [];
    this.footObjects = [];
    this.ventObj = null;
    this.siphonObj = null;
    this.radulaObj = null;
  }

  // 綁定 Blender GLB 3D 模型的各解剖節點
  bindModelNodes(rootScene, sandblastTex) {
    var self = this;
    this.model = rootScene;
    rootScene.traverse(function(child) {
      if (child.isMesh && child.material) {
        var mats = Array.isArray(child.material) ? child.material : [child.material];
        for (var m = 0; m < mats.length; m++) {
          var mat = mats[m];
          if (!mat) continue;
          var mName = mat.name || '';
          if (mName.indexOf('Flesh') !== -1) {
            mat.bumpMap = sandblastTex;
            mat.bumpScale = 0.016;
            mat.roughness = 0.42;
            if (typeof mat.clearcoatRoughness !== 'undefined') {
              mat.clearcoatRoughness = 0.32;
            }
            mat.needsUpdate = true;
          }
          if (mName.indexOf('Scale_') !== -1 && mName.indexOf('Shiny') !== -1) {
            mat.roughness = 0.10;
            mat.metalness = 0.98;
            mat.needsUpdate = true;
          }
          if (mName.indexOf('Scale_') !== -1 && mName.indexOf('Worn') !== -1) {
            mat.roughness = 0.56;
            mat.metalness = 0.84;
            mat.needsUpdate = true;
          }
          if (mat.emissive && (mName.indexOf('Biolum') !== -1 || mName.indexOf('Thermal_Bulb') !== -1 || mName.indexOf('Bio_Vein') !== -1 || mName.indexOf('Biofilm') !== -1)) {
            if (self.biolumMaterials.indexOf(mat) === -1) {
              self.biolumMaterials.push(mat);
            }
          }
        }
      }
    });

    for (var i = 0; i < rootScene.children.length; i++) {
      var node = rootScene.children[i];
      var name = node.name || '';

      if (name.indexOf('Scale_L') === 0) {
        this.scaleObjects.push(node);
        this.initialScalesData.push({
          pos: node.position.clone(),
          quat: node.quaternion.clone(),
          scale: node.scale.clone()
        });
      } else if (name === 'Foot_Skirt' || name === 'Foot_BioVeins') {
        this.footObjects.push({ obj: node, pos: node.position.clone(), scale: node.scale.clone() });
      } else if (name === 'Head_Shield') {
        this.headShieldObjects.push({ obj: node, pos: node.position.clone(), scale: node.scale.clone() });
      } else if (name.indexOf('Head_Mini_Tentacle_') === 0 || name.indexOf('Head_Bulb_Tip_') === 0 || name.indexOf('Tentacle_Chem_') === 0) {
        this.frontTentacleObjects.push({
          obj: node,
          pos: node.position.clone(),
          rot: node.rotation.clone(),
          scale: node.scale.clone(),
          isBulbOrMini: (name.indexOf('Head_') === 0)
        });
      } else if (name.indexOf('Tentacle_Perim_') === 0) {
        this.perimTentacleObjects.push({ obj: node, pos: node.position.clone(), rot: node.rotation.clone(), scale: node.scale.clone() });
      } else if (name === 'Main_Shell' || name === 'Vent_Collar' || name === 'Central_Vent' || name === 'Sulfur_Crystals' || name === 'Shell_Biofilm') {
        this.shellGroupObjects.push({ obj: node, pos: node.position.clone(), rot: node.rotation.clone(), scale: node.scale.clone() });
        if (name === 'Central_Vent') this.ventObj = node;
      } else if (name === 'Fleshy_Siphon') {
        this.siphonObj = { obj: node, pos: node.position.clone(), scale: node.scale.clone() };
      } else if (name === 'Radula_Organ') {
        this.radulaObj = { obj: node, pos: node.position.clone(), scale: node.scale.clone() };
      } else if (name.indexOf('Basalt_') === 0) {
        this.baseObjects.push(node);
      }
    }
  }

  // 感官接收與威脅判定 (Sensory Perception)
  senseEnvironment(envTemp, h2sLevel, cursorInfo) {
    this.envTemp = envTemp;
    this.h2sLevel = h2sLevel;

    // 若自動收到劇烈游標震動或雙擊，啟動短暫驚嚇倒數
    if (this.threatCooldown > 0) {
      this.threatCooldown -= 0.016;
      if (this.threatCooldown <= 0) {
        this.externalThreat = false;
        this.threatCooldown = 0;
      }
    }

    // 決策狀態機 (Priority: DEFENSE > HIBERNATION / OVERHEAT > FORAGING)
    if (this.externalThreat) {
      this.state = 'DEFENSE';
    } else if (this.envTemp <= 10) {
      this.state = 'HIBERNATION';
    } else if (this.envTemp >= 60) {
      this.state = 'OVERHEAT';
    } else {
      this.state = 'FORAGING';
    }

    // 計算趨熱視線追蹤角度 (僅在適溫覓食時主動追隨游標熱源)
    var targetYaw = (this.state === 'FORAGING') ? (cursorInfo.x * 0.18) : 0;
    var targetPitch = (this.state === 'FORAGING') ? (cursorInfo.y * 0.08) : 0;
    this.lookYaw += (targetYaw - this.lookYaw) * 0.08;
    this.lookPitch += (targetPitch - this.lookPitch) * 0.08;
  }

  // 觸發外部驚嚇威脅
  triggerThreat(durationSec) {
    this.externalThreat = true;
    this.threatCooldown = durationSec || 0;
    this.state = 'DEFENSE';
  }

  // 更新內部生理指標與 3D 運動器官 (Homeostasis & Motor Execution)
  update() {
    // 1. 根據狀態調整呼吸頻率與平滑權重
    var breathSpeed = 0.038;
    if (this.state === 'HIBERNATION') breathSpeed = 0.010;
    else if (this.state === 'OVERHEAT') breathSpeed = 0.082;
    else if (this.state === 'DEFENSE') breathSpeed = 0.065;
    this.breathTime += breathSpeed;

    var targetDef = (this.state === 'DEFENSE') ? 1.0 : 0.0;
    var targetHib = (this.state === 'HIBERNATION') ? 1.0 : 0.0;
    var targetOvh = (this.state === 'OVERHEAT') ? 1.0 : 0.0;

    this.defenseProgress += (targetDef - this.defenseProgress) * 0.10;
    this.hibernateProgress += (targetHib - this.hibernateProgress) * 0.06;
    this.overheatProgress += (targetOvh - this.overheatProgress) * 0.08;

    // 2. 更新體溫、心率、自營率與壓力值
    var targetBodyTemp = this.envTemp * 0.85 + 4.0;
    if (this.state === 'DEFENSE') targetBodyTemp += 3.5;
    this.bodyTemp += (targetBodyTemp - this.bodyTemp) * 0.05;

    var h2sFactor = this.h2sLevel / 100.0;
    if (this.state === 'FORAGING') {
      this.heartRate = Math.floor(40 + Math.sin(this.breathTime) * 3 + h2sFactor * 4);
      this.symbiosisEff = +(78.0 + h2sFactor * 19.5 + Math.sin(this.breathTime * 0.5) * 0.6).toFixed(1);
      this.stressLevel = Math.floor(6 + Math.abs(this.envTemp - 32) * 0.4);
    } else if (this.state === 'HIBERNATION') {
      this.heartRate = Math.floor(9 + Math.sin(this.breathTime) * 1);
      this.symbiosisEff = +(24.0 + h2sFactor * 12.0).toFixed(1);
      this.stressLevel = 18;
    } else if (this.state === 'OVERHEAT') {
      this.heartRate = Math.floor(80 + Math.sin(this.breathTime * 2) * 5);
      this.symbiosisEff = +(45.0 + h2sFactor * 15.0).toFixed(1);
      this.stressLevel = Math.min(92, Math.floor(68 + (this.envTemp - 60) * 0.6));
    } else if (this.state === 'DEFENSE') {
      this.heartRate = 94;
      this.symbiosisEff = 36.5;
      this.stressLevel = 98;
    }

    // 3. 動態生物螢光色彩切換 (青綠覓食 ⇄ 冰藍休眠 ⇄ 琥珀閃爍過熱 ⇄ 熔岩橘紅防禦)
    var pulse = 0.85 + Math.sin(this.breathTime * 1.5) * 0.15;
    var r = 0.10 * pulse, g = 0.94 * pulse, b = 0.75 * pulse; // 預設青綠

    if (this.hibernateProgress > 0.01) {
      r = r * (1 - this.hibernateProgress) + 0.12 * this.hibernateProgress;
      g = g * (1 - this.hibernateProgress) + 0.45 * this.hibernateProgress;
      b = b * (1 - this.hibernateProgress) + 0.95 * this.hibernateProgress;
    }
    if (this.overheatProgress > 0.01) {
      var flicker = 0.75 + Math.sin(this.breathTime * 4.0) * 0.25;
      r = r * (1 - this.overheatProgress) + 1.00 * flicker * this.overheatProgress;
      g = g * (1 - this.overheatProgress) + 0.68 * flicker * this.overheatProgress;
      b = b * (1 - this.overheatProgress) + 0.08 * this.overheatProgress;
    }
    if (this.defenseProgress > 0.01) {
      r = r * (1 - this.defenseProgress) + 1.00 * this.defenseProgress;
      g = g * (1 - this.defenseProgress) + 0.24 * this.defenseProgress;
      b = b * (1 - this.defenseProgress) + 0.06 * this.defenseProgress;
    }

    for (var m = 0; m < this.biolumMaterials.length; m++) {
      var mat = this.biolumMaterials[m];
      if (mat.emissive) {
        mat.emissive.setRGB(r, g, b);
      }
    }

    // 4. 計算綜合運動參數與水底飄遊動力學
    var activeFactor = Math.max(0.0, 1.0 - this.defenseProgress - this.hibernateProgress * 0.82);
    var breathWave = Math.sin(this.breathTime) * (0.035 * activeFactor + 0.055 * this.overheatProgress);

    // 水底游動推進時間軸速度 (再減慢 25%，深海沉穩流體律動)
    var baseSwimSpeed = (this.isMouseGuiding ? 0.051 : 0.026) * this.swimSpeedRatio;
    if (this.state === 'HIBERNATION') baseSwimSpeed = 0.007;
    else if (this.state === 'OVERHEAT') baseSwimSpeed = 0.066;
    else if (this.state === 'DEFENSE') baseSwimSpeed = 0.005;
    this.swimTime += baseSwimSpeed;

    // 3D 空間漫遊與滑鼠左鍵引導游動邏輯 (連續流體慣性，無突兀停頓與急轉)
    if (this.isFloatingMode && this.state !== 'DEFENSE') {
      if (this.index === 0) {
        // === 原版首領 (Leader)：在 3D 深海水體中自主大半徑漫遊巡航或由滑鼠引導 ===
        if (!this.isMouseGuiding) {
          this.wanderTimer += 0.016;
          var toCurTarget = new THREE.Vector3().subVectors(this.targetPos, this.worldPos);
          // 當距離目標小於 1.1 提前平滑銜接下一個巡航點，消除到達目標時的突兀煞停
          if (toCurTarget.length() < 1.1 || this.wanderTimer > 6.5) {
            this.wanderTimer = 0;
            if (this.state === 'HIBERNATION') {
              this.targetPos.set((Math.random() - 0.5) * 1.6, 0.20, (Math.random() - 0.5) * 1.6);
              this.swimSpeedRatio = 0.35;
            } else if (this.state === 'OVERHEAT') {
              this.targetPos.set((Math.random() > 0.5 ? 1 : -1) * (2.2 + Math.random() * 1.2), 0.8 + Math.random() * 0.8, 1.2 + Math.random() * 1.0);
              this.swimSpeedRatio = 2.0;
            } else {
              // FORAGING 在水體中開闊平滑巡航
              this.targetPos.set(
                (Math.random() - 0.5) * 4.2,
                0.35 + Math.random() * 1.1,
                (Math.random() - 0.5) * 3.8
              );
              this.swimSpeedRatio = 1.0;
            }
          }
        } else {
          this.swimSpeedRatio = 1.8;
        }
      } else {
        // === 小的兩隻伴隨個體 (Followers)：依指示「恆在原本那隻的後方」 ===
        var leader = creatures[0];
        if (leader) {
          // 計算首領的前進朝向與後方向量 (本地 -Z 為前進方向，故後方為 +fwd 反向)
          var fwdX = -Math.sin(leader.headingYaw) * Math.cos(leader.headingPitch);
          var fwdY = Math.sin(leader.headingPitch);
          var fwdZ = -Math.cos(leader.headingYaw) * Math.cos(leader.headingPitch);

          // 後方向量 (Backward Vector)
          var bwdX = -fwdX;
          var bwdY = -fwdY * 0.4;
          var bwdZ = -fwdZ;

          // 側向右向量 (Right Vector: cross(fwd, up))
          var rgtX = Math.cos(leader.headingYaw);
          var rgtZ = -Math.sin(leader.headingYaw);

          var backDist, sideDist, elevOffset;
          if (this.index === 1) {
            // 小 25% 伴隨 (再縮小 15% ➔ 0.242)：恆在首領左後方開闊水域
            backDist = 2.0 + Math.sin(this.swimTime * 0.8) * 0.20;
            sideDist = -1.45 + Math.cos(this.swimTime * 0.6) * 0.15;
            elevOffset = 0.15 + Math.sin(this.swimTime * 0.7) * 0.06;
          } else {
            // 小 50% 幼體 (再縮小 15% ➔ 0.162)：恆在首領右後方且距離稍遠一層
            backDist = 2.75 + Math.sin(this.swimTime * 0.9 + 1.2) * 0.25;
            sideDist = 1.35 + Math.cos(this.swimTime * 0.75 + 0.8) * 0.15;
            elevOffset = -0.12 + Math.sin(this.swimTime * 0.65) * 0.05;
          }

          var followerTarget = new THREE.Vector3(
            leader.worldPos.x + bwdX * backDist + rgtX * sideDist,
            Math.max(0.20, leader.worldPos.y + bwdY * backDist + elevOffset),
            leader.worldPos.z + bwdZ * backDist + rgtZ * sideDist
          );
          this.targetPos.copy(followerTarget);

          // 根據距離首領後方護衛點的遠近動態調速，使其緊隨首領巡航
          var distToFollowerSpot = this.worldPos.distanceTo(followerTarget);
          this.swimSpeedRatio = Math.max(0.65, Math.min(2.5, distToFollowerSpot * 1.05));
        }
      }

      var delta = new THREE.Vector3().subVectors(this.targetPos, this.worldPos);
      delta.normalize();

      // 頭部永遠作為前導箭頭：本地 -Z 為頭部朝向
      var desiredYaw = Math.atan2(-delta.x, -delta.z);
      var desiredPitch = Math.max(-0.40, Math.min(0.40, delta.y * 0.45));
      var diffYaw = desiredYaw - this.headingYaw;
      while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
      while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;

      // 極度平緩的角速度限制（轉速更慢更平滑，杜絕任何急轉）
      var maxTurnRate = (this.isMouseGuiding ? 0.030 : 0.016);
      var turnStep = Math.max(-maxTurnRate, Math.min(maxTurnRate, diffYaw * 0.055));
      this.headingYaw += turnStep;

      var pitchDiff = desiredPitch - this.headingPitch;
      var maxPitchRate = 0.016;
      this.headingPitch += Math.max(-maxPitchRate, Math.min(maxPitchRate, pitchDiff * 0.045));

      // 轉彎側傾（柔和過渡）
      var targetRoll = -turnStep * 8.0;
      this.headingRoll += (targetRoll - this.headingRoll) * 0.045;

      // 沿著自身當前頭部朝向推進，形成大半徑弧線巡弋
      var headingDir = new THREE.Vector3(
        -Math.sin(this.headingYaw) * Math.cos(this.headingPitch),
        Math.sin(this.headingPitch),
        -Math.cos(this.headingYaw) * Math.cos(this.headingPitch)
      );

      // 移動速度減慢 25% (巡航 0.0098，引導 0.018) + 慣性動量平滑加速
      var forwardAlignment = Math.max(0.35, Math.cos(diffYaw));
      var targetSpeed = (this.isMouseGuiding ? 0.018 : 0.0098) * this.swimSpeedRatio * activeFactor * (0.4 + forwardAlignment * 0.6);
      if (this.currentSpeed === undefined) this.currentSpeed = 0.008;
      this.currentSpeed += (targetSpeed - this.currentSpeed) * 0.04;
      this.worldPos.addScaledVector(headingDir, this.currentSpeed);

      // 個體間距離維持演算法：當兩隻古螺距離小於 2.0 單位時，產生平滑排斥推力，徹底保持拉開距離
      for (var o = 0; o < creatures.length; o++) {
        if (creatures[o] !== this) {
          var distToOther = this.worldPos.distanceTo(creatures[o].worldPos);
          if (distToOther < 2.0 && distToOther > 0.001) {
            var repulseDir = new THREE.Vector3().subVectors(this.worldPos, creatures[o].worldPos).normalize();
            var repulseStrength = (2.0 - distToOther) * 0.007;
            this.worldPos.addScaledVector(repulseDir, repulseStrength);
          }
        }
      }
    } else if (this.state === 'DEFENSE') {
      this.worldPos.y += (0.05 - this.worldPos.y) * 0.12;
    }

    if (this.model) {
      this.model.position.copy(this.worldPos);
      this.model.rotation.set(this.headingPitch, this.headingYaw, this.headingRoll);
    }

    // 目標懸浮高度 (Elevation) 與平滑過渡：
    // - FORAGING (適溫覓食)：優雅懸浮 0.26 單位，如深海鰩魚般在黑煙囪上方游弋
    // - OVERHEAT (過熱急逃)：懸浮拉高至 0.42 單位，向後急速噴水脫離沸騰水層
    // - HIBERNATION (極寒休眠)：緩緩下沉沉積於玄武岩 (0.04 單位)，節能待機
    // - DEFENSE (掠食縮殼)：急速降至玄武岩底 (0.0 單位)，腹足牢吸岩石、全身縮殼互鎖
    var targetElev = 0.26;
    if (!this.isFloatingMode || this.state === 'DEFENSE') targetElev = 0.0;
    else if (this.state === 'HIBERNATION') targetElev = 0.04;
    else if (this.state === 'OVERHEAT') targetElev = 0.42;

    this.floatElevation += (targetElev - this.floatElevation) * 0.06;
    var floatActive = this.floatElevation > 0.02 ? (this.floatElevation / 0.26) : 0.0;

    // 3D 深海浮游流體動力波 (垂直起伏 + 水平流動漂移 + 輕微游動俯仰/側傾)
    var floatBob = Math.sin(this.swimTime * 1.25) * 0.048 * floatActive;
    var floatDriftX = Math.cos(this.swimTime * 0.72) * 0.040 * floatActive;
    var floatDriftZ = Math.sin(this.swimTime * 0.88) * 0.032 * floatActive;
    var floatPitch = Math.sin(this.swimTime * 1.25 - 0.4) * 0.035 * floatActive;
    var floatRoll = Math.cos(this.swimTime * 0.72) * 0.024 * floatActive;
    var currentElev = this.floatElevation + floatBob;

    // 過熱趨避運動：身體向後退縮 (+Z) 並左右大幅搖擺尋找冷卻水層
    var targetAvoidZ = this.overheatProgress * 0.24;
    var targetAvoidYaw = Math.sin(this.breathTime * 0.95) * 0.18 * this.overheatProgress;
    this.avoidOffsetZ += (targetAvoidZ - this.avoidOffsetZ) * 0.08;
    this.avoidYaw += (targetAvoidYaw - this.avoidYaw) * 0.08;

    // 5. 驅動 60 片橫紋金屬甲片：微流體推進波動 / 呼吸開闔 / 休眠半收 / 防禦互鎖
    var localXAxis = new THREE.Vector3(1, 0, 0);
    var localZAxis = new THREE.Vector3(0, 0, 1);
    var scaleLock = this.defenseProgress + this.hibernateProgress * 0.45 - this.overheatProgress * 0.25;

    for (var j = 0; j < this.scaleObjects.length; j++) {
      var sObj = this.scaleObjects[j];
      var sData = this.initialScalesData[j];

      // 計算沿著螺體前後 (Z) 與兩側 (X) 傳遞之微流體動力波相位
      var scalePhase = this.swimTime * 2.5 + (sData.pos.z * 4.2) + (Math.abs(sData.pos.x) * 2.0);
      var scaleSwimPitch = Math.sin(scalePhase) * 0.082 * activeFactor * (0.35 + floatActive * 0.65);
      var scaleRollWave = Math.cos(scalePhase) * 0.046 * Math.sign(sData.pos.x || 1) * activeFactor * (0.35 + floatActive * 0.65);
      var scaleDisplacement = Math.sin(scalePhase - 0.4) * 0.016 * activeFactor * floatActive;

      var radialContract = 1.0 - (this.defenseProgress * 0.24) - (this.hibernateProgress * 0.08) + (breathWave * 0.5);
      sObj.position.x = (sData.pos.x * radialContract) + (Math.sign(sData.pos.x || 1) * scaleDisplacement) + floatDriftX;
      sObj.position.y = sData.pos.y - (this.defenseProgress * 0.09) + currentElev;
      sObj.position.z = (sData.pos.z * radialContract) + this.avoidOffsetZ + floatDriftZ;

      var pitchAngle = (breathWave * 0.65) + scaleSwimPitch - (scaleLock * 0.22) + floatPitch;
      var pitchQuat = new THREE.Quaternion().setFromAxisAngle(localXAxis, pitchAngle);
      var rollQuat = new THREE.Quaternion().setFromAxisAngle(localZAxis, scaleRollWave + floatRoll);
      sObj.quaternion.copy(sData.quat).multiply(pitchQuat).multiply(rollQuat);
    }

    // 6. 腹足基座與海蛞蝓波浪荷葉肉裙 (隨浮游與呼吸起伏)
    for (var fIdx = 0; fIdx < this.footObjects.length; fIdx++) {
      var fItem = this.footObjects[fIdx];
      var skirtWave = Math.sin(this.swimTime * 2.1) * 0.022 * floatActive;
      var fScaleXZ = (1.0 - this.defenseProgress * 0.65 - this.hibernateProgress * 0.12) + (Math.sin(this.breathTime) * 0.018 * activeFactor) + skirtWave;
      var fScaleY = 1.0 - this.defenseProgress * 0.55;
      fItem.obj.scale.set(fScaleXZ, fScaleY, fScaleXZ);
      fItem.obj.position.x = fItem.pos.x + floatDriftX;
      fItem.obj.position.y = fItem.pos.y + (this.defenseProgress * 0.52) + currentElev;
      fItem.obj.position.z = fItem.pos.z + (this.defenseProgress * 0.14) + this.avoidOffsetZ + floatDriftZ;
    }

    // 7. 肉質頭盾、暗金齒舌與虹吸管（含趨熱追隨游標、過熱閃避與飄游位移）
    var headSway = (Math.sin(this.breathTime * 0.75) * 0.042 * activeFactor) + this.lookYaw + this.avoidYaw;
    for (var h = 0; h < this.headShieldObjects.length; h++) {
      var hItem = this.headShieldObjects[h];
      var hScale = 1.0 - this.defenseProgress * 0.58;
      hItem.obj.scale.set(hScale, hScale, hScale);
      hItem.obj.position.x = hItem.pos.x + headSway + floatDriftX;
      hItem.obj.position.z = hItem.pos.z + (this.defenseProgress * 0.65) + this.avoidOffsetZ + floatDriftZ;
      hItem.obj.position.y = hItem.pos.y + (this.defenseProgress * 0.45) - (this.hibernateProgress * 0.06) + this.lookPitch + currentElev;
    }
    if (this.radulaObj) {
      var scrape = Math.sin(this.breathTime * 2.4) * 0.032 * activeFactor;
      var rScale = 1.0 - this.defenseProgress * 0.62;
      this.radulaObj.obj.scale.set(rScale, rScale, rScale);
      this.radulaObj.obj.position.x = this.radulaObj.pos.x + headSway + floatDriftX;
      this.radulaObj.obj.position.z = this.radulaObj.pos.z + scrape + (this.defenseProgress * 0.68) + this.avoidOffsetZ + floatDriftZ;
      this.radulaObj.obj.position.y = this.radulaObj.pos.y + (this.defenseProgress * 0.48) + currentElev;
    }
    if (this.siphonObj) {
      var sPulse = Math.sin(this.breathTime * 1.3) * (0.035 * activeFactor + 0.06 * this.overheatProgress);
      var sScale = (1.0 + this.overheatProgress * 0.25) - this.defenseProgress * 0.55;
      this.siphonObj.obj.scale.set(sScale, sScale, sScale);
      this.siphonObj.obj.position.x = this.siphonObj.pos.x - (this.defenseProgress * 0.28) + headSway * 0.5 + floatDriftX;
      this.siphonObj.obj.position.z = this.siphonObj.pos.z + (this.defenseProgress * 0.46) + this.avoidOffsetZ + floatDriftZ;
      this.siphonObj.obj.position.y = this.siphonObj.pos.y + sPulse + (this.defenseProgress * 0.22) + currentElev;
    }

    // 8. 紅外線球端小觸角與 S 型化學觸鬚：水流波動與絲滑游動搖曳
    for (var ft = 0; ft < this.frontTentacleObjects.length; ft++) {
      var ftItem = this.frontTentacleObjects[ft];
      var ftPhase = this.swimTime * 2.4 + ft * 1.15;
      var ftWaveX = Math.sin(ftPhase) * 0.034 * activeFactor;
      var ftWaveY = Math.cos(ftPhase * 0.85) * 0.024 * activeFactor;
      var ftPitch = Math.sin(ftPhase - 0.5) * 0.085 * activeFactor;

      ftItem.obj.position.x = ftItem.pos.x + headSway * 1.25 + ftWaveX + floatDriftX;
      if (ftItem.isBulbOrMini) {
        ftItem.obj.position.z = ftItem.pos.z + (this.defenseProgress * 0.25) + this.avoidOffsetZ + floatDriftZ;
        ftItem.obj.position.y = ftItem.pos.y - (this.defenseProgress * 0.22) - (this.hibernateProgress * 0.08) + this.lookPitch * 1.4 + ftWaveY + currentElev;
      } else {
        ftItem.obj.position.z = ftItem.pos.z + (this.defenseProgress * 0.36) + this.avoidOffsetZ + floatDriftZ;
        ftItem.obj.position.y = ftItem.pos.y - (this.defenseProgress * 0.05) + this.lookPitch + ftWaveY + currentElev;
      }
      ftItem.obj.rotation.x = ftItem.rot.x + ftPitch + floatPitch;
      ftItem.obj.rotation.z = ftItem.rot.z + ftWaveX * 1.8 + floatRoll;
    }

    for (var t = 0; t < this.perimTentacleObjects.length; t++) {
      var tItem = this.perimTentacleObjects[t];
      var pPhase = this.swimTime * 2.1 + t * 0.75;
      var waveY = Math.sin(pPhase) * (0.075 * activeFactor + 0.11 * this.overheatProgress);
      var waveZ = Math.cos(pPhase) * (0.055 * activeFactor);
      tItem.obj.rotation.y = tItem.rot.y + waveY;
      tItem.obj.rotation.x = tItem.rot.x + waveZ * 0.6 + floatPitch;
      var pScale = 1.0 - this.defenseProgress * 0.30 - this.hibernateProgress * 0.15;
      tItem.obj.scale.set(pScale, 1.0, pScale);
      tItem.obj.position.x = tItem.pos.x + floatDriftX;
      tItem.obj.position.y = tItem.pos.y - (this.defenseProgress * 0.04) + currentElev + (Math.sin(pPhase) * 0.02 * activeFactor);
      tItem.obj.position.z = tItem.pos.z + this.avoidOffsetZ + floatDriftZ;
    }

    // 9. 65% 螺旋巨殼與背部中央呼吸孔
    for (var sg = 0; sg < this.shellGroupObjects.length; sg++) {
      var sgItem = this.shellGroupObjects[sg];
      sgItem.obj.position.x = sgItem.pos.x + floatDriftX;
      sgItem.obj.position.y = sgItem.pos.y - (this.defenseProgress * 0.20) + breathWave * 0.35 + currentElev;
      sgItem.obj.position.z = sgItem.pos.z + this.avoidOffsetZ + floatDriftZ;
      sgItem.obj.rotation.y = sgItem.rot.y + this.avoidYaw * 0.35;
      sgItem.obj.rotation.x = sgItem.rot.x + floatPitch * 0.65;
      sgItem.obj.rotation.z = sgItem.rot.z + floatRoll * 0.65;
    }
    if (this.ventObj) {
      var vScale = 1.0 + (breathWave * 1.6) + (this.overheatProgress * 0.35) - (this.defenseProgress * 0.20);
      this.ventObj.scale.set(vScale, 0.45, vScale);
    }
  }
}

// 建立全域古螺族群清單 (0:原版 0.38, 1:小25% 0.285, 2:小50% 0.19)
var creatures = [];
var creature = new LoricataCreature();
creatures.push(creature);
var baseObjectsList = [];
var smokeBurstIntensity = 0;

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

  var width = container.clientWidth || (window.innerWidth > 500 ? window.innerWidth - 390 : window.innerWidth) || 800;
  var height = container.clientHeight || window.innerHeight || 600;

  if (typeof THREE === 'undefined') {
    container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#d4a754;font-size:16px;">⚠️ 正在載入 3D 引擎，請確認網路連線或重新整理頁面...</div>';
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09101a);
  scene.fog = new THREE.FogExp2(0x09101a, 0.045);

  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(2.85, 1.65, 2.75);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (renderer.toneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
  }
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  if (THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.45, 0.0);
    controls.maxDistance = 10.0;
    controls.minDistance = 1.0;
    // 將左鍵保留給「按住引導古螺游動」，右鍵拖曳旋轉 3D 視角
    controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
  }

  setupLighting();
  setupDeepSeaParticles();
  setupDefenseSmokeSystem();
  loadBlenderModel();
  setupMouseSensoryEvents(container);

  window.addEventListener('resize', onWindowResize);
  animate();
}

var isLeftMouseDown = false;
var mouseRaycaster = new THREE.Raycaster();
var mouseTargetPlane = new THREE.Plane();
var mouseIntersection = new THREE.Vector3();

function updateMouseSwimTarget(clientX, clientY, container) {
  if (!camera || creatures.length === 0) return;
  var rect = container.getBoundingClientRect();
  var nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  var ny = -((clientY - rect.top) / rect.height) * 2 + 1;
  cursorNDC.x = nx;
  cursorNDC.y = ny;

  mouseRaycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
  var planeNormal = new THREE.Vector3().subVectors(camera.position, creature.worldPos).normalize();
  mouseTargetPlane.setFromNormalAndCoplanarPoint(planeNormal, creature.worldPos);

  if (mouseRaycaster.ray.intersectPlane(mouseTargetPlane, mouseIntersection)) {
    mouseIntersection.x = Math.max(-2.6, Math.min(2.6, mouseIntersection.x));
    mouseIntersection.y = Math.max(0.12, Math.min(2.1, mouseIntersection.y));
    mouseIntersection.z = Math.max(-2.4, Math.min(2.4, mouseIntersection.z));

    // 原版首領朝鼠標導航前進，小的兩隻在 update() 中動態鎖定首領後方護衛巡航
    creatures[0].targetPos.copy(mouseIntersection);
    for (var c = 0; c < creatures.length; c++) {
      creatures[c].isMouseGuiding = true;
    }
  }
}

function setupMouseSensoryEvents(container) {
  container.addEventListener('mousedown', function(e) {
    if (e.button === 0) { // 左鍵按住引導群體游動
      isLeftMouseDown = true;
      for (var c = 0; c < creatures.length; c++) {
        creatures[c].isMouseGuiding = true;
      }
      updateMouseSwimTarget(e.clientX, e.clientY, container);
    }
  });

  window.addEventListener('mouseup', function(e) {
    if (e.button === 0) {
      isLeftMouseDown = false;
      for (var c = 0; c < creatures.length; c++) {
        creatures[c].isMouseGuiding = false;
        creatures[c].wanderTimer = 3.2 + c * 1.2;
      }
    }
  });

  container.addEventListener('mousemove', function(e) {
    var rect = container.getBoundingClientRect();
    var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    var ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    cursorNDC.speed = Math.sqrt(Math.pow(nx - cursorNDC.lastX, 2) + Math.pow(ny - cursorNDC.lastY, 2));
    cursorNDC.x = nx;
    cursorNDC.y = ny;
    cursorNDC.lastX = nx;
    cursorNDC.lastY = ny;

    if (isLeftMouseDown) {
      updateMouseSwimTarget(e.clientX, e.clientY, container);
    }
  });

  // 雙擊畫面觸發群體驚嚇防禦 (4.5 秒後若無干擾自動解除)
  container.addEventListener('dblclick', function() {
    if (autoDemoActive) window.toggleAutoDemo();
    for (var c = 0; c < creatures.length; c++) {
      creatures[c].triggerThreat(4.5);
    }
    syncPresetButtonsUI();
  });
}

function setupLighting() {
  var ambientLight = new THREE.AmbientLight(0x526d8c, 1.35);
  scene.add(ambientLight);

  var keyLight = new THREE.DirectionalLight(0xfff1de, 2.2);
  keyLight.position.set(3.2, 2.8, 3.0);
  scene.add(keyLight);

  var rimLight = new THREE.DirectionalLight(0xffbe55, 2.0);
  rimLight.position.set(-3.2, 2.4, -2.6);
  scene.add(rimLight);

  topBlueLight = new THREE.DirectionalLight(0x74c0ff, 1.4);
  topBlueLight.position.set(0.0, 4.2, 0.5);
  scene.add(topBlueLight);

  geoLightFront = new THREE.PointLight(0xff5a1f, 2.6, 5.5);
  geoLightFront.position.set(0.5, 0.18, 1.25);
  scene.add(geoLightFront);

  geoLightBack = new THREE.PointLight(0xff4814, 2.0, 5.0);
  geoLightBack.position.set(-0.6, 0.20, -0.8);
  scene.add(geoLightBack);
}

function setupDeepSeaParticles() {
  var particleCount = 240;
  var geometry = new THREE.BufferGeometry();
  var positions = new Float32Array(particleCount * 3);

  for (var i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 8;
    positions[i + 1] = (Math.random() - 0.2) * 5;
    positions[i + 2] = (Math.random() - 0.5) * 8;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  var material = new THREE.PointsMaterial({
    color: 0xd4a754,
    size: 0.04,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending
  });

  particlesMesh = new THREE.Points(geometry, material);
  scene.add(particlesMesh);
}

function setupDefenseSmokeSystem() {
  var count = 95;
  var geo = new THREE.BufferGeometry();
  var pos = new Float32Array(count * 3);
  smokeVelocities = [];

  for (var i = 0; i < count; i++) {
    pos[i * 3] = 0.04;
    pos[i * 3 + 1] = 1.28;
    pos[i * 3 + 2] = 0.06;
    smokeVelocities.push({
      vx: (Math.random() - 0.5) * 0.028,
      vy: 0.022 + Math.random() * 0.038,
      vz: (Math.random() - 0.5) * 0.028,
      life: Math.random()
    });
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var mat = new THREE.PointsMaterial({
    color: 0xff6a28,
    size: 0.078,
    transparent: true,
    opacity: 0.0
  });

  defenseSmokeMesh = new THREE.Points(geo, mat);
  scene.add(defenseSmokeMesh);
}

function createSandblastedSkinTexture() {
  var canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  var ctx = canvas.getContext('2d');
  var imgData = ctx.createImageData(512, 512);
  var data = imgData.data;

  var seed = 1337;
  for (var i = 0; i < data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) | 0;
    var r1 = (seed >>> 16) & 255;
    seed = (seed * 22695477 + 1) | 0;
    var r2 = (seed >>> 16) & 255;
    var val = Math.floor((r1 * 0.6 + r2 * 0.4));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  var tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.needsUpdate = true;
  return tex;
}

function loadBlenderModel() {
  if (typeof SNAIL_GLB_BASE64 === 'undefined' || !THREE.GLTFLoader) return;

  var sandblastTex = createSandblastedSkinTexture();
  var loader = new THREE.GLTFLoader();
  var arrayBuffer = base64ToArrayBuffer(SNAIL_GLB_BASE64);

  loader.parse(arrayBuffer, '', function(gltf) {
    // 1. 將玄武岩底座移至 scene 層級，預設隱藏 (地板移除)
    var basalts = [];
    for (var b = 0; b < gltf.scene.children.length; b++) {
      var child = gltf.scene.children[b];
      if (child.name && child.name.indexOf('Basalt_') === 0) {
        basalts.push(child);
      }
    }
    baseObjectsList = [];
    for (var k = 0; k < basalts.length; k++) {
      var bObj = basalts[k];
      scene.add(bObj);
      bObj.scale.set(0.38, 0.38, 0.38);
      bObj.visible = false;
      baseObjectsList.push(bObj);
    }
    showRockBase = false;

    // 2. 依使用者需求：小的兩隻再縮小 15% (0.242 與 0.162)，且恆在首領後方護衛巡航，維持 30% 半透明
    var snailConfigs = [
      { scale: 0.380, pos: new THREE.Vector3(0, 0.50, 0),         opacity: 1.0,  name: '原版首領' },
      { scale: 0.242, pos: new THREE.Vector3(-1.45, 0.65, 2.00), opacity: 0.70, name: '小25%伴隨(縮小15%)' },
      { scale: 0.162, pos: new THREE.Vector3(1.35, 0.38, 2.75),   opacity: 0.70, name: '小50%幼體(縮小15%)' }
    ];

    creatures = [];

    for (var i = 0; i < snailConfigs.length; i++) {
      var cfg = snailConfigs[i];
      var cInst = new LoricataCreature();
      cInst.index = i;
      cInst.scaleVal = cfg.scale;
      cInst.worldPos.copy(cfg.pos);
      cInst.targetPos.copy(cfg.pos);
      cInst.swimTime = i * 2.3;    // 錯開游動相位，讓每隻律動不同
      cInst.wanderTimer = i * 1.9; // 錯開巡航轉向計時

      var currentModel;
      if (i === 0) {
        currentModel = gltf.scene;
      } else {
        currentModel = gltf.scene.clone(true);
        // 為複製出的伴隨個體深層複製材質，使其生物螢光能獨立動態運作，並依指示設定 30% 透明 (70% 不透明)
        currentModel.traverse(function(node) {
          if (node.isMesh && node.material) {
            var mats = Array.isArray(node.material) ? node.material : [node.material];
            var clonedMats = [];
            for (var m = 0; m < mats.length; m++) {
              var clonedM = mats[m].clone();
              if (cfg.opacity < 1.0) {
                clonedM.transparent = true;
                clonedM.opacity = cfg.opacity;
                clonedM.depthWrite = true;
              }
              clonedMats.push(clonedM);
            }
            node.material = Array.isArray(node.material) ? clonedMats : clonedMats[0];
          }
        });
      }

      currentModel.scale.set(cfg.scale, cfg.scale, cfg.scale);
      currentModel.position.copy(cInst.worldPos);
      scene.add(currentModel);

      cInst.bindModelNodes(currentModel, sandblastTex);
      creatures.push(cInst);
    }

    creature = creatures[0];
    snailModel = creatures[0].model;
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

  // 自動生態展演計時器 (每 5.5 秒切換一個狀態)
  if (autoDemoActive) {
    autoDemoTimer += 0.016;
    if (autoDemoTimer > 5.5) {
      autoDemoTimer = 0;
      autoDemoIndex = (autoDemoIndex + 1) % AUTO_DEMO_STATES.length;
      applyPresetInternal(AUTO_DEMO_STATES[autoDemoIndex]);
    }
  }

  // 1. 讓古螺族群個體感知環境並更新狀態機與器官運動
  var tempSlider = document.getElementById('slider-temp');
  var h2sSlider = document.getElementById('slider-h2s');
  var currentTemp = tempSlider ? parseFloat(tempSlider.value) : 32;
  var currentH2S = h2sSlider ? parseFloat(h2sSlider.value) : 85;

  for (var c = 0; c < creatures.length; c++) {
    creatures[c].senseEnvironment(currentTemp, currentH2S, cursorNDC);
    creatures[c].update();
  }

  // 2. 環境粒子與燈光隨水溫動態反應
  if (particlesMesh) {
    particlesMesh.rotation.y += 0.0008;
    var pos = particlesMesh.geometry.attributes.position.array;
    var riseSpeed = (creature.state === 'HIBERNATION') ? -0.0025 : (creature.state === 'OVERHEAT' ? 0.014 : 0.0045);
    for (var i = 1; i < pos.length; i += 3) {
      pos[i] += riseSpeed;
      if (pos[i] > 3.5) pos[i] = -1.5;
      if (pos[i] < -1.5) pos[i] = 3.5;
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    if (creature.state === 'HIBERNATION') {
      particlesMesh.material.color.setHex(0x88ccff);
    } else if (creature.state === 'OVERHEAT') {
      particlesMesh.material.color.setHex(0xff7733);
    } else {
      particlesMesh.material.color.setHex(0xd4a754);
    }
    particlesMesh.material.opacity = 0.25 + (currentH2S / 100.0) * 0.55;
  }

  // 地熱底部暖光與深海冷光隨環境水溫連動
  if (geoLightFront && geoLightBack && topBlueLight) {
    var heatRatio = Math.max(0, Math.min(1.5, (currentTemp - 5) / 65));
    geoLightFront.intensity = 2.6 * heatRatio;
    geoLightBack.intensity = 2.0 * heatRatio;
    topBlueLight.intensity = (creature.state === 'HIBERNATION') ? 2.4 : 1.4;
  }

  // 3. 防禦黑煙或過熱高溫蒸氣噴發粒子更新 (支援族群個體共同噴煙)
  if (defenseSmokeMesh) {
    var shouldEmitSmoke = (creature.state === 'DEFENSE' || creature.state === 'OVERHEAT');
    if (shouldEmitSmoke) {
      smokeBurstIntensity = Math.min(0.88, smokeBurstIntensity + 0.05);
      defenseSmokeMesh.material.color.setHex(creature.state === 'DEFENSE' ? 0xff5520 : 0xffcc66);
    } else {
      smokeBurstIntensity = Math.max(0.0, smokeBurstIntensity - 0.03);
    }
    defenseSmokeMesh.material.opacity = smokeBurstIntensity;
    var sPos = defenseSmokeMesh.geometry.attributes.position.array;
    for (var k = 0; k < smokeVelocities.length; k++) {
      var vel = smokeVelocities[k];
      sPos[k * 3] += vel.vx;
      sPos[k * 3 + 1] += vel.vy;
      sPos[k * 3 + 2] += vel.vz;
      vel.life += 0.026;
      if (vel.life > 1.0) {
        var sourceC = creatures[k % creatures.length] || creature;
        sPos[k * 3] = sourceC.worldPos.x + (Math.random() - 0.5) * 0.08;
        sPos[k * 3 + 1] = sourceC.worldPos.y + 0.62 * (sourceC.scaleVal / 0.380);
        sPos[k * 3 + 2] = sourceC.worldPos.z + (Math.random() - 0.5) * 0.08;
        vel.life = 0.0;
      }
    }
    defenseSmokeMesh.geometry.attributes.position.needsUpdate = true;
  }

  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);

  updateDashboardUI();
}

function updateDashboardUI() {
  var bpmElem = document.getElementById('metric-bpm');
  var effElem = document.getElementById('metric-eff');
  var bodyTempElem = document.getElementById('metric-body-temp');
  var stressElem = document.getElementById('metric-stress');
  var stateElem = document.getElementById('state-badge');
  var hudTitle = document.getElementById('hud-state-title');
  var hudDesc = document.getElementById('hud-state-desc');
  var hudSensor = document.getElementById('hud-sensor-readout');
  var detailBox = document.getElementById('behavior-detail-box');

  if (bpmElem) bpmElem.innerText = creature.heartRate + " BPM";
  if (effElem) effElem.innerText = creature.symbiosisEff + " %";
  if (bodyTempElem) bodyTempElem.innerText = creature.bodyTemp.toFixed(1) + " °C";
  if (stressElem) stressElem.innerText = creature.stressLevel + " %";

  if (hudSensor) {
    var threatTxt = (creature.state === 'DEFENSE') ? "⚠️ 掠食者警報" : "安全";
    hudSensor.innerText = "水溫: " + creature.envTemp + "°C | H₂S: " + creature.h2sLevel + "% | 威脅: " + threatTxt;
  }

  if (!stateElem || !hudTitle || !hudDesc || !detailBox) return;

  if (creature.state === 'FORAGING') {
    stateElem.innerText = "● 狀態 ①：【適溫趨熱覓食】（青綠共生光＋齒舌刮食）";
    stateElem.className = "mode-foraging";
    hudTitle.innerText = "🌿 狀態 ①：適溫趨熱覓食 (FORAGING | 18~45°C)";
    hudTitle.style.color = "#4ef0b5";
    hudDesc.innerText = "紅外線球端觸角即時追蹤游標熱源，暗金齒舌高頻刮食熱液生物膜，化能自營效率最高";
    detailBox.innerHTML = "<strong>【感官】</strong>1對球端紅外線觸角鎖定 18~45°C 適溫區並追隨游標熱源。<br><strong>【運動】</strong>頭盾舒張擺動、暗金齒舌高頻刮食玄武岩生物膜，60片橫紋甲片隨呼吸規律開闔。<br><strong>【代謝】</strong>共生硫氧化菌呈現穩定幽冥青綠光，碳固定率達 90% 以上。";
  } else if (creature.state === 'HIBERNATION') {
    stateElem.innerText = "● 狀態 ②：【極寒低溫休眠】（冰晶藍光＋甲片半收保溫）";
    stateElem.className = "mode-hibernation";
    hudTitle.innerText = "❄️ 狀態 ②：極寒低溫休眠 (HIBERNATION | <10°C)";
    hudTitle.style.color = "#64bfff";
    hudDesc.innerText = "遠離黑煙囪熱源，心率降至 9 BPM，鱗片半收攏鎖住體溫，停止刮食以節省 ATP 能量";
    detailBox.innerHTML = "<strong>【感官】</strong>偵測環境水溫低於 10°C 極寒閾值，觸發低溫休眠保護機制。<br><strong>【運動】</strong>頭盾與觸角低垂停止探索，齒舌停止刮食，60片甲片向內半收攏減少熱散失。<br><strong>【代謝】</strong>生物螢光轉為冰晶幽藍微光，心率降至 9 BPM 極低耗能狀態。";
  } else if (creature.state === 'OVERHEAT') {
    stateElem.innerText = "● 狀態 ③：【噴泉過熱趨避】（琥珀閃爍＋後退擺動排熱）";
    stateElem.className = "mode-overheat";
    hudTitle.innerText = "🔥 狀態 ③：噴泉過熱趨避 (OVERHEAT AVOID | >60°C)";
    hudTitle.style.color = "#ffc845";
    hudDesc.innerText = "黑煙囪高溫噴發超過 60°C！古螺主動向後退縮並左右搖擺逃離熱源，呼吸孔張開高速排熱";
    detailBox.innerHTML = "<strong>【感官】</strong>紅外線觸角偵測水溫超過 60°C 蛋白質變性臨界點，觸發熱應激警報！<br><strong>【運動】</strong>軀幹主動向後退縮並左右大幅搖擺尋找冷卻水層，背殼中央呼吸孔與虹吸管全開排熱。<br><strong>【代謝】</strong>共生菌呈現高頻閃爍琥珀黃光，心率飆升至 80+ BPM。";
  } else if (creature.state === 'DEFENSE') {
    stateElem.innerText = "● 狀態 ④：【穿山甲縮殼互鎖】（熔岩橘紅警戒光＋噴發黑煙）";
    stateElem.className = "mode-defense";
    hudTitle.innerText = "🛡️ 狀態 ④：穿山甲縮殼互鎖 (DEFENSE LOCK | 掠食者威脅)";
    hudTitle.style.color = "#ff6e52";
    hudDesc.innerText = "偵測外部機械震波襲擊！頭盾、腹足與荷葉肉裙 100% 縮入螺旋殼內，60片甲片下壓互鎖並噴發黑煙";
    detailBox.innerHTML = "<strong>【感官】</strong>四周 S 型化學與機械觸鬚偵測掠食者逼近，神經壓力值飆升至 98%！<br><strong>【運動】</strong>頭盾、腹足與肉裙全數收進 65% 螺旋巨殼，僅微露觸角尖端監測，60片硫化鐵甲片下壓互鎖。<br><strong>【防禦】</strong>瞬間切換熔岩橘紅警戒光，背殼呼吸孔噴發濃厚硫化鐵黑煙障眼雲！";
  }
}

function applyPresetInternal(mode) {
  var tempSlider = document.getElementById('slider-temp');
  var tempValTxt = document.getElementById('val-temp');

  for (var c = 0; c < creatures.length; c++) {
    var cInst = creatures[c];
    if (mode === 'FORAGING') {
      cInst.externalThreat = false;
      cInst.threatCooldown = 0;
    } else if (mode === 'HIBERNATION') {
      cInst.externalThreat = false;
      cInst.threatCooldown = 0;
    } else if (mode === 'OVERHEAT') {
      cInst.externalThreat = false;
      cInst.threatCooldown = 0;
    } else if (mode === 'DEFENSE') {
      cInst.triggerThreat(0); // 持續維持警戒直到切換
    }
  }

  if (mode === 'FORAGING') {
    if (tempSlider) tempSlider.value = 32;
    if (tempValTxt) tempValTxt.innerText = "32 °C (適溫帶)";
  } else if (mode === 'HIBERNATION') {
    if (tempSlider) tempSlider.value = 4;
    if (tempValTxt) tempValTxt.innerText = "4 °C (極寒休眠)";
  } else if (mode === 'OVERHEAT') {
    if (tempSlider) tempSlider.value = 85;
    if (tempValTxt) tempValTxt.innerText = "85 °C (噴泉過熱)";
  }

  syncPresetButtonsUI(mode);
}

function syncPresetButtonsUI(forcedMode) {
  var activeMode = forcedMode || creature.state;
  var map = {
    'FORAGING': 'preset-forage',
    'HIBERNATION': 'preset-hibernate',
    'OVERHEAT': 'preset-overheat',
    'DEFENSE': 'preset-defense'
  };
  for (var key in map) {
    var btn = document.getElementById(map[key]);
    if (btn) {
      btn.className = (key === activeMode) ? "preset-btn active" : "preset-btn";
    }
  }
}

window.applyEnvPreset = function(mode) {
  if (autoDemoActive) window.toggleAutoDemo();
  applyPresetInternal(mode);
};

window.onEnvSliderChange = function() {
  if (autoDemoActive) window.toggleAutoDemo();
  for (var c = 0; c < creatures.length; c++) {
    creatures[c].externalThreat = false;
    creatures[c].threatCooldown = 0;
  }

  var tempSlider = document.getElementById('slider-temp');
  var h2sSlider = document.getElementById('slider-h2s');
  var tempValTxt = document.getElementById('val-temp');
  var h2sValTxt = document.getElementById('val-h2s');

  if (tempSlider && tempValTxt) {
    var t = parseInt(tempSlider.value, 10);
    var tag = (t <= 10) ? "(極寒休眠)" : (t >= 60 ? "(噴泉過熱)" : "(適溫帶)");
    tempValTxt.innerText = t + " °C " + tag;
  }
  if (h2sSlider && h2sValTxt) {
    h2sValTxt.innerText = h2sSlider.value + " %";
  }
  setTimeout(function() { syncPresetButtonsUI(); }, 30);
};

window.toggleAutoDemo = function() {
  autoDemoActive = !autoDemoActive;
  var btn = document.getElementById('btn-auto-demo');
  var tag = document.getElementById('auto-demo-tag');
  if (autoDemoActive) {
    autoDemoTimer = 0;
    autoDemoIndex = 0;
    applyPresetInternal(AUTO_DEMO_STATES[0]);
    if (btn) {
      btn.innerText = "⏹️ 停止【自動循環展演】（切換回手動控制）";
      btn.className = "action-btn demo-btn running";
    }
    if (tag) {
      tag.innerText = "⚡ 自動循環展演中 (5.5秒/態)";
      tag.style.color = "#ffd275";
    }
  } else {
    if (btn) {
      btn.innerText = "▶️ 啟動【四態環境反應自動循環展演】";
      btn.className = "action-btn demo-btn";
    }
    if (tag) {
      tag.innerText = "手動/滑鼠互動中";
      tag.style.color = "#4ef0b5";
    }
  }
};

window.toggleFloatingMode = function() {
  var nextState = !creature.isFloatingMode;
  for (var c = 0; c < creatures.length; c++) {
    creatures[c].isFloatingMode = nextState;
  }
  var btn = document.getElementById('btn-float-mode');
  if (btn) {
    if (nextState) {
      btn.innerText = "🌊 水底飄遊動態：已開啟（微擺鐵片與觸角游弋）";
      btn.className = "action-btn float-btn active";
    } else {
      btn.innerText = "🪨 水底飄遊動態：已關閉（底棲固定態）";
      btn.className = "action-btn float-btn";
    }
  }
};

window.toggleRockBase = function() {
  showRockBase = !showRockBase;
  for (var i = 0; i < baseObjectsList.length; i++) {
    baseObjectsList[i].visible = showRockBase;
  }
};

window.addEventListener('load', function() {
  init3DViewer();
});
