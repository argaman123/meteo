import { mkdir, writeFile } from 'node:fs/promises';

const day = process.argv[2];
if (!day) {
  console.error('usage: node tools/fetch-satellite.mjs YYYY-MM-DD [startHourZ] [frames]');
  process.exit(1);
}
const startHour = Number(process.argv[3] ?? 7);
const frames = Number(process.argv[4] ?? 19);
const sectors = {
  near: { bbox: '30,27,40,36', size: 1024 },
  wide: { bbox: '20,18,52,44', size: 3000 },
};

await mkdir('public/fixtures/satellite', { recursive: true });
for (const [name, { bbox, size }] of Object.entries(sectors)) {
  for (let i = 0; i < frames; i++) {
    const minutes = startHour * 60 + i * 10;
    const time = `${day}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00Z`;
    const url =
      'https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.1.1&request=GetMap' +
      '&layers=mtg_fd:rgb_geocolour&styles=&format=image/jpeg&srs=EPSG:4326' +
      `&bbox=${bbox}&width=${size}&height=${size}&time=${time}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${name}-${i} ${time}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 10_000) throw new Error(`${name}-${i} ${time}: suspiciously small (${bytes.length}b)`);
    await writeFile(`public/fixtures/satellite/${name}-${i}.jpg`, bytes);
    console.log(`${name}-${i}.jpg  ${time}  ${(bytes.length / 1024).toFixed(0)}KB`);
  }
}
