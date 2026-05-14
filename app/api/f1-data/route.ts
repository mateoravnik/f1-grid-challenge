import { NextResponse } from 'next/server';
import { getF1Data } from '@/lib/f1Data';
import { generateDailyGrid } from '@/lib/gridGenerator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { drivers } = await getF1Data();
    const today = new Date();
    const grid = generateDailyGrid(drivers, today);

    // Build driver lookup for client (id → name + initials)
    const driverLookup: Record<string, { fullName: string; initials: string; nationality: string }> = {};
    for (const [id, driver] of drivers) {
      driverLookup[id] = {
        fullName: driver.fullName,
        initials: `${driver.givenName[0] ?? ''}${driver.familyName[0] ?? ''}`,
        nationality: driver.nationality,
      };
    }

    // Serialize driver list for autocomplete (only drivers with known team history)
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
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('F1 data error:', err);
    return NextResponse.json(
      { error: 'Failed to load F1 data. Please try again.' },
      { status: 500 }
    );
  }
}
