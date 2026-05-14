import { NextResponse } from 'next/server';
import { getF1Data } from '@/lib/f1Data';
import { generateDailyGrid } from '@/lib/gridGenerator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { drivers, fetchedAt } = await getF1Data();
    const today = new Date();
    const grid = generateDailyGrid(drivers, today);

    const driverLookup: Record<string, { fullName: string; initials: string; nationality: string }> = {};
    for (const [id, driver] of drivers) {
      driverLookup[id] = {
        fullName: driver.fullName,
        initials: `${driver.givenName[0] ?? ''}${driver.familyName[0] ?? ''}`,
        nationality: driver.nationality,
      };
    }

    const driverList = Array.from(drivers.values())
      .filter((d) => d.constructors.length > 0)
      .map((d) => ({
        id: d.id,
        fullName: d.fullName,
        givenName: d.givenName,
        familyName: d.familyName,
        nationality: d.nationality,
      }));

    return NextResponse.json({
      grid,
      driverLookup,
      driverList,
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
