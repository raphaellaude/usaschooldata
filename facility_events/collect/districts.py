"""District lookup table mapping NCES LEA IDs to district metadata.

Used for cross-referencing research findings with the NCES directory.parquet
data hosted on R2 at https://data.usaschooldata.org/directory.parquet.
"""

DISTRICTS: dict[str, dict[str, str]] = {
    # Texas
    "48236400": {"name": "Houston ISD", "state": "TX", "city": "Houston"},
    "48162300": {"name": "Dallas ISD", "state": "TX", "city": "Dallas"},
    "48197000": {"name": "Fort Worth ISD", "state": "TX", "city": "Fort Worth"},
    "48002111": {"name": "Cypress-Fairbanks ISD", "state": "TX", "city": "Houston (Cypress)"},
    "48251701": {"name": "Northside ISD", "state": "TX", "city": "San Antonio"},
    "48331200": {"name": "Fort Bend ISD", "state": "TX", "city": "Sugar Land"},
    "48089400": {"name": "Austin ISD", "state": "TX", "city": "Austin"},
    "48161100": {"name": "Arlington ISD", "state": "TX", "city": "Arlington"},
    "48183000": {"name": "Katy ISD", "state": "TX", "city": "Katy"},
    "48466800": {"name": "San Antonio ISD", "state": "TX", "city": "San Antonio"},
    # Florida
    "12003900": {"name": "Miami-Dade County Public Schools", "state": "FL", "city": "Miami"},
    "12001800": {"name": "Broward County Public Schools", "state": "FL", "city": "Fort Lauderdale"},
    "12008700": {"name": "Hillsborough County Public Schools", "state": "FL", "city": "Tampa"},
    "12014400": {"name": "Polk County Public Schools", "state": "FL", "city": "Lakeland"},
    "12015000": {"name": "Palm Beach County School District", "state": "FL", "city": "West Palm Beach"},
    "12004800": {"name": "Duval County Public Schools", "state": "FL", "city": "Jacksonville"},
    "12015900": {"name": "Osceola County School District", "state": "FL", "city": "Kissimmee"},
    "12015600": {"name": "Pinellas County Schools", "state": "FL", "city": "Largo"},
    "12010800": {"name": "Orange County Public Schools", "state": "FL", "city": "Orlando"},
    "12017100": {"name": "Seminole County Public Schools", "state": "FL", "city": "Sanford"},
    # California
    "06227100": {"name": "Los Angeles Unified School District", "state": "CA", "city": "Los Angeles"},
    "06343200": {"name": "San Diego Unified School District", "state": "CA", "city": "San Diego"},
    "06225000": {"name": "Long Beach Unified School District", "state": "CA", "city": "Long Beach"},
    "06145500": {"name": "Fresno Unified School District", "state": "CA", "city": "Fresno"},
    # Illinois
    "17099300": {"name": "Chicago Public Schools", "state": "IL", "city": "Chicago"},
    # Pennsylvania
    "42189900": {"name": "School District of Philadelphia", "state": "PA", "city": "Philadelphia"},
    # North Carolina
    "37047200": {"name": "Wake County Public School System", "state": "NC", "city": "Raleigh"},
    "37029700": {"name": "Charlotte-Mecklenburg Schools", "state": "NC", "city": "Charlotte"},
    "37019200": {"name": "Guilford County Schools", "state": "NC", "city": "Greensboro"},
    # Virginia
    "51012600": {"name": "Fairfax County Public Schools", "state": "VA", "city": "Fairfax"},
    "51022500": {"name": "Prince William County Public Schools", "state": "VA", "city": "Manassas"},
    "51031300": {"name": "Loudoun County Public Schools", "state": "VA", "city": "Ashburn"},
    # Maryland
    "24004800": {"name": "Montgomery County Public Schools", "state": "MD", "city": "Rockville"},
    "24005100": {"name": "Prince George's County Public Schools", "state": "MD", "city": "Upper Marlboro"},
    "24001200": {"name": "Baltimore City Public Schools", "state": "MD", "city": "Baltimore"},
    "24000900": {"name": "Baltimore County Public Schools", "state": "MD", "city": "Towson"},
    # Georgia
    "13025500": {"name": "Gwinnett County Public Schools", "state": "GA", "city": "Suwanee"},
    "13012900": {"name": "Cobb County School District", "state": "GA", "city": "Marietta"},
    "13017400": {"name": "DeKalb County School District", "state": "GA", "city": "Stone Mountain"},
    "13022800": {"name": "Fulton County Schools", "state": "GA", "city": "Atlanta"},
    # Colorado
    "08033600": {"name": "Denver Public Schools", "state": "CO", "city": "Denver"},
    "08048000": {"name": "Jefferson County Public Schools", "state": "CO", "city": "Golden"},
    "08034500": {"name": "Douglas County School District", "state": "CO", "city": "Castle Rock"},
    # Nevada
    "32000600": {"name": "Clark County School District", "state": "NV", "city": "Las Vegas"},
    "32000010": {"name": "Nevada State-Sponsored Charter Schools", "state": "NV", "city": "Various"},
    # Tennessee
    "47001480": {"name": "Shelby County Schools", "state": "TN", "city": "Memphis"},
    "47031800": {"name": "Metro Nashville Public Schools", "state": "TN", "city": "Nashville"},
    # Ohio
    "39043780": {"name": "Columbus City Schools", "state": "OH", "city": "Columbus"},
    # Wisconsin
    "55096000": {"name": "Milwaukee Public Schools", "state": "WI", "city": "Milwaukee"},
    # Indiana
    "18047700": {"name": "Indianapolis Public Schools", "state": "IN", "city": "Indianapolis"},
    # Minnesota
    "27000250": {"name": "Minneapolis Public Schools", "state": "MN", "city": "Minneapolis"},
    "27212400": {"name": "Saint Paul Public Schools", "state": "MN", "city": "Saint Paul"},
    # Louisiana
    "22008400": {"name": "East Baton Rouge Parish School System", "state": "LA", "city": "Baton Rouge"},
    "22015600": {"name": "Jefferson Parish Schools", "state": "LA", "city": "Harvey"},
    # New Jersey
    "34126900": {"name": "Newark Public Schools", "state": "NJ", "city": "Newark"},
    # Kentucky
    "21029900": {"name": "Jefferson County Public Schools", "state": "KY", "city": "Louisville"},
    # Massachusetts
    "25027900": {"name": "Boston Public Schools", "state": "MA", "city": "Boston"},
    # Oklahoma
    "40227700": {"name": "Oklahoma City Public Schools", "state": "OK", "city": "Oklahoma City"},
    # Michigan
    "26054300": {"name": "Detroit Public Schools Community District", "state": "MI", "city": "Detroit"},
}


