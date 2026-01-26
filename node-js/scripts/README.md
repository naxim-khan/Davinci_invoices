# Flight Data Fetcher Script

Production-grade TypeScript script to fetch flight data from Prisma and Apache Pinot.

## Features

- ✅ **Strict TypeScript** - No `any` or `unknown` types
- ✅ **Production Error Handling** - Comprehensive error reporting
- ✅ **Database Integration** - Fetches flightId from Prisma
- ✅ **Pinot Query** - Queries Apache Pinot for complete flight data
- ✅ **JSON Output** - Clean, well-formatted JSON file

## Configuration

Add the following to your `.env` file:

```env
# Required
PINOT_HTTP_BROKER_URL=http://your-pinot-broker:8099
DATABASE_URL=postgresql://...

# Optional (defaults to 'flights')
PINOT_TABLE_NAME=your_table_name
```

## Usage

```bash
npm run fetch-flight-data
```

## What It Does

1. **Fetches flightId** from `FlightProcessingQueue` table (most recent entry)
2. **Queries Apache Pinot** using the flightId
3. **Saves result** to `flightData.json` in the project root

## Output Format

The script creates `flightData.json` with the following structure:

```json
{
  "flightId": "2733199892",
  "columnName1": "value1",
  "columnName2": "value2",
  ...
}
```

Column names are automatically mapped from Pinot's response schema.

## Error Handling

The script includes comprehensive error handling for:
- Missing environment variables
- Empty FlightProcessingQueue table
- Pinot connection failures
- Invalid table names
- Query errors
- File write errors

## Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛫 Flight Data Fetcher
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Fetching flightId from FlightProcessingQueue...
✅ Found flightId: 2733199892
ℹ️  Querying Pinot at: http://...
ℹ️  Using table: flights
ℹ️  Executing query: SELECT * FROM flights WHERE flightId = 2733199892 LIMIT 1
✅ Retrieved 1 row(s) from Pinot
ℹ️  Query took 245ms, scanned 42 documents
ℹ️  Saving flight data to: D:\davinci_server\flightData.json
✅ Flight data saved successfully to flightData.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Flight data fetch completed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### Table Does Not Exist Error

If you see `TableDoesNotExistError`, update your `.env` file:

```env
PINOT_TABLE_NAME=your_correct_table_name
```

### No Flights in Queue

If you see "No flights found in FlightProcessingQueue", ensure your database has entries in this table.

### Pinot Connection Error

Verify your `PINOT_HTTP_BROKER_URL` is correct and the Pinot broker is accessible.
