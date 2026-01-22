#!/usr/bin/env node
/**
 * UTF-8 인코딩 스캔 스크립트
 * - BOM 검출
 * - Mixed EOL 검출
 * - 모지바케 패턴 검출
 */

const fs = require('fs');
const path = require('path');

// BOM 시그니처
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

// 모지바케 패턴 (cp949로 잘못 읽은 UTF-8 한글)
const MOJIBAKE_PATTERNS = [
  /[\xc0-\xdf][\x80-\xbf]/g,  // 불완전 2바이트 시퀀스
  /\ufffd/g,                   // Replacement character
  /占쏙옙/g,                   // 일반적인 모지바케 패턴
];

const results = {
  bomFiles: [],
  mixedEolFiles: [],
  mojibakeFiles: [],
  cleanFiles: [],
};

function scanFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('utf8');
    const issues = [];

    // BOM 검사
    const hasBom = buffer.slice(0, 3).equals(UTF8_BOM);
    if (hasBom) {
      issues.push('BOM');
      results.bomFiles.push(filePath);
    }

    // EOL 검사
    const hasCRLF = content.includes('\r\n');
    const hasLF = content.includes('\n') && !content.includes('\r\n') ||
                  content.replace(/\r\n/g, '').includes('\n');

    if (hasCRLF && hasLF) {
      const crlfCount = (content.match(/\r\n/g) || []).length;
      const lfOnly = content.replace(/\r\n/g, '');
      const lfCount = (lfOnly.match(/\n/g) || []).length;
      if (crlfCount > 0 && lfCount > 0) {
        issues.push(`Mixed EOL (CRLF: ${crlfCount}, LF: ${lfCount})`);
        results.mixedEolFiles.push(filePath);
      }
    }

    // 모지바케 검사
    let hasMojibake = false;
    for (const pattern of MOJIBAKE_PATTERNS) {
      if (pattern.test(content)) {
        hasMojibake = true;
        break;
      }
    }

    // 추가: 연속된 비정상 문자 패턴 검사
    const suspiciousChars = content.match(/[가-힣]{0,2}[^\x00-\x7F\uAC00-\uD7AF]{3,}/g);
    if (suspiciousChars && suspiciousChars.length > 5) {
      hasMojibake = true;
    }

    if (hasMojibake) {
      issues.push('Mojibake suspected');
      results.mojibakeFiles.push(filePath);
    }

    if (issues.length === 0) {
      results.cleanFiles.push(filePath);
    }

    return { filePath, issues, hasBom, hasMojibake };
  } catch (err) {
    return { filePath, error: err.message };
  }
}

function walkDir(dir, extensions, exclude = []) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      // 제외 패턴 검사
      if (exclude.some(pattern => relativePath.includes(pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

function generateReport() {
  const timestamp = new Date().toISOString();
  let report = `# 인코딩 스캔 리포트

생성일시: ${timestamp}

## 요약

| 항목 | 파일 수 |
|------|---------|
| BOM 발견 | ${results.bomFiles.length} |
| Mixed EOL | ${results.mixedEolFiles.length} |
| 모지바케 의심 | ${results.mojibakeFiles.length} |
| 정상 | ${results.cleanFiles.length} |

---

## BOM 발견 파일

`;

  if (results.bomFiles.length > 0) {
    results.bomFiles.forEach(f => {
      report += `- \`${path.relative(process.cwd(), f)}\`\n`;
    });
  } else {
    report += '_없음_\n';
  }

  report += `
## Mixed EOL 파일

`;

  if (results.mixedEolFiles.length > 0) {
    results.mixedEolFiles.forEach(f => {
      report += `- \`${path.relative(process.cwd(), f)}\`\n`;
    });
  } else {
    report += '_없음_\n';
  }

  report += `
## 모지바케 의심 파일

`;

  if (results.mojibakeFiles.length > 0) {
    results.mojibakeFiles.forEach(f => {
      report += `- \`${path.relative(process.cwd(), f)}\`\n`;
    });
  } else {
    report += '_없음_\n';
  }

  return report;
}

// 메인 실행
const projectRoot = process.cwd();
const extensions = ['.md', '.ts', '.tsx', '.js', '.jsx', '.json', '.ps1', '.sh'];
const exclude = ['node_modules', '.next', 'dist', '.git'];

console.log('인코딩 스캔 시작...\n');

const files = walkDir(projectRoot, extensions, exclude);
console.log(`스캔 대상: ${files.length}개 파일\n`);

files.forEach(file => {
  const result = scanFile(file);
  if (result.issues && result.issues.length > 0) {
    console.log(`[!] ${path.relative(projectRoot, file)}: ${result.issues.join(', ')}`);
  }
});

console.log('\n스캔 완료.');
console.log(`- BOM: ${results.bomFiles.length}개`);
console.log(`- Mixed EOL: ${results.mixedEolFiles.length}개`);
console.log(`- 모지바케: ${results.mojibakeFiles.length}개`);

// 리포트 저장
const reportPath = path.join(projectRoot, 'reports', 'encoding_scan.md');
fs.writeFileSync(reportPath, generateReport(), 'utf8');
console.log(`\n리포트 저장: ${reportPath}`);
