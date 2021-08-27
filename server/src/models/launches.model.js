const launchesDatabase = require('./launches.mongo');
const planets = require('./planets.mongo');

const launches = new Map();

const DEFAULT_FLIGHT_NUMBER = 100;

const launch = {
	flightNumber: 100,
	mission: 'Kepler Exploration X',
	rocket: 'Explore IS1',
	launchDate: new Date('December 27, 2030'),
	target: 'Kepler-442 b',
	customers: ['NASA', 'NOAA'],
	upcoming: true,
	success: true,
};

saveLaunch(launch);

async function existsLaunchWithId(launchId) {
	return await launchesDatabase.findOne({
		flightNumber: launchId,
	});
}

async function getLatestFlightNumber() {
	// descending order -> return the first one. i.e: latestLaunch;
	const latestLaunch = await launchesDatabase.findOne().sort('-flightNumber');

	if (!latestLaunch) {
		return DEFAULT_FLIGHT_NUMBER;
	}

	return latestLaunch.flightNumber;
}

async function getAllLaunches() {
	return await launchesDatabase.find(
		{},
		{
			_id: 0,
			__v: 0,
		}
	);
}

async function saveLaunch(launch) {
	const planet = await planets.findOne({
		keplerName: launch.target,
	});

	if (!planet) {
		throw new Error('No matching planet was found');
	}

	await launchesDatabase.findOneAndUpdate(
		{
			// if it exists update else insert
			flightNumber: launch.flightNumber,
		},
		launch,
		{
			upsert: true,
		}
	);
}

async function scheduleNewLaunch(launch) {
	const newFlightNumber = (await getLatestFlightNumber()) + 1;

	const newLaunch = Object.assign(launch, {
		success: true,
		upcoming: true,
		customers: ['ZMT', 'NASA'],
		flightNumber: newFlightNumber,
	});

	await saveLaunch(newLaunch);
}

async function abortLaunchById(launchId) {
	const aborted = await launchesDatabase.updateOne(
		{
			flightNumber: launchId,
		},
		{
			upcoming: false,
			success: false,
		}
	);
	console.log(aborted);

	return aborted.acknowledged === true && aborted.modifiedCount === 1;
}

module.exports = {
	existsLaunchWithId,
	getAllLaunches,
	scheduleNewLaunch,
	abortLaunchById,
};
