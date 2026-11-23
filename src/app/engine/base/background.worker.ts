/// <reference lib="webworker" />
// TODO: UNVERIFIED CODE BELOW
import { Grid } from '../../objects/grid';
import { contourLines } from '../../utils/contours';
import { BackgroundJob, BackgroundTask } from './background-task';
import { buildImage } from './color-image';

addEventListener('message', ({ data }: MessageEvent<BackgroundJob>) => {
  const { id, task } = data;
  if (task.kind === BackgroundTask.Image) {
    const grid = Grid.fromValues(task.bounds, task.width, task.height, task.values);
    const image = buildImage(
      grid,
      task.palette,
      task.style,
      task.interpolation,
      task.minimumValue,
      task.absolute,
      task.blur,
    );
    postMessage({ id, result: image });
  } else {
    postMessage({
      id,
      result: contourLines(task.values, task.width, task.height, task.bounds, task.levels),
    });
  }
});
