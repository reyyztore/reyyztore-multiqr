export const CINEMATIC_FRAMES = [
  { id: 'tender-default', label: 'Default', badge: '✨' },
  { id: 'cinema-wide', label: 'Cinema', badge: '🎬' },
  { id: 'film-35mm', label: '35mm Film', badge: '🎞️' },
  { id: 'royal-gold', label: 'Gold Luxe', badge: '👑' },
  { id: 'cyber-neon', label: 'Cyber HUD', badge: '⚡' },
  { id: 'polaroid', label: 'Polaroid', badge: '📸' },
  { id: 'vogue-mag', label: 'Editorial', badge: '📰' },
  { id: 'vhs-retro', label: 'VHS 1998', badge: '📼' },
  { id: 'glass-modern', label: 'Glass UI', badge: '💎' },
  { id: 'golden-hour', label: 'Sunset', badge: '🌅' },
];

export function renderFramedPhoto(
  rawImageSrc: string,
  frameId: string,
  tenderFrameUrl: string,
  businessName: string
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 900;
    const ctx = canvas.getContext('2d')!;

    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.onload = () => {
      const minSide = Math.min(baseImg.width, baseImg.height);
      const sx = (baseImg.width - minSide) / 2;
      const sy = (baseImg.height - minSide) / 2;

      const drawBase = (x = 0, y = 0, w = 900, h = 900) => {
        ctx.drawImage(baseImg, sx, sy, minSide, minSide, x, y, w, h);
      };

      // Tentukan mode aktif
      const mode =
        frameId === 'tender-default'
          ? tenderFrameUrl.startsWith('preset:')
            ? tenderFrameUrl.replace('preset:', '')
            : tenderFrameUrl
            ? 'custom-url'
            : 'glass-modern'
          : frameId;

      if (mode === 'cinema-wide') {
        drawBase();
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, 900, 115);
        ctx.fillRect(0, 785, 900, 115);
        ctx.fillStyle = '#e4e4e7';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('● REC  24FPS  RAW', 40, 68);
        ctx.textAlign = 'right';
        ctx.fillText(businessName.toUpperCase(), 860, 68);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'italic 22px serif';
        ctx.textAlign = 'center';
        ctx.fillText(`"${businessName} — Cinematic Memory"`, 450, 848);
        resolve(canvas.toDataURL('image/webp', 0.86));
      } else if (mode === 'film-35mm') {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, 900, 900);
        drawBase(85, 45, 730, 810);
        ctx.fillStyle = '#fafaf9';
        for (let y = 30; y < 880; y += 68) {
          ctx.beginPath();
          ctx.roundRect(24, y, 36, 24, 6);
          ctx.roundRect(840, y, 36, 24, 6);
          ctx.fill();
        }
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`KODAK PORTRA 400  •  ${businessName.toUpperCase()}`, 450, 882);
        resolve(canvas.toDataURL('image/webp', 0.86));
      } else if (mode === 'royal-gold' || mode === 'gold') {
        drawBase();
        const grad = ctx.createLinearGradient(0, 0, 900, 900);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(0.5, '#fef08a');
        grad.addColorStop(1, '#b45309');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 34;
        ctx.strokeRect(17, 17, 866, 866);
        ctx.fillStyle = 'rgba(12, 10, 9, 0.82)';
        ctx.fillRect(180, 805, 540, 62);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`★ ${businessName} ★`, 450, 845);
        resolve(canvas.toDataURL('image/webp', 0.86));
      } else if (mode === 'cyber-neon' || mode === 'neon') {
        drawBase();
        const grad = ctx.createLinearGradient(0, 0, 900, 900);
        grad.addColorStop(0, '#ec4899');
        grad.addColorStop(0.5, '#8b5cf6');
        grad.addColorStop(1, '#06b6d4');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 26;
        ctx.strokeRect(13, 13, 874, 874);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 5;
        ctx.strokeRect(42, 42, 816, 816);
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SYS://LIVE_${businessName.toUpperCase().replace(/\s+/g, '_')}`, 62, 82);
        resolve(canvas.toDataURL('image/webp', 0.86));
      } else if (mode === 'polaroid') {
        ctx.fillStyle = '#fafaf9';
        ctx.fillRect(0, 0, 900, 900);
        drawBase(55, 55, 790, 685);
        ctx.fillStyle = '#1c1917';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(businessName, 450, 822);
        resolve(canvas.toDataURL('image/webp', 0.86));
      } else if (mode === 'vogue-mag') {
        drawBase();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 10;
        ctx.strokeRect(32, 32, 836, 836);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = '900 76px serif';
        ctx.textAlign = 'center';
        ctx.fillText(businessName.toUpperCase().slice(0, 14), 450, 125);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('SPECIAL EDITION  •  VIP GUEST', 450, 845);
        resolve(canvas.toDataURL('image/webp', 0.86));
      } else if (mode === 'vhs-retro') {
        drawBase();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.fillRect(0, 0, 900, 900);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('PLAY ▶', 48, 76);
        ctx.fillText(`SP  ${new Date().toLocaleDateString('id-ID')}`, 48, 848);
        ctx.textAlign = 'right';
        ctx.fillText(businessName.toUpperCase(), 852, 848);
        resolve(canvas.toDataURL('image/webp', 0.86));
      } else if (mode === 'golden-hour') {
        drawBase();
        const grad = ctx.createLinearGradient(0, 0, 900, 900);
        grad.addColorStop(0, 'rgba(251, 146, 60, 0.35)');
        grad.addColorStop(1, 'rgba(219, 39, 119, 0.35)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 900, 900);
        ctx.strokeStyle = '#fdba74';
        ctx.lineWidth = 28;
        ctx.strokeRect(14, 14, 872, 872);
        ctx.fillStyle = '#fff7ed';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`GOLDEN MOMENT @ ${businessName.toUpperCase()}`, 450, 855);
        resolve(canvas.toDataURL('image/webp', 0.86));
      } else if (mode === 'custom-url' && tenderFrameUrl) {
        drawBase();
        const overlay = new Image();
        overlay.crossOrigin = 'anonymous';
        overlay.onload = () => {
          ctx.drawImage(overlay, 0, 0, 900, 900);
          resolve(canvas.toDataURL('image/webp', 0.86));
        };
        overlay.onerror = () => resolve(canvas.toDataURL('image/webp', 0.86));
        overlay.src = tenderFrameUrl;
      } else {
        // Default: Glass Modern
        drawBase();
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 24;
        ctx.strokeRect(12, 12, 876, 876);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.beginPath();
        ctx.roundRect(240, 812, 420, 48, 24);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 21px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(businessName, 450, 843);
        resolve(canvas.toDataURL('image/webp', 0.86));
      }
    };
    baseImg.src = rawImageSrc;
  });
}
