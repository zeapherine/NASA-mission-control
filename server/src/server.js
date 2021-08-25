const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const app = require('./app');

const { loadPlanetsData } = require('./models/planets.model');

const PORT = process.env.PORT || 8000;
dotenv.config();

const server = http.createServer(app);

mongoose.connection.once('open', () => {
	console.log('MongoDB connection is ready');
});

mongoose.connection.on('error', (err) => {
	console.error(err);
});

async function startServer() {
	try {
		await mongoose.connect(process.env.MONGO_URL);

		await loadPlanetsData();

		server.listen(PORT, () => {
			console.log(`Listening on port ${PORT}....`);
		});

	} catch (e) {
		console.log(e);
	}
}
startServer();
