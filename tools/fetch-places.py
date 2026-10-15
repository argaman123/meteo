import io
import json
import re
import shutil
import urllib.request
import zipfile
from pathlib import Path

OUTPUT = Path('public/search/places.json')
DOWNLOAD = Path('tools/.places-download')
GEONAMES = 'https://download.geonames.org/export/dump/'
HOME_COUNTRIES = ['IL', 'PS']
SKIPPED_TOWN_CODES = {'PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH'}
AIRPORT_CODES = {'AIRP', 'AIRF', 'AIRB'}
MOUNTAIN_CODES = {'MT', 'HLL', 'PK'}
TOWN, AIRPORT, MOUNTAIN = 0, 1, 2
DIRECTION_MARKS = re.compile('[\u200e\u200f]')


def download(name, url):
    path = DOWNLOAD / name
    if not path.exists():
        print(f'downloading {url}')
        DOWNLOAD.mkdir(parents=True, exist_ok=True)
        partial = path.with_suffix('.part')
        with urllib.request.urlopen(url, timeout=60) as response, open(partial, 'wb') as file:
            shutil.copyfileobj(response, file)
        partial.rename(path)
    return path


def read_geonames(zip_name, text_name):
    with zipfile.ZipFile(download(zip_name, GEONAMES + zip_name)) as archive:
        with archive.open(text_name) as file:
            for line in io.TextIOWrapper(file, encoding='utf-8'):
                yield line.rstrip('\n').split('\t')


def kind_of(columns):
    feature_class, feature_code = columns[6], columns[7]
    if feature_class == 'P' and feature_code not in SKIPPED_TOWN_CODES:
        return TOWN
    if feature_code in AIRPORT_CODES:
        return AIRPORT
    if feature_code in MOUNTAIN_CODES:
        return MOUNTAIN
    return None


def collect_places():
    places = {}
    for country in HOME_COUNTRIES:
        for columns in read_geonames(f'{country}.zip', f'{country}.txt'):
            kind = kind_of(columns)
            if kind is not None:
                places[columns[0]] = (columns, kind)
    for columns in read_geonames('cities5000.zip', 'cities5000.txt'):
        if columns[8] not in HOME_COUNTRIES and kind_of(columns) == TOWN:
            places[columns[0]] = (columns, TOWN)
    return places


def collect_alternate_names(ids):
    hebrew, icao = {}, {}
    archive_path = download('alternateNamesV2.zip', GEONAMES + 'alternateNamesV2.zip')
    with zipfile.ZipFile(archive_path) as archive:
        with archive.open('alternateNamesV2.txt') as file:
            for line in io.TextIOWrapper(file, encoding='utf-8'):
                columns = line.rstrip('\n').split('\t')
                place_id, language, name = columns[1], columns[2], columns[3]
                if place_id not in ids:
                    continue
                if language == 'icao':
                    icao.setdefault(place_id, name)
                    continue
                is_current = columns[6] != '1' and columns[7] != '1'
                if language == 'he' and is_current and (columns[4] == '1' or place_id not in hebrew):
                    hebrew[place_id] = DIRECTION_MARKS.sub('', name)
    return hebrew, icao


def main():
    places = collect_places()
    hebrew, icao = collect_alternate_names(places.keys())
    ordered = sorted(
        places.values(),
        key=lambda entry: (entry[0][8] not in HOME_COUNTRIES, -int(entry[0][14] or 0)),
    )
    rows = []
    for columns, _ in ordered:
        place_id, country = columns[0], columns[8]
        rows.append([columns[1], hebrew.get(place_id, ''), country, icao.get(place_id, ''),
                     round(float(columns[5]), 4), round(float(columns[4]), 4)])
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(rows)} places, {sum(1 for row in rows if row[1])} with Hebrew names')
    print(f'{OUTPUT}: {OUTPUT.stat().st_size / 1e6:.1f} MB')


main()
