import type { SolarPosition } from '../types/shadow';

/**
 * Calculates solar position (azimuth and altitude in degrees) for a given date and location
 * using the NOAA Solar Calculator / Astronomical Algorithms method.
 *
 * Sanity Check:
 * At solar noon on the summer solstice (June 21) in Lisbon (~38.74° N, -9.14° W),
 * the sun altitude is approximately 74.6° and azimuth is approximately 180° (South).
 *
 * @param date UTC or Local Date object
 * @param latitude_deg Latitude in degrees (-90 to 90)
 * @param longitude_deg Longitude in degrees (-180 to 180)
 * @returns SolarPosition object containing azimuth_deg (0-360 clockwise from North) and altitude_deg (degrees above horizon)
 */
export function getSolarPosition(
  date: Date,
  latitude_deg: number,
  longitude_deg: number
): SolarPosition {
  const year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1; // 1-12
  const day = date.getUTCDate();
  const hours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5 +
    hours / 24.0;

  // Julian Century
  const T = (JD - 2451545.0) / 36525.0;

  // Geometric Mean Longitude of Sun (degrees)
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

  // Geometric Mean Anomaly of Sun (degrees)
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);

  // Eccentricity of Earth Orbit
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  // Sun Equation of Center (degrees)
  const radM = (M * Math.PI) / 180;
  const C =
    Math.sin(radM) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * radM) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * radM) * 0.000289;

  // Sun True Longitude (degrees)
  const sunTrueLong = L0 + C;

  // Sun Apparent Longitude (degrees)
  const omega = 125.04 - 1934.136 * T;
  const sunAppLong =
    sunTrueLong - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);

  // Mean Obliquity of Ecliptic (degrees)
  const seconds = 21.448 - T * (46.815 + T * (0.00059 - T * 0.001813));
  const meanObliqEcliptic = 23.0 + (26.0 + seconds / 60.0) / 60.0;

  // Obliquity Correction (degrees)
  const obliqCorr =
    meanObliqEcliptic + 0.00256 * Math.cos((omega * Math.PI) / 180);

  // Sun Declination (degrees)
  const sinDeclin =
    Math.sin((obliqCorr * Math.PI) / 180) *
    Math.sin((sunAppLong * Math.PI) / 180);
  const sunDeclin = (Math.asin(sinDeclin) * 180) / Math.PI;

  // Equation of Time (minutes)
  const tanObliqHalf = Math.tan(((obliqCorr / 2.0) * Math.PI) / 180);
  const varY = tanObliqHalf * tanObliqHalf;
  const radL0 = (L0 * Math.PI) / 180;
  const eqOfTime =
    4.0 *
    ((varY * Math.sin(2 * radL0) -
      2 * e * Math.sin(radM) +
      4 * e * varY * Math.sin(radM) * Math.cos(2 * radL0) -
      0.5 * varY * varY * Math.sin(4 * radL0) -
      1.25 * e * e * Math.sin(2 * radM)) *
      180) /
    Math.PI;

  // True Solar Time (minutes)
  const utcMinutes =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60 +
    date.getUTCMilliseconds() / 60000;
  const timeOffset = eqOfTime + 4.0 * longitude_deg;
  let tst = (utcMinutes + timeOffset) % 1440;
  if (tst < 0) {
    tst += 1440;
  }

  // Solar Hour Angle (degrees)
  let ha = tst / 4.0 - 180.0;
  if (ha < -180) {
    ha += 360;
  }

  // Solar Zenith and Elevation/Altitude Angle
  const latRad = (latitude_deg * Math.PI) / 180;
  const decRad = (sunDeclin * Math.PI) / 180;
  const haRad = (ha * Math.PI) / 180;

  let cosZenith =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  cosZenith = Math.max(-1, Math.min(1, cosZenith));

  const zenith_deg = (Math.acos(cosZenith) * 180) / Math.PI;
  const altitude_deg = 90.0 - zenith_deg;

  // Nighttime guard: if altitude <= 0, sun is below horizon
  if (altitude_deg <= 0) {
    return { azimuth_deg: 0, altitude_deg: 0 };
  }

  // Solar Azimuth Angle (clockwise from North)
  const azimuthY = -Math.sin(haRad) * Math.cos(decRad);
  const azimuthX =
    Math.cos(latRad) * Math.sin(decRad) -
    Math.sin(latRad) * Math.cos(decRad) * Math.cos(haRad);

  let azimuth_deg = (Math.atan2(azimuthY, azimuthX) * 180) / Math.PI;
  azimuth_deg = (azimuth_deg + 360) % 360;

  return {
    azimuth_deg,
    altitude_deg,
  };
}
