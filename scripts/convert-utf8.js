#!/usr/bin/env node
/**
 * UTF-8 BOM 제거 및 EOL 정규화 스크립트
 * - BOM (0xEF 0xBB 0xBF) 제거
 * - Mixed EOL을 LF로 정규화
 */

const fs = require('fs');
const path = require('path');

// BOM 시그니처
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

function removeBomAndNormalizeEol(filePath, dryRun = false) {
  try {
    const buffer = fs.readFileSync(filePath);
    let content = buffer.toString('utf8');
    let modified = false;
    const changes = [];

    // BOM 제거
    if (buffer.slice(0, 3).equals(UTF8_BOM)) {
      content = content.slice(1); // BOM은 문자열에서 1문자로 표현됨
      changes.push('BOM 제거');
      modified = true;
    }

    // EOL 정규화 (CRLF -> LF)
    if (content.includes('\r\n')) {
      const crlfCount = (content.match(/\r\n/g) || []).length;
      content = content.replace(/\r\n/g, '\n');
      changes.push(`CRLF -> LF (${crlfCount}줄)`);
      modified = true;
    }

    if (modified) {
      if (!dryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[OK] ${path.relative(process.cwd(), filePath)}: ${changes.join(', ')}`);
      } else {
        console.log(`[DRY] ${path.relative(process.cwd(), filePath)}: ${changes.join(', ')}`);
      }
      return true;
    }

    return false;
  } catch (err) {
    console.error(`[ERR] ${filePath}: ${err.message}`);
    return false;
  }
}

// 메인 실행
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const files = args.filter(arg => !arg.startsWith('--'));

if (files.length === 0) {
  console.log('사용법: node convert-utf8.js [--dry-run] <file1> [file2] ...');
  console.log('');
  console.log('옵션:');
  console.log('  --dry-run  실제 변경 없이 변환 내용만 표시');
  process.exit(0);
}

console.log(dryRun ? '=== DRY RUN 모드 ===' : '=== UTF-8 변환 시작 ===');
console.log('');

let converted = 0;
for (const file of files) {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    if (removeBomAndNormalizeEol(fullPath, dryRun)) {
      converted++;
    }
  } else {
    console.log(`[SKIP] ${file}: 파일 없음`);
  }
}

console.log('');
console.log(`완료: ${converted}개 파일 ${dryRun ? '변환 예정' : '변환됨'}`);
