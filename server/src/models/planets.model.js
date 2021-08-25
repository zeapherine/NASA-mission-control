const fs = require('fs');
const path = require('path');
const parse = require('csv-parse');

const planets = require('./planets.mongo');

function isHabitablePlanet(planet) {
	return (
		planet['koi_disposition'] === 'CONFIRMED' &&
		planet['koi_insol'] > 0.36 &&
		planet['koi_insol'] < 1.11 &&
		planet['koi_prad'] < 1.6
	);
}

function loadPlanetsData() {
	return new Promise((resolve, reject) => {
		// createReadStream is a asynchronous
		fs.createReadStream(
			path.join(__dirname, '..', '..', 'data', 'kepler_data.csv')
		)
			.pipe(
				parse({
					comment: '#',
					columns: true,
				})
			)
			.on('data', async (data) => {
				if (isHabitablePlanet(data)) {
					savePlanet(data);
				}
			})
			.on('error', (err) => {
				console.log(err);
				reject(err);
			})
			.on('end', async () => {
				const countPlanetsFound = (await getAllPlanets()).length;
				console.log(`${countPlanetsFound} habitable planets found`);

				resolve(); // data is ready.
			});
	});
}

async function getAllPlanets() {
	return await planets.find({});
}

async function savePlanet(planet) {
	try {
		//  insert + update = upsert
		await planets.updateOne(
			{
				keplerName: planet.kepler_name,
			},
			{
				keplerName: planet.kepler_name,
			},
			{
				upsert: true,
			}
		);
	} catch (e) {
		console.error(`Could not save planet ${e}`);
	}
}

module.exports = {
	loadPlanetsData,
	getAllPlanets,
};
