export function grayChannel(image: ImageData): Uint8ClampedArray {
  const grays = new Uint8ClampedArray(image.width * image.height);
  for (let i = 0; i < grays.length; i++) {
    grays[i] = image.data[i * 4];
  }
  return grays;
}

export function equalize(image: ImageData): ImageData {
  const data = new Uint8ClampedArray(image.data);
  let length = data.length / 4;
  const pixelToFrequency = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    pixelToFrequency[data[i]]++;
  }
  length -= pixelToFrequency[0] + pixelToFrequency[255];
  pixelToFrequency[0] = 0;
  pixelToFrequency[255] = 255;
  let sum = 0;
  for (let i = 1; i < 255; i++) {
    sum += pixelToFrequency[i] / length;
    pixelToFrequency[i] = Math.floor(255 * sum);
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i] = pixelToFrequency[data[i]];
    data[i + 1] = pixelToFrequency[data[i + 1]];
    data[i + 2] = pixelToFrequency[data[i + 2]];
  }
  return new ImageData(data, image.width, image.height);
}
