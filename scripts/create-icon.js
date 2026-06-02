const { Jimp } = require('jimp')
const { default: pngToIco } = require('png-to-ico')
const fs = require('fs')
const path = require('path')

async function createIcon() {
  const SIZE = 256

  const img = new Jimp({ width: SIZE, height: SIZE, color: 0x00000000 })

  // 색상
  const BG      = 0x4f46e5ff  // 인디고
  const BG2     = 0x6366f1ff  // 밝은 인디고
  const WHITE   = 0xffffffff
  const WHITE80 = 0xffffffcc

  // 둥근 사각형 배경
  const RADIUS = 52
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const inCorner = (
        (x < RADIUS       && y < RADIUS       && Math.hypot(x - RADIUS,       y - RADIUS)       > RADIUS) ||
        (x > SIZE-RADIUS  && y < RADIUS       && Math.hypot(x - (SIZE-RADIUS), y - RADIUS)       > RADIUS) ||
        (x < RADIUS       && y > SIZE-RADIUS  && Math.hypot(x - RADIUS,       y - (SIZE-RADIUS)) > RADIUS) ||
        (x > SIZE-RADIUS  && y > SIZE-RADIUS  && Math.hypot(x - (SIZE-RADIUS), y - (SIZE-RADIUS)) > RADIUS)
      )
      if (inCorner) continue

      // 그라디언트 (위→아래)
      const t = y / SIZE
      const r1 = (BG  >> 24) & 0xff, g1 = (BG  >> 16) & 0xff, b1 = (BG  >> 8) & 0xff
      const r2 = (BG2 >> 24) & 0xff, g2 = (BG2 >> 16) & 0xff, b2 = (BG2 >> 8) & 0xff
      const r = Math.round(r1 + (r2 - r1) * t)
      const g = Math.round(g1 + (g2 - g1) * t)
      const b = Math.round(b1 + (b2 - b1) * t)
      img.setPixelColor(((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0, x, y)
    }
  }

  // "C" 글자 — 흰색 굵은 호
  const CX = 108, CY = 128, CR = 62, TH = 22
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - CX, dy = y - CY
      const dist = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx) * 180 / Math.PI  // -180 ~ 180

      if (dist >= CR - TH && dist <= CR + TH) {
        // 오른쪽 30도 열린 C 모양 (angle 약 -40 ~ 40 구간 제외)
        if (angle < -45 || angle > 45) {
          img.setPixelColor(WHITE, x, y)
        }
      }
    }
  }

  // "T" 글자 — 가로줄
  const TX = 168, TY = 128, TW = 44, TH2 = 22, TSTEM = 60, TSTEMW = 20
  // 가로
  for (let y = TY - TH2; y <= TY - TH2 + TH2; y++) {
    for (let x = TX - TW; x <= TX + TW; x++) {
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE)
        img.setPixelColor(WHITE, x, y)
    }
  }
  // 세로
  for (let y = TY - TH2; y <= TY - TH2 + TSTEM; y++) {
    for (let x = TX - TSTEMW/2; x <= TX + TSTEMW/2; x++) {
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE)
        img.setPixelColor(WHITE, x, y)
    }
  }

  // 흰색 dot 장식 (우측 하단)
  const DOT_X = 196, DOT_Y = 196, DOT_R = 18
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (Math.hypot(x - DOT_X, y - DOT_Y) <= DOT_R)
        img.setPixelColor(WHITE80, x, y)
    }
  }

  // PNG 저장
  const publicDir = path.join(__dirname, '..', 'public')
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir)

  const pngPath = path.join(publicDir, 'icon.png')
  await img.write(pngPath)
  console.log('✓ public/icon.png 생성')

  // ICO 변환 (16, 32, 48, 64, 128, 256)
  const sizes = [16, 32, 48, 64, 128, 256]
  const pngBuffers = await Promise.all(
    sizes.map(async (s) => {
      const resized = img.clone().resize({ w: s, h: s })
      return resized.getBuffer('image/png')
    })
  )

  const icoBuffer = await pngToIco(pngBuffers)
  const icoPath = path.join(publicDir, 'icon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log('✓ public/icon.ico 생성')
}

createIcon().catch(console.error)
