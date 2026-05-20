// Metro 설정 — pnpm 모노레포 + NativeWind v4
// docs: https://docs.expo.dev/guides/monorepos/
//       https://www.nativewind.dev/getting-started/expo-router
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 워크스페이스 루트의 모든 파일을 워치 (packages/shared 변경 감지)
config.watchFolders = [workspaceRoot];

// 패키지 해석 경로: 앱 내부 → 워크스페이스 루트 node_modules 순
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// pnpm symlink 안정성을 위해 계층적 검색 비활성화
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
