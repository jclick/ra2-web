/**
 * 资源下载器
 * 从多个镜像下载RA2演示版资源
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MIRRORS = [
  {
    name: 'Internet Archive',
    url: 'https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip',
    protocol: 'https'
  },
  {
    name: 'Archive Alternative',
    url: 'https://archive.org/download/RedAlert2Demo/RA2Demo.zip',
    protocol: 'https'
  }
];

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// 确保目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    console.log(`下载: ${url}`);
    
    const file = fs.createWriteStream(outputPath);
    let downloaded = 0;
    let totalSize = 0;
    
    const request = protocol.get(url, { 
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 重定向
        console.log(`重定向到: ${response.headers.location}`);
        downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      totalSize = parseInt(response.headers['content-length'], 10) || 0;
      
      response.pipe(file);
      
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize > 0) {
          const percent = ((downloaded / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r进度: ${percent}% (${(downloaded/1024/1024).toFixed(1)} MB / ${(totalSize/1024/1024).toFixed(1)} MB)`);
        } else {
          process.stdout.write(`\r已下载: ${(downloaded/1024/1024).toFixed(1)} MB`);
        }
      });
      
      file.on('finish', () => {
        file.close();
        console.log('\n下载完成!');
        resolve(outputPath);
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
    
    request.on('timeout', () => {
      request.destroy();
      fs.unlink(outputPath, () => {});
      reject(new Error('请求超时'));
    });
  });
}

async function extractMixFromZip(zipPath, outputDir) {
  console.log('\n解压文件...');
  
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    
    const mixFiles = entries.filter(e => e.entryName.toLowerCase().endsWith('.mix'));
    
    if (mixFiles.length === 0) {
      console.log('未找到MIX文件');
      return false;
    }
    
    console.log(`找到 ${mixFiles.length} 个MIX文件:`);
    
    for (const entry of mixFiles) {
      console.log(`  提取: ${entry.entryName}`);
      zip.extractEntryTo(entry, outputDir, false, true);
    }
    
    return true;
  } catch (err) {
    console.error('解压失败:', err.message);
    console.log('请手动安装 adm-zip: npm install adm-zip');
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('红色警戒2 Web版 - 资源下载器');
  console.log('========================================\n');
  
  const zipPath = path.join(TEMP_DIR, 'RA2Demo.zip');
  
  // 尝试从各个镜像下载
  let downloaded = false;
  for (const mirror of MIRRORS) {
    console.log(`\n尝试从 ${mirror.name} 下载...`);
    try {
      await downloadFile(mirror.url, zipPath);
      downloaded = true;
      break;
    } catch (err) {
      console.log(`\n${mirror.name} 失败: ${err.message}`);
    }
  }
  
  if (!downloaded) {
    console.log('\n所有下载源都失败了。');
    console.log('请手动下载: https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip');
    console.log('然后运行: unzip RA2Demo.zip -d temp/ && cp temp/*/RA2/*.mix public/assets/');
    process.exit(1);
  }
  
  // 解压MIX文件
  const extracted = await extractMixFromZip(zipPath, OUTPUT_DIR);
  
  // 清理
  console.log('\n清理临时文件...');
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (e) {}
  
  if (extracted) {
    console.log('\n========================================');
    console.log('完成!');
    console.log('========================================');
    console.log(`\n资源已保存到: ${OUTPUT_DIR}`);
    console.log('\n现在可以启动游戏:');
    console.log('  npm run dev');
  }
}

main().catch(console.error);
