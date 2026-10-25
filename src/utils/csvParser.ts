import Papa from 'papaparse';
import { StravaActivity } from '../types/strava';

export function parseStravaCsv(csvText: string): Promise<StravaActivity[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          const activities: StravaActivity[] = [];

          results.data.forEach((row: any, idx: number) => {
            // Find fields with flexible case/naming (Strava bulk export format)
            const id = row['Activity ID'] || row['ID'] || row['id'] || `csv-${idx}`;
            const name = row['Activity Name'] || row['Name'] || row['Title'] || row['name'] || 'Training';
            const rawType = row['Activity Type'] || row['Type'] || row['type'] || 'Run';

            // Dates: can be "Oct 12, 2024, 8:30:00 AM" or "2024-10-12 08:30:00" etc.
            const rawDate = row['Activity Date'] || row['Date'] || row['Start Date'] || row['start_date'];
            let startDate = new Date().toISOString();
            if (rawDate) {
              const parsed = new Date(rawDate);
              if (!isNaN(parsed.getTime())) {
                startDate = parsed.toISOString();
              }
            }

            // Distance: Strava CSV usually gives distance in km or meters.
            // If distance is e.g. 10.5, it's km; if it's 10500, it's meters.
            let rawDistance = parseFloat(row['Distance'] || row['distance'] || 0);
            if (rawDistance < 300 && rawDistance > 0) {
              // It's in kilometers, convert to meters
              rawDistance = rawDistance * 1000;
            }

            const movingTime = parseInt(row['Moving Time'] || row['moving_time'] || row['Elapsed Time'] || 0, 10);
            const elapsedTime = parseInt(row['Elapsed Time'] || row['elapsed_time'] || movingTime, 10);
            const elevation = parseFloat(row['Elevation Gain'] || row['total_elevation_gain'] || 0);

            // Speed
            let avgSpeed = parseFloat(row['Average Speed'] || row['average_speed'] || 0);
            if (avgSpeed > 50) {
              // If it's in km/h, convert to m/s
              avgSpeed = avgSpeed / 3.6;
            } else if (avgSpeed <= 0 && movingTime > 0 && rawDistance > 0) {
              avgSpeed = rawDistance / movingTime;
            }

            const avgHr = parseFloat(row['Average Heart Rate'] || row['average_heartrate'] || 0);
            const maxHr = parseFloat(row['Max Heart Rate'] || row['max_heartrate'] || 0);
            const avgWatts = parseFloat(row['Average Watts'] || row['average_watts'] || 0);
            const sufferScore = parseFloat(row['Relative Effort'] || row['suffer_score'] || 0);
            const cadence = parseFloat(row['Average Cadence'] || row['average_cadence'] || 0);

            if (rawDistance > 0 || movingTime > 0) {
              activities.push({
                id,
                name: String(name),
                type: String(rawType),
                start_date: startDate,
                distance: rawDistance,
                moving_time: movingTime,
                elapsed_time: elapsedTime,
                total_elevation_gain: elevation,
                average_speed: avgSpeed,
                average_heartrate: avgHr > 40 ? avgHr : undefined,
                max_heartrate: maxHr > 40 ? maxHr : undefined,
                average_watts: avgWatts > 0 ? avgWatts : undefined,
                average_cadence: cadence > 0 ? cadence : undefined,
                suffer_score: sufferScore > 0 ? sufferScore : undefined,
              });
            }
          });

          // Sort by start_date descending
          activities.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
          resolve(activities);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => {
        reject(err);
      },
    });
  });
}
