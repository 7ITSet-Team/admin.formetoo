const ObjectID = require('mongodb').ObjectID
const multer = require('multer')
const fs = require('fs')
const parse = require('csv-parse')
const Papa = require('papaparse')

const resources = require('../constants/constants').resources
const AuthProvider = require('../core/auth.provider')
const DataProvider = require('../core/data.provider')

module.exports = (app, resourceCollection) => {
    return resources.forEach((resource) => {
        app.get('/allowed', async (req, res) => {
            const allowedResources = await DataProvider.sendAllowedResources(resourceCollection('users'), resourceCollection, req.headers.authorization)
            if (allowedResources.success)
                return res
                    .status(200)
                    .send({
                        success: true,
                        allowed: allowedResources.list
                    })
            else
                return res
                    .status(allowedResources.status)
                    .send({
                        success: false,
                        allowed: allowedResources.msg
                    })
        })

        app.get('/' + resource, async (req, res) => {
            const resources = await resourceCollection(resource).find({}).toArray()
            const count = await resourceCollection(resource).count()
            if (!resources && !count)
                return res.send({
                    success: false,
                    msg: `${resource} не найдены!`
                })
            let data = {
                success: true,
                total: count
            }
            data[resource] = resources
            return res.send(data)
        })

        app.get('/' + resource + '/:id', async (req, res) => {
            const item = await resourceCollection(resource).findOne({_id: ObjectID(req.params.id)})
            if (!item)
                return res.send({
                    success: false,
                    msg: 'Ресурс не найден!'
                })
            return res.send(item)
        })

        app.post('/' + resource, async (req, res) => {
            if (resource === 'users') {
                let user = req.body
                user.password = await AuthProvider.getHash(req.body.password)
                try {
                    resourceCollection(resource).insert(user)
                } catch (error) {
                    return res.send({
                        success: false,
                        msg: 'Ошибка создания пользователя'
                    })
                }
                return res.send({
                    success: true
                })
            }
            try {
                resourceCollection(resource).insert(req.body)
            } catch (error) {
                return res.send({
                    success: false,
                    msg: 'Ошибка создания пользователя'
                })
            }
            return res.send({
                success: true
            })
        })

        app.post('/' + resource + '/:id', (req, res) => {
            if (resource === 'users') {
                let user = req.body
                user.password = AuthProvider.getHash(req.body.password)
                user._id = ObjectID(req.params.id)
                resourceCollection(resource).findOneAndUpdate({_id: ObjectID(req.params.id)}, user)
                    .catch(() => {
                        return res.send({
                            success: false,
                            msg: 'Ошибка редактирования ресурса'
                        })
                    })
                return res.send({
                    success: true
                })
            }
            let newResource = req.body
            newResource._id = ObjectID(newResource._id)
            resourceCollection(resource).findOneAndUpdate({_id: ObjectID(req.params.id)}, newResource)
                .catch(() => {
                    return res.send({
                        success: false,
                        msg: 'Ошибка редактирования ресурса'
                    })
                })
        })

        app.post('/:resource/:id/delete', (req, res) => {
            resourceCollection(req.params.resource).deleteOne({_id: ObjectID(req.params.id)})
        })

        const upload_middleware = multer({dest: './'})

        app.post('/export/:resource', upload_middleware.single('file'), (req, res) => {
            fs.readFile(req.file.path, {encoding: 'utf-8'}, (err, data) => {
                if (err) throw err
                fs.unlinkSync(req.file.path)
                parse(data, {delimiter: ';', columns: true}, async (err, output) => {
                    if (err) throw err
                    output.forEach(item => {
                        item.seo = {
                            title: item.seo_title,
                            description: item.seo_description,
                            keywords: item.seo_keywords
                        }
                        if (item.isActive === 'TRUE' || item.isActive === 'true')
                            item.isActive = true
                        else
                            item.isActive = false
                        delete item.seo_title
                        delete item.seo_description
                        delete item.seo_keywords
                        item.categories = item.categories.split(/\s*,\s*/)
                        item['tab-sets'] = item['tab-sets'].split(/\s*,\s*/)
                        item['attribute-sets'] = item['attribute-sets'].split(/\s*,\s*/)
                        item.images = item.images.split(/\s*,\s*/)
                        item.relatedProducts = item.relatedProducts.split(/\s*,\s*/)
                        item.creationDate = new Date()
                        item.modificationDate = new Date()
                    })
                    await resourceCollection(req.params.resource).insert(output)
                    await resourceCollection(req.params.resource).find({}).toArray()
                    await resourceCollection(req.params.resource).count()
                    res.send({
                        success: true
                    })
                })
            })
        })

        app.get('/import/:resource', async (req, res) => {
            let resources = await resourceCollection(req.params.resource).find({}).toArray()
            const newResources = resources.map(resource => {
                let newResource = {
                    ...resource,
                    seo_title: resource.seo.title,
                    seo_description: resource.seo.description,
                    seo_keywords: resource.seo.keywords
                }
                if (resource.isActive === 'TRUE')
                    resource.isActive = true
                else
                    resource.isActive = false
                delete newResource.seo
                delete newResource._id
                return newResource
            })
            const unparse = Papa.unparse(newResources, {
                delimiter: ';'
            })
            fs.writeFileSync(`${__dirname}/${req.params.resource}.csv`, unparse)
            const path = `${__dirname + '/' + req.params.resource}.csv`
            res.download(path)
        })
    })
}