# Reverse lookup: lowercase name fragments -> LEA ID
_NAME_TO_LEA: dict[str, str] = {}
for _lea_id, _info in DISTRICTS.items():
    _name_lower = _info["name"].lower()
    _NAME_TO_LEA[_name_lower] = _lea_id
    _NAME_TO_LEA[_name_lower.replace(" public schools", "")] = _lea_id
    _NAME_TO_LEA[_name_lower.replace(" school district", "")] = _lea_id

# Common abbreviations
_NAME_TO_LEA.update(
    {
        "houston isd": "48236400",
        "hisd": "48236400",
        "dallas isd": "48162300",
        "fort worth isd": "48197000",
        "cypress-fairbanks isd": "48002111",
        "cyfair isd": "48002111",
        "northside isd": "48251701",
        "fort bend isd": "48331200",
        "austin isd": "48089400",
        "lausd": "06227100",
        "cps": "17099300",
        "cms": "37029700",
        "fcps": "51012600",
        "mcps": "24004800",
        "pgcps": "24005100",
        "bcps": "24000900",
        "mps": "55096000",
        "ips": "18047700",
        "dps": "08033600",
    }
)


def find_lea_id(district_name: str) -> str | None:
    """Find an NCES LEA ID for a district name using fuzzy matching."""
    name_lower = district_name.lower().strip()
    if name_lower in _NAME_TO_LEA:
        return _NAME_TO_LEA[name_lower]
    for key, lea_id in _NAME_TO_LEA.items():
        if key in name_lower or name_lower in key:
            return lea_id
    return None
