import calendar
import json
import shutil
import sys
import tempfile
import warnings
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

warnings.filterwarnings('ignore')

import eccodes
import numpy as np
from ecmwf.opendata import Client

OUTPUT = Path('public/fixtures/ecmwf')
DOWNLOAD = Path('public/fixtures/ecmwf-download')
WEST, SOUTH, EAST, NORTH = -10, 20, 60, 60
RESOLUTION = 0.25
LAST_STEP = int(sys.argv[1]) if len(sys.argv) > 1 else 144
STEPS = list(range(0, LAST_STEP + 1, 3))
PRESSURES = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100]
FIELDS = {
    't': {'levels': 'pressure', 'scale': 0.01, 'offset': 0},
    'u': {'levels': 'pressure', 'scale': 0.01, 'offset': 0},
    'v': {'levels': 'pressure', 'scale': 0.01, 'offset': 0},
    'gh': {'levels': 'pressure', 'scale': 1, 'offset': 0},
    'r': {'levels': 'pressure', 'scale': 0.01, 'offset': 0},
    '2t': {'levels': 'surface', 'scale': 0.01, 'offset': 0},
    '2d': {'levels': 'surface', 'scale': 0.01, 'offset': 0},
    '10u': {'levels': 'surface', 'scale': 0.01, 'offset': 0},
    '10v': {'levels': 'surface', 'scale': 0.01, 'offset': 0},
    'msl': {'levels': 'surface', 'scale': 0.01, 'offset': 1000},
}
KELVIN = {'t', '2t', '2d'}
PASCAL = {'msl'}


def crop(handle):
    columns = eccodes.codes_get(handle, 'Ni')
    rows = eccodes.codes_get(handle, 'Nj')
    first_lon = eccodes.codes_get(handle, 'longitudeOfFirstGridPointInDegrees')
    first_lat = eccodes.codes_get(handle, 'latitudeOfFirstGridPointInDegrees')
    values = eccodes.codes_get_values(handle).reshape(rows, columns)
    lats = first_lat - RESOLUTION * np.arange(rows)
    lons = (first_lon + RESOLUTION * np.arange(columns) + 180) % 360 - 180
    order = np.argsort(lons)
    values = values[:, order]
    lons = lons[order]
    row_mask = (lats >= SOUTH - 1e-6) & (lats <= NORTH + 1e-6)
    column_mask = (lons >= WEST - 1e-6) & (lons <= EAST + 1e-6)
    return values[row_mask][:, column_mask][::-1]


def pack(name, values):
    field = FIELDS[name]
    if name in KELVIN:
        values = values - 273.15
    if name in PASCAL:
        values = values / 100
    return np.round((values - field['offset']) / field['scale']).astype('<i2')


def fetch_step(run, step):
    client = Client(source='ecmwf', model='ifs', resol='0p25')
    grids = {}
    with tempfile.TemporaryDirectory() as folder:
        requests = [
            {'param': [name for name, field in FIELDS.items() if field['levels'] == 'surface']},
            {
                'param': [name for name, field in FIELDS.items() if field['levels'] == 'pressure'],
                'levelist': PRESSURES,
            },
        ]
        for index, request in enumerate(requests):
            target = f'{folder}/{index}.grib2'
            client.retrieve(date=run, time=run.hour, step=step, type='fc', target=target, **request)
            with open(target, 'rb') as file:
                while (handle := eccodes.codes_grib_new_from_file(file)) is not None:
                    name = eccodes.codes_get(handle, 'shortName')
                    isobaric = eccodes.codes_get(handle, 'typeOfLevel') == 'isobaricInhPa'
                    level = eccodes.codes_get(handle, 'level') if isobaric else 0
                    grids[(name, level)] = crop(handle)
                    eccodes.codes_release(handle)
    for name, field in FIELDS.items():
        layers = [grids[(name, 0)]] if field['levels'] == 'surface' else [grids[(name, p)] for p in PRESSURES]
        pack(name, np.stack(layers)).tofile(DOWNLOAD / f'{name}-{step:03d}.bin')
    print(f'step {step:3d}h done', flush=True)
    return layers[0].shape


def main():
    run = Client(source='ecmwf', model='ifs', resol='0p25').latest(type='fc', step=LAST_STEP, param='2t')
    print(f'run {run:%Y-%m-%d %H}Z, steps 0-{LAST_STEP}h', flush=True)
    shutil.rmtree(DOWNLOAD, ignore_errors=True)
    DOWNLOAD.mkdir(parents=True)
    with ThreadPoolExecutor(4) as pool:
        shapes = list(pool.map(lambda step: fetch_step(run, step), STEPS))
    rows, columns = shapes[0]
    manifest = {
        'baseTime': calendar.timegm(run.timetuple()) * 1000,
        'west': WEST,
        'south': SOUTH,
        'resolution': RESOLUTION,
        'columns': columns,
        'rows': rows,
        'steps': STEPS,
        'pressures': PRESSURES,
        'fields': FIELDS,
    }
    (DOWNLOAD / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    shutil.rmtree(OUTPUT, ignore_errors=True)
    DOWNLOAD.rename(OUTPUT)
    print(f'wrote {len(STEPS) * len(FIELDS)} files to {OUTPUT}')


main()
