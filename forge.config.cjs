module.exports = {
  packagerConfig: {
    name: 'Flamehorn Desktop', executableName: 'Flamehorn Desktop',
    extraResource: ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md'],
    asar: { unpack: '**/*.{node,dll,dat}' },
    ignore: [/^\/src(?:\/|$)/, /^\/tests(?:\/|$)/, /^\/scripts(?:\/|$)/, /^\/out(?:\/|$)/,
      /^\/docs(?:\/|$)/, /^\/\.git(?:\/|$)/, /^\/test-results(?:\/|$)/,
      /^\/artifacts(?:\/|$)/, /^\/\.github(?:\/|$)/],
  },
  rebuildConfig: {},
  makers: [{ name: '@electron-forge/maker-zip', platforms: ['win32'] }],
};
