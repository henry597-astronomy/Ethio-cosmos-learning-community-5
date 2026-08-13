const fs = require('fs');

// Patch engines.node in Capacitor packages
const packageFiles = [
  'node_modules/@capacitor/cli/package.json',
  'node_modules/@capacitor/android/package.json',
  'node_modules/@capacitor/core/package.json'
];

packageFiles.forEach(p => {
  if (fs.existsSync(p)) {
    try {
      let d = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (d.engines && d.engines.node) {
        d.engines.node = '>=18.0.0';
        fs.writeFileSync(p, JSON.stringify(d, null, 2));
        console.log(`Patched engines.node in ${p}`);
      }
    } catch (e) {
      console.error(`Error patching ${p}:`, e);
    }
  }
});

// Patch JavaVersion.VERSION_21 to VERSION_17 for Java 17 compatibility
const sourceFiles = [
  'node_modules/@capacitor/android/capacitor/build.gradle',
  'node_modules/@capacitor/cli/dist/android/update.js'
];

sourceFiles.forEach(p => {
  if (fs.existsSync(p)) {
    try {
      let c = fs.readFileSync(p, 'utf8');
      if (c.includes('VERSION_21')) {
        c = c.replace(/VERSION_21/g, 'VERSION_17');
        fs.writeFileSync(p, c, 'utf8');
        console.log(`Patched VERSION_21 to VERSION_17 in ${p}`);
      }
    } catch (e) {
      console.error(`Error patching ${p}:`, e);
    }
  }
});
