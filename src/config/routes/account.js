const AuthProvider = require('../../core/auth.provider')

module.exports = (app, resourceCollection) => {
    app.post('/api/login', async (req, res) => {
        const {email, password} = req.body
        const user = {
            email: email.toLowerCase()
        }
        const findUser = await resourceCollection('users').findOne(user)
        const role = await resourceCollection('roles').findOne({slug: findUser.role})
        if (!role.isUser) {
            const result = await AuthProvider.checkLogin(resourceCollection('users'), user, password)
            if (result.success)
                res
                    .status(result.status)
                    .send({
                        success: true,
                        token: result.token
                    })
            else
                res
                    .status(result.status)
                    .send({
                        success: false,
                        msg: result.msg
                    })
        } else {
            res.send({
                success: false,
                msg: 'Извините, вам вход воспрещён'
            })
        }
    })

    app.get('/api/profile', (req, res) => {
        const token = req.headers.authorization
        const user = AuthProvider.decode(token)
        if (user)
            return res.send({
                success: true,
                user: user.email
            })
        else
            return res.send({
                success: false,
                msg: 'Пользователь не найден'
            })
    })

    app.post('/api/profile', async (req, res) => {
        const profile = req.body
        const token = req.headers.authorization
        const oldUser = AuthProvider.decode(token)
        const newToken = AuthProvider._getToken({email: profile.user}, 'SYW/:ZIFrxd\')ueR#<Oj,ABzutT]QI({%MekfS9(l|7NM-&m6RTgP@)X44sOGVE')
        await resourceCollection('users').update({email: oldUser.email}, {$set: {email: profile.user}})
        const newUser = await resourceCollection('users').findOne({email: profile.user})
        return res
            .status(200)
            .send({
                success: true,
                token: newToken,
                profile: newUser
            })
    })
}
