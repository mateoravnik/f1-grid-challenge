import { NextResponse } from 'next/server';
import { getF1Data } from '@/lib/f1Data';
import { generateDailyGrid } from '@/lib/gridGenerator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { drivers, fetchedAt } = await getF1Data();
    const grid = generateDailyGrid(drivers);

    const driverLookup: Record<string, { fullName: string; initials: string; nationality: string }> = {};
    for (const [id, driver] of drivers) {
      driverLookup[id] = {
        fullName: driver.fullName,
        initials: `${driver.givenName[0] ?? ''}${driver.familyName[0] ?? ''}`,
        nationality: driver.nationality,
      };
    }

    const allDrivers = Array.from(drivers.values()).filter((d) => d.constructors.length > 0);

    const driverList = allDrivers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      givenName: d.givenName,
      familyName: d.familyName,
      nationality: d.nationality,
    }));

    const driverProfiles = allDrivers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      givenName: d.givenName,
      familyName: d.familyName,
      nationality: d.nationality,
      constructors: d.constructors,
      isChampion: d.isChampion,
      isRaceWinner: d.isRaceWinner,
      racedIn90s: d.racedIn90s,
      racedIn2000s: d.racedIn2000s,
      racedIn2010s: d.racedIn2010s,
      gpsOver100: d.gpsOver100,
      isLatinAmerican: d.isLatinAmerican,
      isEuropean: d.isEuropean,
      winsOver10: d.winsOver10,
    }));

    return NextResponse.json({
      grid,
      driverLookup,
      driverList,
      driverProfiles,
      driverCount: drivers.size,
      generatedAt: new Date(fetchedAt).toISOString(),
    });
  } catch (err) {
    console.error('F1 data error:', err);
    return NextResponse.json(
      { error: 'No se pudo generar la grilla. Por favor recargá la página.' },
      { status: 500 }
    );
  }
}
