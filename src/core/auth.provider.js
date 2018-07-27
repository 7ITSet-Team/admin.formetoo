const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

class AuthProvider {
    static async _verifyToken(collection, token) {
        const decoded = jwt.decode(token)
        if (!!decoded) {
            const result = await collection.findOne({email: decoded.email})
            return !!result
        } else
            return false
    }

    static decode(token) {
        return jwt.decode(token)
    }

    static _getToken(payload, secret) {
        return jwt.sign(payload, secret)
    }

    static async getHash(password) {
        const salt = await bcrypt.genSalt(10)
        return await bcrypt.hash(password, salt)
    }

    static async checkLogin(collection, user, password) {
        const result = await collection.findOne(user)
        if (!!result) {
            const success = await bcrypt.compare(password, result.password)
            if (success) {
                return {
                    success: true,
                    status: 200,
                    token: this._getToken(user, 'SYW/:ZIFrxd\')ueR#<Oj,ABzutT]QI({%MekfS9(l|7NM-&m6RTgP@)X44sOGVE')
                }
            } else {
                return {
                    success: false,
                    status: 401,
                    msg: 'Неверный пароль!'
                }
            }
        } else {
            return {
                success: false,
                status: 401,
                msg: 'Пользователь не найден!'
            }
        }
    }
}

module.exports = AuthProvider