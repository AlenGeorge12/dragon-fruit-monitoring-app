import { FarmLocation } from '@/types/farm';

// Generate Greenhouse locations
const generateGreenhouseLocations = (): FarmLocation[] => {
  const locations: FarmLocation[] = [];
  const zones = ['North', 'South'] as const;
  
  zones.forEach(zone => {
    for (let gh = 1; gh <= 4; gh++) {
      for (let row = 1; row <= 3; row++) {
        for (let pole = 0; pole < 12; pole++) {
          const poleLetter = String.fromCharCode(65 + pole); // A-L
          const id = `${zone[0]}${gh}${row}${poleLetter}`;
          const name = `${zone} GH${gh} Row${row} Pole${poleLetter}`;
          
          locations.push({
            id,
            type: 'Greenhouse',
            zone,
            name,
          });
        }
      }
    }
  });
  
  return locations;
};

// Generate Trellis locations
const generateTrellisLocations = (): FarmLocation[] => {
  const locations: FarmLocation[] = [];
  const zones = ['North', 'South'] as const;
  
  zones.forEach(zone => {
    for (let trellis = 1; trellis <= 4; trellis++) {
      for (let section = 0; section < 10; section++) {
        const sectionLetter = String.fromCharCode(65 + section); // A-J
        const id = `${zone[0]}T${trellis}${sectionLetter}`;
        const name = `${zone} Trellis ${trellis} Section ${sectionLetter}`;
        
        locations.push({
          id,
          type: 'Trellis',
          zone,
          name,
        });
      }
    }
  });
  
  return locations;
};

// Generate Double Pole locations
const generateDoublePoleLocations = (): FarmLocation[] => {
  const locations: FarmLocation[] = [];
  const zones = ['North', 'South'] as const;
  const positions = ['Upper', 'Lower'] as const;
  
  zones.forEach(zone => {
    positions.forEach(position => {
      for (let pole = 1; pole <= 6; pole++) {
        const id = `${zone[0]}DP${position[0]}${pole}`;
        const name = `${zone} Double Pole ${position} ${pole}`;
        
        locations.push({
          id,
          type: 'Double Pole',
          zone,
          name,
        });
      }
    });
  });
  
  return locations;
};

export const getAllFarmLocations = (): FarmLocation[] => {
  return [
    ...generateGreenhouseLocations(),
    ...generateTrellisLocations(),
    ...generateDoublePoleLocations(),
  ];
};

export const getLocationsByType = (type: FarmLocation['type']): FarmLocation[] => {
  return getAllFarmLocations().filter(location => location.type === type);
};

export const getLocationsByZone = (zone: FarmLocation['zone']): FarmLocation[] => {
  return getAllFarmLocations().filter(location => location.zone === zone);
};

export const getLocationById = (id: string): FarmLocation | undefined => {
  return getAllFarmLocations().find(location => location.id === id);
};