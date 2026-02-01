interface LocationMapProps {
  latitude: number;
  longitude: number;
  schoolName: string;
}

export default function LocationMap({latitude, longitude, schoolName}: LocationMapProps) {
  // Use OpenStreetMap static tiles via an embedded iframe
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <iframe
        title={`Map showing location of ${schoolName}`}
        src={mapUrl}
        width="100%"
        height="200"
        style={{border: 0}}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="bg-gray-50 px-3 py-2 text-sm">
        <a
          href={fullMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
        >
          View larger map
        </a>
        <span className="text-gray-400 ml-2">
          ({latitude.toFixed(4)}, {longitude.toFixed(4)})
        </span>
      </div>
    </div>
  );
}
