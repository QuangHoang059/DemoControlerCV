import { KeyDisplay } from "./utils";
import { CharacterControls } from "./characterControls";
import * as THREE from "three";
import { CameraHelper } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// Add a global declaration for the ImageCapture API
import { io } from "socket.io-client";
declare class ImageCapture {
  constructor(track: MediaStreamTrack);
  takePhoto(): Promise<Blob>;
  grabFrame(): Promise<ImageBitmap>;
}
// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.y = 5;
camera.position.z = 5;
camera.position.x = 0;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.update();

// LIGHTS
light();

// FLOOR
generateFloor();

// MODEL WITH ANIMATIONS
var characterControls: CharacterControls;
new GLTFLoader().load("models/Soldier.glb", function (gltf) {
  const model = gltf.scene;
  model.traverse(function (object: any) {
    if (object.isMesh) object.castShadow = true;
  });
  scene.add(model);

  const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const animationsMap: Map<string, THREE.AnimationAction> = new Map();
  gltfAnimations
    .filter((a) => a.name != "TPose")
    .forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a));
    });

  characterControls = new CharacterControls(
    model,
    mixer,
    animationsMap,
    orbitControls,
    camera,
    "Idle"
  );
});

// CONTROL KEYS
const keysPressed: Record<string, boolean> = {};
const keyDisplayQueue = new KeyDisplay();
let key: string = "";
document.addEventListener(
  "keydown",
  (event) => {
    keyDisplayQueue.down(event.key);

    if (event.shiftKey && characterControls) {
      characterControls.switchRunToggle();
    } else {
      (keysPressed as any)[event.key.toLowerCase()] = true;
      console.log(keysPressed);
      let mixerUpdateDelta = clock.getDelta();
      if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
      }
    }
  },
  false
);
document.addEventListener(
  "keyup",
  (event) => {
    keyDisplayQueue.up(event.key);
    (keysPressed as any)[event.key.toLowerCase()] = false;
    console.log(keysPressed);
  },
  false
);

const clock = new THREE.Clock();

const startButton = document.getElementById("start") as HTMLButtonElement;
const stopButton = document.getElementById("stop") as HTMLButtonElement;
const preview = document.getElementById("preview") as HTMLVideoElement;
const captures = document.getElementById("captures") as HTMLImageElement;

let captureInterval: any | undefined;
let stream: MediaStream;

// Request access to the user's camera
navigator.mediaDevices
  .getUserMedia({ video: { width: 224, height: 224 } })
  .then((mediaStream: MediaStream) => {
    stream = mediaStream;
    preview.srcObject = stream;
  })
  .catch((error: Error) => {
    console.error("Error accessing media devices.", error);
  });
const DELAY = 500 as const; //ms
const PING = 24 as const; //ms

// Start capturing images every 2 seconds
let startAnimate = false;
const intervalId = setInterval(() => {
  if (startAnimate) {
    updateAnimate(startAnimate);
  }
}, PING);
startButton.addEventListener("click", () => {
  startAnimate = true;
  if (stream) {
    captureInterval = setInterval(captureImage, DELAY);

    startButton.disabled = true;
    stopButton.disabled = false;
  }
});
console.log("Key pressesd", keysPressed);
// Stop capturing images
stopButton.addEventListener("click", () => {
  startAnimate = false;
  // clearInterval(intervalId);
  if (captureInterval) {
    clearInterval(captureInterval);
    startButton.disabled = false;
    stopButton.disabled = true;
  }
});

function captureImage(): void {
  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length > 0) {
    const track = videoTracks[0];
    const imageCapture = new ImageCapture(track);

    imageCapture
      .takePhoto()
      .then((blob: Blob) => ImageSend(blob))
      .catch((error: Error) => console.error("Error capturing image:", error));
  }
}

