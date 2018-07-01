const AuthProvider = require('../../core/auth.provider')

module.exports = (app, client) => {
	let resourceCollection = resource => client.db('testdb').collection(resource)

	app.all('*', async (req, res, next) => {
		const token = req.headers.authorization
		const isVerified = await AuthProvider._verifyToken(resourceCollection('users'), token)
		if ((!isVerified || !token) && req.params[0] !== '/api/login' && req.params[0].indexOf('import') === -1) {
			return res
				.status(401)
				.send({
					success: false,
					msg: 'Токен не валиден!'
				})
		} else {
			next()
		}
	})

	require('./account.js')(app, resourceCollection)
	require('./resources.js')(app, resourceCollection)
}
