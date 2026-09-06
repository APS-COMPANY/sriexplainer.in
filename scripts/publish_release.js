/**
 * Sri Explainer - 1-Click Automated GitHub Release & APK Publisher
 * 
 * Automatically:
 * 1. Resolves GitHub PAT token from git remote or environment
 * 2. Extracts version name from android/app/build.gradle (e.g. 1.2.1)
 * 3. Copies APK to frontend/public/sriexplainer.apk (website direct download)
 * 4. Creates GitHub Release v{version}
 * 5. Uploads SriExplainer.apk to GitHub Release assets
 * 6. Logs direct download URLs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_OWNER = 'APS-COMPANY';
const REPO_NAME = 'sriexplainer.in';

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/https:\/\/[^:]+:([^@]+)@github\.com/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (err) {
    console.error('Failed to read git remote:', err.message);
  }
  return null;
}

function getAppVersion() {
  const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
  if (!fs.existsSync(gradlePath)) {
    throw new Error('Could not find android/app/build.gradle');
  }
  const content = fs.readFileSync(gradlePath, 'utf8');
  const match = content.match(/versionName\s+["']([^"']+)["']/);
  if (!match) {
    throw new Error('Could not find versionName in build.gradle');
  }
  return match[1];
}

async function main() {
  console.log('🚀 Sri Explainer Release Publisher Starting...');

  const token = getGitHubToken();
  if (!token) {
    console.error('❌ Error: Could not find GitHub token in git remote or GITHUB_TOKEN environment variable.');
    process.exit(1);
  }
  console.log('🔑 GitHub Token successfully detected.');

  const versionName = getAppVersion();
  const tag = `v${versionName}`;
  console.log(`📦 Publishing Version: ${versionName} (${tag})`);

  const apkSourcePath = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!fs.existsSync(apkSourcePath)) {
    console.error(`❌ APK file not found at: ${apkSourcePath}`);
    console.log('👉 Please build the APK first: cd android && ./gradlew assembleDebug');
    process.exit(1);
  }

  const apkStats = fs.statSync(apkSourcePath);
  const apkSizeMb = (apkStats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Built APK Found: ${apkSourcePath} (${apkSizeMb} MB)`);

  // 1. Copy to frontend/public/sriexplainer.apk and dist_android for direct downloads
  const publicApkPath = path.join(__dirname, '..', 'frontend', 'public', 'sriexplainer.apk');
  const distDir = path.join(__dirname, '..', 'dist_android');
  try {
    fs.mkdirSync(path.dirname(publicApkPath), { recursive: true });
    fs.copyFileSync(apkSourcePath, publicApkPath);
    fs.copyFileSync(apkSourcePath, path.join(__dirname, '..', 'frontend', 'public', `Sri Explainer ${versionName}.apk`));
    fs.copyFileSync(apkSourcePath, path.join(__dirname, '..', 'frontend', 'public', 'Sri Explainer.apk'));
    console.log(`🌐 Copied APK to frontend/public (available at https://sriexplainer.in/sriexplainer.apk)`);

    if (fs.existsSync(distDir)) {
      fs.copyFileSync(apkSourcePath, path.join(distDir, `Sri Explainer ${versionName}.apk`));
      fs.copyFileSync(apkSourcePath, path.join(distDir, 'Sri Explainer.apk'));
      console.log(`📁 Copied APK to dist_android/Sri Explainer ${versionName}.apk`);
    }
  } catch (err) {
    console.warn('⚠️ Could not copy to public or dist folder:', err.message);
  }

  // 2. Query GitHub Releases to see if release already exists
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SriExplainer-Publisher'
  };

  let release;
  console.log(`🔍 Checking if GitHub Release ${tag} already exists...`);
  const checkRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`, { headers });
  
  if (checkRes.ok) {
    release = await checkRes.json();
    console.log(`📌 Found existing release: ${release.html_url} (id: ${release.id})`);
  } else {
    console.log(`✨ Creating new GitHub Release ${tag}...`);
    const createRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: 'main',
        name: `Sri Explainer App ${tag}`,
        body: `### Sri Explainer App ${tag} 🎬\n\n` +
              `• In-App Automatic Updates enabled\n` +
              `• Added My Watchlist & Bookmarks\n` +
              `• Added In-App Episode Comments & Community\n` +
              `• Added Release Radar notification bell\n` +
              `• Player auto-healing & performance improvements\n\n` +
              `**Direct Download:** [SriExplainer.apk](https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${tag}/SriExplainer.apk)`,
        draft: false,
        prerelease: false
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create release: HTTP ${createRes.status} ${errText}`);
    }
    release = await createRes.json();
    console.log(`🎉 Created GitHub Release: ${release.html_url}`);
  }

  // 3. Check existing assets in release and remove old SriExplainer.apk if present
  if (release.assets && release.assets.length > 0) {
    for (const asset of release.assets) {
      if (asset.name === 'SriExplainer.apk' || asset.name === 'app-debug.apk') {
        console.log(`🗑️ Removing old asset: ${asset.name} (id: ${asset.id})...`);
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${asset.id}`, {
          method: 'DELETE',
          headers
        });
      }
    }
  }

  // 4. Upload SriExplainer.apk asset to release
  console.log(`⬆️ Uploading SriExplainer.apk (${apkSizeMb} MB) to GitHub Release...`);
  const apkBuffer = fs.readFileSync(apkSourcePath);
  const uploadUrl = `https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}/assets?name=SriExplainer.apk`;

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': apkBuffer.length
    },
    body: apkBuffer
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.warn(`Asset upload warning: HTTP ${uploadRes.status} ${errText}`);
  } else {
    console.log('✅ SriExplainer.apk uploaded successfully.');
  }

  // 5. Also upload Windows Setup EXE if found in dist_electron
  const winSetupPath = path.join(__dirname, '..', 'dist_electron', 'Sri Explainer Setup 1.0.0.exe');
  if (fs.existsSync(winSetupPath)) {
    const winBuffer = fs.readFileSync(winSetupPath);
    const winSizeMb = (winBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`⬆️ Uploading SriExplainer-Setup.exe (${winSizeMb} MB) to GitHub Release...`);
    
    // Check if asset already exists
    if (release.assets) {
      for (const a of release.assets) {
        if (a.name === 'SriExplainer-Setup.exe') {
          await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${a.id}`, { method: 'DELETE', headers });
        }
      }
    }

    const winUploadUrl = `https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}/assets?name=SriExplainer-Setup.exe`;
    const winRes = await fetch(winUploadUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Length': winBuffer.length
      },
      body: winBuffer
    });

    if (winRes.ok) {
      console.log('✅ SriExplainer-Setup.exe uploaded successfully.');
    } else {
      console.warn('⚠️ Could not upload Windows exe:', winRes.status);
    }
  }

  const directDownloadUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${tag}/SriExplainer.apk`;
  const winDownloadUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${tag}/SriExplainer-Setup.exe`;

  console.log('\n======================================================');
  console.log('🎉 SUCCESS! RELEASE PUBLISHED WORLDWIDE');
  console.log(`📦 Release: ${release.html_url}`);
  console.log(`📥 Android APK: ${directDownloadUrl}`);
  console.log(`💻 Windows EXE: ${winDownloadUrl}`);
  console.log(`🌐 Web Fallback: https://sriexplainer.in/sriexplainer.apk`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('❌ Release publication failed:', err);
  process.exit(1);
});
