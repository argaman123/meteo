export enum Parameter {
  Temperature = 'TMP',
  SurfaceTemperature = 'SURFACE_TMP',
  U = 'U',
  V = 'V',
  GeopotentialHeight = 'HGT',
  SeaLevelPressure = 'SLP',
  RelativeHumidity = 'RH',
  SurfaceRelativeHumidity = 'SURFACE_RH',
}

export enum Model {
  Local = 'ECMWF',
  Wide = 'BIG_ECMWF',
}
