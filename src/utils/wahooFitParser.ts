import { StravaActivity, UserAthleteSettings } from '../types/strava';

// FIT Epoch is 1989-12-31T00:00:00Z (631065600 seconds after Unix Epoch 1970-01-01T00:00:00Z)
const FIT_EPOCH_OFFSET_SEC = 631065600;

interface FitFieldDef {
  fieldNum: number;
  size: number;
  baseType: number;
}

interface FitMesgDef {
  littleEndian: boolean;
  globalMesgNum: number;
  fields: FitFieldDef[];
  devFieldsSizes: number[];
}

/**
 * Parses a binary .FIT file from a Wahoo ELEMNT BOLT / ROAM / KICKR CORE
 * and extracts power (Watts), heart rate (bpm), cadence (rpm), speed, distance, and duration.
 */
export async function parseWahooFitFile(file: File): Promise<StravaActivity> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 14) {
    throw new Error('Ungültige .FIT-Datei (zu kurz).');
  }

  const headerSize = bytes[0];
  const dataSize = view.getUint32(4, true);
  const sig = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (sig !== '.FIT') {
    throw new Error('Datei hat keinen gültigen .FIT-Header.');
  }

  let offset = headerSize;
  const endOffset = Math.min(bytes.length, headerSize + dataSize);
  const localDefs: Record<number, FitMesgDef> = {};

  const powerSamples: number[] = [];
  const hrSamples: number[] = [];
  const cadenceSamples: number[] = [];
  const timestamps: number[] = [];
  let maxDistanceMeters = 0;

  // Session summary fields (Global Mesg 18)
  let sessionStartTime: number | null = null;
  let sessionElapsedTimeSec = 0;
  let sessionTimerTimeSec = 0;
  let sessionDistanceMeters = 0;
  let sessionAvgWatts = 0;
  let sessionNormalizedWatts = 0;
  let sessionAvgHr = 0;
  let sessionMaxHr = 0;
  let sessionAvgCadence = 0;
  let sessionTotalAscent = 0;
  let sessionCalories = 0;

  const readUintValue = (pos: number, size: number, littleEndian: boolean, baseType: number): number | null => {
    const typeNum = baseType & 0x1f;
    if (size === 1) {
      const v = view.getUint8(pos);
      return v === 0xff ? null : v;
    }
    if (size === 2) {
      if (typeNum === 3) {
        const v = view.getInt16(pos, littleEndian);
        return v === 0x7fff ? null : v;
      }
      const v = view.getUint16(pos, littleEndian);
      return v === 0xffff ? null : v;
    }
    if (size === 4) {
      if (typeNum === 5) {
        const v = view.getInt32(pos, littleEndian);
        return v === 0x7fffffff ? null : v;
      }
      const v = view.getUint32(pos, littleEndian);
      return v === 0xffffffff ? null : v;
    }
    return null;
  };

  while (offset < endOffset) {
    const recordHeader = bytes[offset++];
    const isCompressedTimestamp = (recordHeader & 0x80) !== 0;

    if (isCompressedTimestamp) {
      const localNum = (recordHeader >> 5) & 0x03;
      const def = localDefs[localNum];
      if (!def) break;
      for (const f of def.fields) {
        offset += f.size;
      }
      for (const ds of def.devFieldsSizes) {
        offset += ds;
      }
      continue;
    }

    const isDefinition = (recordHeader & 0x40) !== 0;
    const hasDeveloperData = (recordHeader & 0x20) !== 0;
    const localMesgNum = recordHeader & 0x0f;

    if (isDefinition) {
      if (offset + 5 > endOffset) break;
      offset++; // reserved byte
      const arch = bytes[offset++];
      const littleEndian = arch === 0;
      const globalMesgNum = view.getUint16(offset, littleEndian);
      offset += 2;
      const numFields = bytes[offset++];
      const fields: FitFieldDef[] = [];

      for (let i = 0; i < numFields; i++) {
        if (offset + 3 > endOffset) break;
        const fieldNum = bytes[offset++];
        const size = bytes[offset++];
        const baseType = bytes[offset++];
        fields.push({ fieldNum, size, baseType });
      }

      const devFieldsSizes: number[] = [];
      if (hasDeveloperData && offset < endOffset) {
        const numDevFields = bytes[offset++];
        for (let i = 0; i < numDevFields; i++) {
          if (offset + 3 > endOffset) break;
          offset++; // field_num
          const devSize = bytes[offset++];
          offset++; // dev_data_index
          devFieldsSizes.push(devSize);
        }
      }

      localDefs[localMesgNum] = {
        littleEndian,
        globalMesgNum,
        fields,
        devFieldsSizes,
      };
    } else {
      const def = localDefs[localMesgNum];
      if (!def) break;

      let recTimestamp: number | null = null;
      let recPower: number | null = null;
      let recHr: number | null = null;
      let recCadence: number | null = null;
      let recDist: number | null = null;

      for (const f of def.fields) {
        if (offset + f.size > endOffset) {
          offset = endOffset;
          break;
        }
        const val = readUintValue(offset, f.size, def.littleEndian, f.baseType);

        if (def.globalMesgNum === 20) {
          // Record message (second-by-second data)
          if (f.fieldNum === 253 && val !== null) recTimestamp = val;
          else if (f.fieldNum === 7 && val !== null && val < 2500) recPower = val;
          else if (f.fieldNum === 3 && val !== null && val > 30 && val < 240) recHr = val;
          else if (f.fieldNum === 4 && val !== null && val < 220) recCadence = val;
          else if (f.fieldNum === 5 && val !== null) recDist = val / 100.0;
        } else if (def.globalMesgNum === 18) {
          // Session summary message
          if (f.fieldNum === 2 && val !== null) sessionStartTime = val;
          else if (f.fieldNum === 7 && val !== null) sessionElapsedTimeSec = val / 1000.0;
          else if (f.fieldNum === 8 && val !== null) sessionTimerTimeSec = val / 1000.0;
          else if (f.fieldNum === 9 && val !== null) sessionDistanceMeters = val / 100.0;
          else if (f.fieldNum === 20 && val !== null && val < 2500) sessionAvgWatts = val;
          else if (f.fieldNum === 34 && val !== null && val < 2500) sessionNormalizedWatts = val;
          else if (f.fieldNum === 16 && val !== null && val < 240) sessionAvgHr = val;
          else if (f.fieldNum === 17 && val !== null && val < 240) sessionMaxHr = val;
          else if (f.fieldNum === 18 && val !== null && val < 220) sessionAvgCadence = val;
          else if (f.fieldNum === 22 && val !== null && val < 20000) sessionTotalAscent = val;
          else if (f.fieldNum === 11 && val !== null && val < 15000) sessionCalories = val;
        }

        offset += f.size;
      }

      for (const ds of def.devFieldsSizes) {
        offset += ds;
      }

      if (def.globalMesgNum === 20) {
        if (recTimestamp !== null) timestamps.push(recTimestamp);
        if (recPower !== null && recPower > 0) powerSamples.push(recPower);
        if (recHr !== null && recHr > 35) hrSamples.push(recHr);
        if (recCadence !== null && recCadence > 0) cadenceSamples.push(recCadence);
        if (recDist !== null && recDist > maxDistanceMeters) maxDistanceMeters = recDist;
      }
    }
  }

  const avgArr = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const startEpochSec =
    sessionStartTime !== null
      ? sessionStartTime + FIT_EPOCH_OFFSET_SEC
      : timestamps.length > 0
      ? timestamps[0] + FIT_EPOCH_OFFSET_SEC
      : Math.floor(file.lastModified / 1000);

  const startDateIso = new Date(startEpochSec * 1000).toISOString();

  const movingTimeSec =
    sessionTimerTimeSec > 0
      ? Math.round(sessionTimerTimeSec)
      : timestamps.length > 1
      ? Math.max(60, timestamps[timestamps.length - 1] - timestamps[0])
      : 1800;

  const elapsedTimeSec =
    sessionElapsedTimeSec > 0 ? Math.round(sessionElapsedTimeSec) : movingTimeSec;

  const distanceMeters =
    sessionDistanceMeters > 0 ? Math.round(sessionDistanceMeters) : Math.round(maxDistanceMeters);

  const avgWatts = sessionAvgWatts > 0 ? sessionAvgWatts : avgArr(powerSamples);
  const npWatts = sessionNormalizedWatts > 0 ? sessionNormalizedWatts : avgWatts;
  const avgHr = sessionAvgHr > 0 ? sessionAvgHr : avgArr(hrSamples);
  const maxHr =
    sessionMaxHr > 0
      ? sessionMaxHr
      : hrSamples.length > 0
      ? Math.max(...hrSamples)
      : avgHr > 0
      ? avgHr + 12
      : undefined;
  const avgCadence = sessionAvgCadence > 0 ? sessionAvgCadence : avgArr(cadenceSamples);

  // If indoor Kickr Core ride had 0 GPS distance, estimate realistic virtual indoor distance from Watts (~24 km/h @ 90W)
  const effectiveDistanceMeters =
    distanceMeters > 100
      ? distanceMeters
      : avgWatts > 0
      ? Math.round((movingTimeSec / 3600) * (16 + avgWatts * 0.09) * 1000)
      : Math.round((movingTimeSec / 3600) * 21.0 * 1000);

  const avgSpeedMs = movingTimeSec > 0 ? effectiveDistanceMeters / movingTimeSec : 0;
  const kilojoules = avgWatts > 0 ? Math.round((avgWatts * movingTimeSec) / 1000) : undefined;
  const cleanTitle = file.name.replace(/\.(fit|tcx|csv)$/i, '');

  return {
    id: `wahoo_fit_${startEpochSec}_${Math.round(Math.random() * 1000)}`,
    name: `Wahoo KICKR / BOLT: ${cleanTitle}`,
    type: 'VirtualRide',
    sport_type: 'VirtualRide',
    start_date: startDateIso,
    distance: effectiveDistanceMeters,
    moving_time: movingTimeSec,
    elapsed_time: elapsedTimeSec,
    total_elevation_gain: sessionTotalAscent,
    average_speed: avgSpeedMs,
    average_watts: avgWatts > 0 ? avgWatts : undefined,
    weighted_average_watts: npWatts > 0 ? npWatts : undefined,
    average_heartrate: avgHr > 0 ? avgHr : undefined,
    max_heartrate: maxHr,
    average_cadence: avgCadence > 0 ? avgCadence : undefined,
    kilojoules,
    calories: sessionCalories > 0 ? sessionCalories : kilojoules,
    trainer: true,
  };
}

