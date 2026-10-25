export const southEntrance = { x: 0, z: 31 };
export const centralPlaza = { x: 0, z: 0 };
export const zoneBoundary = centralPlaza.z;
export const areaGate = {
  x: centralPlaza.x, z: zoneBoundary - 3.9,
  postOffset: 4.7, footWidth: .8, depth: .85, clearance: 3.5,
  northLabel: '趣味エリア', southLabel: 'ポートフォリオエリア',
};
export const areaGateSupports = [-1, 1].map(side => ({
  x: areaGate.x + side * areaGate.postOffset, z: areaGate.z,
  width: areaGate.footWidth, depth: areaGate.depth,
}));
export const positionVersion = 5;
export const positionStorageKey = 'portfolio-position-v5';
export const welcomeStorageKey = 'portfolio-welcome-v4';
