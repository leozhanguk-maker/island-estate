// three.js 统一入口：核心库与用到的附加模块合成一个 THREE 命名空间（沿用拼接时代 THREE.OrbitControls 等写法）
import * as THREE_ from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export const THREE = Object.assign({}, THREE_, { OrbitControls, GLTFLoader, MeshoptDecoder, BufferGeometryUtils: { mergeGeometries, mergeVertices } });
