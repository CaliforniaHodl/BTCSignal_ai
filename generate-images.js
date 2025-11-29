// Generate favicon and share image using Node.js canvas
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create favicon (32x32)
function createFavicon() {
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - dark with gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#0d1117');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Bitcoin circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, 13, 0, Math.PI * 2);
  const btcGradient = ctx.createLinearGradient(0, 0, size, size);
  btcGradient.addColorStop(0, '#f7931a');
  btcGradient.addColorStop(1, '#ffb800');
  ctx.fillStyle = btcGradient;
  ctx.fill();

  // Bitcoin B symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₿', size/2, size/2 + 1);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'static', 'favicon-32x32.png'), buffer);
  console.log('Created favicon-32x32.png');

  // Create 16x16 version
  const canvas16 = createCanvas(16, 16);
  const ctx16 = canvas16.getContext('2d');
  ctx16.drawImage(canvas, 0, 0, 16, 16);
  const buffer16 = canvas16.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'static', 'favicon-16x16.png'), buffer16);
  console.log('Created favicon-16x16.png');

  // Create 180x180 apple touch icon
  const canvas180 = createCanvas(180, 180);
  const ctx180 = canvas180.getContext('2d');

  const gradient180 = ctx180.createLinearGradient(0, 0, 180, 180);
  gradient180.addColorStop(0, '#1a1a2e');
  gradient180.addColorStop(1, '#0d1117');
  ctx180.fillStyle = gradient180;
  ctx180.fillRect(0, 0, 180, 180);

  ctx180.beginPath();
  ctx180.arc(90, 90, 70, 0, Math.PI * 2);
  const btcGradient180 = ctx180.createLinearGradient(0, 0, 180, 180);
  btcGradient180.addColorStop(0, '#f7931a');
  btcGradient180.addColorStop(1, '#ffb800');
  ctx180.fillStyle = btcGradient180;
  ctx180.fill();

  ctx180.fillStyle = '#ffffff';
  ctx180.font = 'bold 90px Arial';
  ctx180.textAlign = 'center';
  ctx180.textBaseline = 'middle';
  ctx180.fillText('₿', 90, 95);

  const buffer180 = canvas180.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'static', 'apple-touch-icon.png'), buffer180);
  console.log('Created apple-touch-icon.png');
}

// Create OG share image (1200x630)
function createShareImage() {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0d1117');
  bgGradient.addColorStop(0.5, '#161b22');
  bgGradient.addColorStop(1, '#0d1117');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Grid pattern (subtle)
  ctx.strokeStyle = 'rgba(48, 54, 61, 0.5)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Bitcoin coin (large, left side)
  const coinX = 200;
  const coinY = height / 2;
  const coinRadius = 120;

  // Coin glow
  const glowGradient = ctx.createRadialGradient(coinX, coinY, coinRadius * 0.5, coinX, coinY, coinRadius * 2);
  glowGradient.addColorStop(0, 'rgba(247, 147, 26, 0.3)');
  glowGradient.addColorStop(1, 'rgba(247, 147, 26, 0)');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(coinX - coinRadius * 2, coinY - coinRadius * 2, coinRadius * 4, coinRadius * 4);

  // Coin
  ctx.beginPath();
  ctx.arc(coinX, coinY, coinRadius, 0, Math.PI * 2);
  const coinGradient = ctx.createLinearGradient(coinX - coinRadius, coinY - coinRadius, coinX + coinRadius, coinY + coinRadius);
  coinGradient.addColorStop(0, '#f7931a');
  coinGradient.addColorStop(0.5, '#ffb800');
  coinGradient.addColorStop(1, '#f7931a');
  ctx.fillStyle = coinGradient;
  ctx.fill();

  // Coin border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Bitcoin symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 140px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₿', coinX, coinY + 5);

  // Main text
  ctx.textAlign = 'left';

  // Title
  const titleGradient = ctx.createLinearGradient(400, 200, 1100, 200);
  titleGradient.addColorStop(0, '#f7931a');
  titleGradient.addColorStop(1, '#ffb800');
  ctx.fillStyle = titleGradient;
  ctx.font = 'bold 72px Arial';
  ctx.fillText('BTC Signal AI', 400, 240);

  // Subtitle
  ctx.fillStyle = '#f0f6fc';
  ctx.font = '36px Arial';
  ctx.fillText('AI-Powered Bitcoin Analysis', 400, 310);

  // Features
  ctx.fillStyle = '#8b949e';
  ctx.font = '28px Arial';
  const features = [
    '📊 Real-time Technical Analysis',
    '🎯 Liquidity Predictions',
    '🤖 AI Trade Coaching'
  ];
  features.forEach((feature, i) => {
    ctx.fillText(feature, 400, 400 + i * 50);
  });

  // Lightning bolt icon (payment hint)
  ctx.fillStyle = '#ffb800';
  ctx.font = '40px Arial';
  ctx.fillText('⚡', 400, 560);
  ctx.fillStyle = '#8b949e';
  ctx.font = '24px Arial';
  ctx.fillText('Pay with Lightning', 460, 565);

  // Border accent
  ctx.strokeStyle = '#f7931a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'static', 'og-image.png'), buffer);
  console.log('Created og-image.png');
}

// Run
try {
  createFavicon();
  createShareImage();
  console.log('All images created successfully!');
} catch (error) {
  console.error('Error:', error.message);
  console.log('Note: This script requires the "canvas" npm package.');
  console.log('Run: npm install canvas');
}