function ImageSend(blob: Blob): void {
  var img = new Image();
  img.src = URL.createObjectURL(blob);
  img.onload = function () {
    // Lấy đối tượng canvas và ngữ cảnh vẽ 2D
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    const ctx = canvas.getContext("2d");
    canvas.width = 224;
    canvas.height = 224;
    // Vẽ hình ảnh lên canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Lấy dữ liệu hình ảnh từ canvas
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // `imageData` chứa thông tin về pixel của hình ảnh
    var data = [];
    for (let i = 0; i < canvas.height; i++) {
      var row = [];
      for (let j = 0; j < canvas.width; j++) {
        var pixelIndex = (i * canvas.width + j) * 4; // Mỗi pixel có 4 giá trị RGBA
        var pixelData = [
          imageData.data[pixelIndex],
          imageData.data[pixelIndex + 1],
          imageData.data[pixelIndex + 2],
          // imageData.data[pixelIndex + 3]
        ];
        row.push(pixelData);
      }
      data.push(row);
    }

    sendImage(data);
    // Bạn có thể truy cập vào các pixel như sau:
    // var pixels = imageData.data;
    // console.log(pixels); // Là một mảng Uint8ClampedArray chứa các giá trị RGBA của từng pixel
  };
  captures.src = URL.createObjectURL(blob);
}
const socket = io("http://localhost:50001");
// Send data
let lastMove = "c";
const idxToKey: Record<number, string> = {
  0: "a",
  1: "d",
  2: "w",
  3: "c",
};
function sendImage(data: any) {
  socket.emit("image", { data: Array.from(data) });
}
socket.on("connect", () => {
  console.log("Connected to the server");
});

socket.on("response", (data: any) => {
  const pred = data["key"];
  // set other keys to false to prevent moving
  const newKey = idxToKey[pred];
  for (const key of ["a", "w", "d"]) {
    if (key != newKey) {
      keysPressed[key] = false;
    }
  }
  lastMove = newKey;
  console.log(lastMove);
  const imgElement = document.getElementById("hand");
  if (data.img) {
    const imgBase64 = data.img;
    (imgElement as HTMLImageElement).src = "data:image/png;base64," + imgBase64;
  } else {
    (imgElement as HTMLImageElement).src = "./unavailable.png";
  }
});

socket.on("disconnect", () => {
  console.log("Disconnected from the server");
});

function updateAnimate(start: boolean) {
  // Only update animation of last move
  keysPressed[lastMove] = start;
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }
}

// function sendImage(data: any) {
//   fetch("http://127.0.0.1:50001", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ data: Array.from(data) }),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       switch (data["key"]) {
//         case 0:
//           key = "a";
//           console.log("[info] LEFT");
//           break;
//         case 1:
//           key = "d";
//           console.log("[info] RIGHT");
//           break;
//         case 2:
//           key = "w";
//           console.log("[info] UP");
//           break;
//         default:
//           key = "c";
//       }
//       // console.log("Successfully uploaded:", data);
//       if (key != "") (keysPressed as any)[key.toLowerCase()] = true;
//       let mixerUpdateDelta = clock.getDelta();
//       if (characterControls) {
//         characterControls.update(mixerUpdateDelta, keysPressed);
//       }
//     })
//     .catch((error) => {
//       console.error("Error uploading image:", error);
//     });
// }

function animate() {
  let mixerUpdateDelta = clock.getDelta();

  orbitControls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();

// RESIZE HANDLER
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  keyDisplayQueue.updatePosition();
}
window.addEventListener("resize", onWindowResize);

function generateFloor() {
  // TEXTURES
  const textureLoader = new THREE.TextureLoader();
  const placeholder = textureLoader.load(
    "./textures/placeholder/placeholder.png"
  );
  const sandBaseColor = textureLoader.load(
    "./textures/sand/Sand 002_COLOR.jpg"
  );
  const sandNormalMap = textureLoader.load("./textures/sand/Sand 002_NRM.jpg");
  const sandHeightMap = textureLoader.load("./textures/sand/Sand 002_DISP.jpg");
  const sandAmbientOcclusion = textureLoader.load(
    "./textures/sand/Sand 002_OCC.jpg"
  );

  const WIDTH = 80;
  const LENGTH = 80;

  const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 1024, 1024);
  const material = new THREE.MeshStandardMaterial({
    map: sandBaseColor,
    normalMap: sandNormalMap,
    displacementMap: sandHeightMap,
    displacementScale: 0.1,
    aoMap: sandAmbientOcclusion,
  });
  wrapAndRepeatTexture(material.map);
  wrapAndRepeatTexture(material.normalMap);
  wrapAndRepeatTexture(material.displacementMap);
  wrapAndRepeatTexture(material.aoMap);
  // const material = new THREE.MeshPhongMaterial({ map: placeholder})

  const floor = new THREE.Mesh(geometry, material);
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
}

function wrapAndRepeatTexture(map: THREE.Texture) {
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.x = map.repeat.y = 10;
}

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-60, 100, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
  // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}
