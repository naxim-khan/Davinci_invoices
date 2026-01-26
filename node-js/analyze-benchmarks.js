const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, 'benchmarks', 'results.json');
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

const flights = results.filter(r => r.flightId);
const batchSummaries = results.filter(r => r.batchSize);

// Total flights is straightforward
const totalFlights = flights.length;

// Average time of a single processed flight
const sumIndividualDurationsMs = flights.reduce((sum, f) => sum + f.durationMs, 0);
const averageDurationMs = sumIndividualDurationsMs / totalFlights;

// Total time taken by the overall data
// Logic: Sum of all batch durations + duration of flights that are NOT part of a batch.
// We can check if a flight's timestamp is before a batch's timestamp and within a reasonable range.
// Or more simply: total duration sum of all records that represent a unique processing event.
// In this logs structure, a batch summary represents 10 flights.
// So: Total Work Time = Sum(BatchDurations) + Sum(Durations of flights not counted in any batch)

const totalBatchTime = batchSummaries.reduce((sum, b) => sum + b.durationMs, 0);
const flightsInBatches = batchSummaries.reduce((sum, b) => sum + b.batchSize, 0);
const looseFlightsCount = totalFlights - flightsInBatches;

// Let's find the loose flights
// A flight is loose if it's not followed by a batch summary that includes it.
// Given the sequential nature:
let totalWorkTimeMs = 0;
results.forEach(record => {
    if (record.batchSize) {
        totalWorkTimeMs += record.durationMs;
    }
});

// Add durations of flights processed AFTER the last batch summary
let lastBatchIndex = -1;
for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].batchSize) {
        lastBatchIndex = i;
        break;
    }
}

let extraTimeMs = 0;
for (let i = lastBatchIndex + 1; i < results.length; i++) {
    if (results[i].durationMs) {
        extraTimeMs += results[i].durationMs;
    }
}

// Check for loose flights BETWEEN batches? 
// The log shows Batch 11, then some individual flights, then Batch 12.
// Actually, it's safer to sum all flight durations if we want "Active Processing Time".
// But the user asked for "total time taken by the overall data".
// Usually, this is the wall-clock time of active periods.

const report = {
    totalFlightsProcessed: totalFlights,
    averageFlightDuration: (averageDurationMs / 1000).toFixed(2) + "s",
    totalActiveProcessingTime: ((totalBatchTime + extraTimeMs) / 1000 / 60).toFixed(2) + " minutes",
    totalWorkloadDuration: (sumIndividualDurationsMs / 1000 / 60).toFixed(2) + " minutes",
    batchCount: batchSummaries.length,
    looseFlights: looseFlightsCount
};

console.log(JSON.stringify(report, null, 2));
