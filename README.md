<div align="center">

<img src="public/favicon.svg" width="96" alt="Meteo icon">

# Meteo

A meteorological forecasting app, built with Angular 22 and MapLibre, running fully offline.

![Angular 22](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![MapLibre GL](https://img.shields.io/badge/MapLibre-GL-396CB2?logo=maplibre&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Offline](https://img.shields.io/badge/runs-fully%20offline-22C55E)
![RTL](https://img.shields.io/badge/UI-Hebrew%20RTL-8B5CF6)

![Temperature, animated wind and height contours at 850 mb](docs/screenshots/weather.jpg)

| ![Satellite, radar, lightning and observations](docs/screenshots/satellite.jpg) | ![Meteogram](docs/screenshots/meteogram.jpg) | ![Sounding table and wind barbs](docs/screenshots/sounding.jpg) |
|:---:|:---:|:---:|

</div>

## What went into it

- **Looks apart from layers**: any layer can be drawn as colors, contours, animation, barbs or arrows.
- **Shortcuts**: ready-made layer combinations in one click.
- **Hover on hidden layers**: read values over an untouched satellite image.
- **Loops in sync**: satellite, radar, lightning and observations play together at their own pace.
- **GPU wind trails**: a WebGL2 layer of its own, colored to match the basemap.
- **Zoomable time bar**: from minutes to years, with a live mode.
- **Level rail**: heights in feet or pressure levels in millibars.
- **Point tools**: meteogram, sounding table and distance measuring from a right-click.
- **Search**: places, or coordinates in DD, DMS, UTM or a local grid.
- **Smooth on weak PCs**: heavy work in a Web Worker, a low-quality mode and a performance HUD.
- **Fully offline**: every basemap, font and icon is self-hosted.
- **Easy to extend**: a new layer is one small file; MapLibre stays inside `engine/`.

## Running it locally

```sh
npm install
npm run ecmwf:fetch    # sample ECMWF data (~290 MB, gitignored)
npm run basemap:fetch  # basemap tiles
npm run start:fixtures # http://localhost:9993 on sample data
```
