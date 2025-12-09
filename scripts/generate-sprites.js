#!/usr/bin/env node
/**
 * Character Sprite Sheet Generator
 * Generates sprite sheets for all avatar colors and saves them to public/assets/game/sprites
 *
 * Run: node scripts/generate-sprites.js
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Character sprite configuration
const CHARACTER_CONFIG = {
  WIDTH: 24,
  HEIGHT: 32,
  FRAME_COUNT: 4,
  COLORS: {
    default: { body: '#00cec9', outline: '#00a8a8' },
    red: { body: '#e74c3c', outline: '#c0392b' },
    green: { body: '#2ecc71', outline: '#27ae60' },
    purple: { body: '#9b59b6', outline: '#8e44ad' },
    orange: { body: '#e67e22', outline: '#d35400' },
    pink: { body: '#fd79a8', outline: '#e84393' },
    yellow: { body: '#fdcb6e', outline: '#f39c12' },
    blue: { body: '#3498db', outline: '#2980b9' },
  }
};

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCharacterFrame(ctx, x, y, color, direction, frame) {
  const { WIDTH, HEIGHT } = CHARACTER_CONFIG;

  const walkOffset = frame % 2 === 1 ? 1 : 0;
  const altWalk = frame === 1 || frame === 3;

  const headX = x + WIDTH / 2;
  const headY = y + 8;
  const headRadius = 6;
  const bodyY = y + 14 + walkOffset;

  // Draw outline/shadow first
  ctx.fillStyle = color.outline;

  // Head shadow
  ctx.beginPath();
  ctx.arc(headX, headY + 1, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Body shadow
  drawRoundedRect(ctx, x + 4, bodyY + 1, WIDTH - 8, 12, 3);
  ctx.fill();

  // Draw main body
  ctx.fillStyle = color.body;

  // Head
  ctx.beginPath();
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Body (torso)
  drawRoundedRect(ctx, x + 5, bodyY, WIDTH - 10, 11, 2);
  ctx.fill();

  // Legs
  const legWidth = 5;
  const legHeight = 8;
  const legY = y + HEIGHT - legHeight - 2;

  ctx.fillStyle = color.outline;

  if (direction === 'left' || direction === 'right') {
    const legOffset = altWalk ? 2 : -2;
    drawRoundedRect(ctx, x + 7, legY + legOffset, legWidth, legHeight, 1);
    ctx.fill();
    drawRoundedRect(ctx, x + 12, legY - legOffset, legWidth, legHeight, 1);
    ctx.fill();
  } else {
    const leftLegOffset = altWalk ? 1 : -1;
    const rightLegOffset = altWalk ? -1 : 1;

    drawRoundedRect(ctx, x + 6, legY + leftLegOffset, legWidth, legHeight, 1);
    ctx.fill();
    drawRoundedRect(ctx, x + 13, legY + rightLegOffset, legWidth, legHeight, 1);
    ctx.fill();
  }

  // Eyes
  const eyeY = headY - 1;

  if (direction === 'down') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX - 2, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + 2, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(headX - 2, eyeY + 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + 2, eyeY + 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (direction === 'up') {
    ctx.fillStyle = color.outline;
    ctx.beginPath();
    ctx.arc(headX, headY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (direction === 'left') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX - 3, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(headX - 3.5, eyeY + 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (direction === 'right') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX + 3, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(headX + 3.5, eyeY + 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function generateSpriteSheet(colorKey, color) {
  const { WIDTH, HEIGHT, FRAME_COUNT } = CHARACTER_CONFIG;
  const sheetWidth = WIDTH * FRAME_COUNT;
  const sheetHeight = HEIGHT * 4;

  const canvas = createCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');

  // Clear with transparency
  ctx.clearRect(0, 0, sheetWidth, sheetHeight);

  // Draw frames for each direction
  const directions = ['down', 'left', 'right', 'up'];
  directions.forEach((direction, dirIndex) => {
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      const x = frame * WIDTH;
      const y = dirIndex * HEIGHT;
      drawCharacterFrame(ctx, x, y, color, direction, frame);
    }
  });

  return canvas.toBuffer('image/png');
}

async function main() {
  const outputDir = path.join(__dirname, '../public/assets/game/sprites');

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating character sprite sheets...');

  for (const [colorKey, color] of Object.entries(CHARACTER_CONFIG.COLORS)) {
    const buffer = generateSpriteSheet(colorKey, color);
    const filename = `character-${colorKey}.png`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, buffer);
    console.log(`  ✓ Generated: ${filename}`);
  }

  console.log('\nAll sprite sheets generated successfully!');
  console.log(`Output directory: ${outputDir}`);
}

main().catch(console.error);
