import { Service } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { domToCanvas } from 'modern-screenshot';

@Service()
export class ScreenshotService {
  async takeScreenshot(area: HTMLElement, fileName: string, root = area): Promise<void> {
    const image = await this.createImage(area, root);
    try {
      await navigator.clipboard.write([new ClipboardItem({ [image.type]: image })]);
      toast.success('התמונה הועתקה');
    } catch {
      this.downloadImage(image, fileName);
    }
  }

  private async createImage(area: HTMLElement, root: HTMLElement): Promise<Blob> {
    const scale = devicePixelRatio;
    const background = getComputedStyle(root).getPropertyValue('--background');
    const page = await domToCanvas(root, {
      scale,
      filter: (node) => !(node instanceof HTMLElement && node.hasAttribute('data-screenshot-skip')),
      onCloneEachNode: (clone) => {
        if (!(clone instanceof HTMLElement) || !clone.classList.contains('backdrop-blur-lg'))
          return;
        clone.style.backdropFilter = 'none';
        clone.style.backgroundColor = `color-mix(in oklab, ${background} 90%, transparent)`;
      },
      onCloneNode: (clone) => {
        for (const element of (clone as HTMLElement).querySelectorAll<HTMLElement>(
          '[data-screenshot-only]',
        )) {
          element.style.visibility = 'visible';
        }
      },
    });
    const rootBox = root.getBoundingClientRect();
    const areaBox = area.getBoundingClientRect();
    const image = document.createElement('canvas');
    image.width = areaBox.width * scale;
    image.height = areaBox.height * scale;
    image
      .getContext('2d')!
      .drawImage(
        page,
        (areaBox.left - rootBox.left) * scale,
        (areaBox.top - rootBox.top) * scale,
        image.width,
        image.height,
        0,
        0,
        image.width,
        image.height,
      );
    return new Promise((resolve) => image.toBlob((blob) => resolve(blob!)));
  }

  private downloadImage(image: Blob, fileName: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(image);
    link.download = `${fileName}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