/**
 * Parses a .TCX XML file exported from Wahoo ELEMNT App / Zwift / Garmin
 */
export async function parseWahooTcxFile(file: File): Promise<StravaActivity> {
  const text = await file.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');

  const idNode = xml.getElementsByTagName('Id')[0];
  const startDateIso = idNode?.textContent?.trim() || new Date(file.lastModified).toISOString();

  let totalTimeSec = 0;
  let totalDistMeters = 0;
  const lapNodes = Array.from(xml.getElementsByTagName('Lap'));
  for (const lap of lapNodes) {
    const t = parseFloat(lap.getElementsByTagName('TotalTimeSeconds')[0]?.textContent || '0');
    const d = parseFloat(lap.getElementsByTagName('DistanceMeters')[0]?.textContent || '0');
    totalTimeSec += t;
    totalDistMeters += d;
  }

  const wattsArr: number[] = [];
  const hrArr: number[] = [];
  const cadArr: number[] = [];

  const tpNodes = Array.from(xml.getElementsByTagName('Trackpoint'));
  for (const tp of tpNodes) {
    const hrVal = parseFloat(
      tp.getElementsByTagName('HeartRateBpm')[0]?.getElementsByTagName('Value')[0]?.textContent || '0'
    );
    if (hrVal > 35 && hrVal < 240) hrArr.push(hrVal);

    const cadVal = parseFloat(tp.getElementsByTagName('Cadence')[0]?.textContent || '0');
    if (cadVal > 0 && cadVal < 220) cadArr.push(cadVal);

    const wattsNode =
      tp.getElementsByTagName('ns3:Watts')[0] ||
      tp.getElementsByTagName('Watts')[0] ||
      tp.getElementsByTagName(' TPX')[0];
    const wVal = parseFloat(wattsNode?.textContent || '0');
    if (wVal > 0 && wVal < 2500) wattsArr.push(wVal);
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const movingTimeSec = totalTimeSec > 0 ? Math.round(totalTimeSec) : Math.max(600, tpNodes.length);
  const avgWatts = avg(wattsArr);
  const avgHr = avg(hrArr);
  const maxHr = hrArr.length > 0 ? Math.max(...hrArr) : undefined;
  const avgCadence = avg(cadArr);

  const effectiveDistanceMeters =
    totalDistMeters > 100
      ? Math.round(totalDistMeters)
      : Math.round((movingTimeSec / 3600) * (16 + avgWatts * 0.09) * 1000);

  return {
    id: `wahoo_tcx_${Date.now()}_${Math.round(Math.random() * 1000)}`,
    name: `Wahoo KICKR / BOLT: ${file.name.replace(/\.tcx$/i, '')}`,
    type: 'VirtualRide',
    sport_type: 'VirtualRide',
    start_date: startDateIso,
    distance: effectiveDistanceMeters,
    moving_time: movingTimeSec,
    elapsed_time: movingTimeSec,
    total_elevation_gain: 0,
    average_speed: movingTimeSec > 0 ? effectiveDistanceMeters / movingTimeSec : 0,
    average_watts: avgWatts > 0 ? avgWatts : undefined,
    weighted_average_watts: avgWatts > 0 ? avgWatts : undefined,
    average_heartrate: avgHr > 0 ? avgHr : undefined,
    max_heartrate: maxHr,
    average_cadence: avgCadence > 0 ? avgCadence : undefined,
    kilojoules: avgWatts > 0 ? Math.round((avgWatts * movingTimeSec) / 1000) : undefined,
    trainer: true,
  };
}

/**
 * Estimates an athlete's personal submaximal FTP & Zone-2 power from Wahoo KICKR rides + Heart Rate
 * using the Karvonen Heart Rate Reserve (%HRR) relationship.
 */
export function estimateFtpFromWahooRides(
  activities: StravaActivity[],
  settings: UserAthleteSettings
): { estimatedFtpWatts: number; zone2MinWatts: number; zone2MaxWatts: number; sampleCount: number } {
  const valid = activities.filter(
    (a) =>
      (a.average_watts || 0) >= 35 &&
      (a.average_heartrate || 0) >= 85 &&
      (a.moving_time || 0) >= 600
  );

  if (valid.length === 0) {
    const baseFtp = settings.ftpWatts || 90;
    return {
      estimatedFtpWatts: baseFtp,
      zone2MinWatts: Math.round(baseFtp * 0.56),
      zone2MaxWatts: Math.round(baseFtp * 0.75),
      sampleCount: 0,
    };
  }

  const maxHr = settings.maxHeartRate || 164;
  const restHr = settings.restingHeartRate || 62;
  const hrr = Math.max(40, maxHr - restHr);

  const estimates: number[] = [];
  for (const act of valid) {
    const w = act.weighted_average_watts || act.average_watts || 60;
    const hr = act.average_heartrate || 120;
    const pctHrr = Math.min(0.95, Math.max(0.35, (hr - restHr) / hrr));
    // At threshold (FTP), %HRR is typically ~0.82 for recreational/health cyclists
    const impliedFtp = w * (0.82 / pctHrr);
    estimates.push(Math.min(260, Math.max(55, impliedFtp)));
  }

  const avgFtp = Math.round(estimates.reduce((a, b) => a + b, 0) / estimates.length);
  return {
    estimatedFtpWatts: avgFtp,
    zone2MinWatts: Math.round(avgFtp * 0.56),
    zone2MaxWatts: Math.round(avgFtp * 0.75),
    sampleCount: valid.length,
  };
}
