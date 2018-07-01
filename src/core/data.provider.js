const jwt = require('jsonwebtoken')
const mapObj = require('map-obj')

class DataProvider {
    static async sendAllowedResources(user, resources, token) {
        const decoded = jwt.decode(token)
        if (!!decoded) {
            const result = await user.findOne({email: decoded.email})
            if (!!result) {
                const roots = await resources('roles').findOne({slug: result.role})
                if (!roots)
                    return {
                        success: false,
                        status: 503,
                        msg: 'Не найдена роль пользователя'
                    }
                let allowedResources = []
                let i = 0
                mapObj(roots.resources, (key, value) => {
                    if (value.showInMenu) {
                        allowedResources[i] = {
                            resource: key,
                            permissions: value.permissions
                        }
                        i = i + 1
                    }
                    return [key, value]
                })
                return {
                    success: true,
                    list: allowedResources
                }
            } else {
                return {
                    success: false,
                    status: 503,
                    msg: 'По указаной в токене почте пользователь был не найден'
                }
            }
        } else {
            return {
                success: false,
                status: 503,
                msg: 'По указаному authorization token пользователь был не найден'
            }
        }
    }
}

module.exports = DataProvider