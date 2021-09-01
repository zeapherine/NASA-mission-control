const axios = require('axios');

const launchesDatabase = require('./launches.mongo');
const planets = require('./planets.mongo');

const launches = new Map();

const DEFAULT_FLIGHT_NUMBER = 100;
const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

const launch = {
	flightNumber: 100, // flight_number -> variable names from spacex api
	mission: 'Kepler Exploration X', // name
	rocket: 'Explore IS1', //rocket.name
	launchDate: new Date('December 27, 2030'), // date_local
	target: 'Kepler-442 b', //  not applicable for spaceX missions.
	customers: ['NASA', 'DARPA'], // payload.customers for each payload
	upcoming: true, // upcoming
	success: true, // success
};

saveLaunch(launch);

async function loadLaunchData() {
	console.log('Downloading launch data...');

	const response = await axios.post(SPACEX_API_URL, {
		query: {},
		options: {
			populate: [
				{
					path: 'rocket',
					select: {
						name: 1,
					},
				},
				{
					path: 'payloads',
					select: {
						customers: 1,
					},
				},
			],
		},
	});

	const launchDocs = response.data.docs;
	for (const launchDoc of launchDocs) {
		const payloads = launchDoc['payloads'];
		const customers = payloads.flatMap((payload) => payload['customers']);

		const launch = {
			flightNumber: launchDoc['flight_number'],
			mission: launchDoc['name'],
			rocket: launchDoc['rocket']['name'],
			launchDate: launchDoc['date_local'],
			upcoming: launchDoc['upcoming'],
			success: launchDoc['success'],
			customers,
		};

		console.log(`${launch.flightNumber} and ${launch.mission}`);
	}
}

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
	loadLaunchData,
	existsLaunchWithId,
	getAllLaunches,
	scheduleNewLaunch,
	abortLaunchById,
};
