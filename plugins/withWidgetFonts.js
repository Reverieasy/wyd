const fs = require('node:fs/promises');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

// Widget text is rendered by a headless Android view, outside Expo's font loader.
module.exports = function withWidgetFonts(config) {
  return withDangerousMod(config, ['android', async config => {
    const folder = path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets/fonts');
    await fs.mkdir(folder, { recursive: true });
    const font = 'Nunito_800ExtraBold.ttf';
    await fs.copyFile(path.join(config.modRequest.projectRoot, 'node_modules/@expo-google-fonts/nunito/800ExtraBold', font), path.join(folder, font));
    return config;
  }]);
};
