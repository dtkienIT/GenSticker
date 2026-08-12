export const compositeTextOnSticker = async (
  imageBase64: string,
  text: string,
  color: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No ctx');

      ctx.drawImage(img, 0, 0, 512, 512);

      const bannerWidth = 512 * 0.8;
      const bannerHeight = 60;
      const x = (512 - bannerWidth) / 2;
      const y = 512 - bannerHeight - 20;
      const radius = 30;

      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bannerWidth - radius, y);
      ctx.quadraticCurveTo(x + bannerWidth, y, x + bannerWidth, y + radius);
      ctx.lineTo(x + bannerWidth, y + bannerHeight - radius);
      ctx.quadraticCurveTo(x + bannerWidth, y + bannerHeight, x + bannerWidth - radius, y + bannerHeight);
      ctx.lineTo(x + radius, y + bannerHeight);
      ctx.quadraticCurveTo(x, y + bannerHeight, x, y + bannerHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();
      
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px "Fredoka One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 512 / 2, y + bannerHeight / 2 + 2);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    if (imageBase64.startsWith('data:')) {
      img.src = imageBase64;
    } else {
      img.src = `data:image/png;base64,${imageBase64}`;
    }
  });
};
