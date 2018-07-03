const ObjectID = require('mongodb').ObjectID
const multer = require('multer')
const fs = require('fs')
const cloudinary = require('cloudinary')
const Papa = require('papaparse')
const gm = require('gm')
const archiver = require('archiver')

const AuthProvider = require('../../core/auth.provider')
const DataProvider = require('../../core/data.provider')

cloudinary.config({
	cloud_name: 'dtb4964cx',
	api_key: '822487292722641',
	api_secret: '86YmWPtQibGaXOkxQDmRJgXqC8U'
})

module.exports = (app, resourceCollection) => {
    const upload_middleware = multer({dest: './'})

    app.get('/api/allowed', async (req, res) => {
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

    app.post('/api/products/get/:resource', async (req, res) => {
        if (req.params.resource === 'attributes') {
            const attrSets = await resourceCollection('attribute-sets').find({
                slug: {
                    $in: req.body
                }
            }).toArray()
            let attributeSlugs = []
            attrSets.forEach(set => {
                attributeSlugs.push(...set.attributes)
            })
            const attributes = await resourceCollection('attributes').find({
                slug: {
                    $in: attributeSlugs
                }
            }).toArray()

            res.send(attributes)
        }
        if (req.params.resource === 'tabs') {
            const tabSets = await resourceCollection('tab-sets').find({
                slug: {
                    $in: product['tab-sets']
                }
            }).toArray()
            let tabSlugs = []
            tabSets.forEach(set => {
                tabSlugs.push(...set.tabs)
            })
            const tabs = await resourceCollection('tabs').find({
                slug: {
                    $in: tabSlugs
                }
            }).toArray()

            res.send(tabs)
        }
    })

    app.post('/api/export/:resource', upload_middleware.single('file'), (req, res) => {
        fs.readFile(req.file.path, {encoding: 'utf-8'}, async (err, data) => {
            if (err) throw err
            fs.unlinkSync(req.file.path)
            const parsed = Papa.parse(data, {
                delimiter: ';',
                encoding: 'CP1251',
                header: true
            })
            const output = parsed.data
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
                !!item.categories ? item.categories = item.categories.split(/\s*,\s*/) : item.categories = []
                !!item['tab-sets'] ? item['tab-sets'] = item['tab-sets'].split(/\s*,\s*/) : item['tab-sets'] = []
                !!item['attribute-sets'] ? item['attribute-sets'] = item['attribute-sets'].split(/\s*,\s*/) : item['attribute-sets'] = []
                !!item.images ? item.images = item.images.split(/\s*,\s*/) : item.images = []
                !!item.relatedProducts ? item.relatedProducts = item.relatedProducts.split(/\s*,\s*/) : item.relatedProducts = []
                item.attributes = []
                item.tabs = []
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

    app.get('/api/import/:resource', async (req, res) => {
        let resources = await resourceCollection(req.params.resource).find({}).toArray()
        const newResources = resources.map(resource => {
            let newResource = {
                ...resource,
                seo_title: resource.seo.title,
                seo_description: resource.seo.description,
                seo_keywords: resource.seo.keywords
            }
            resource.attributes.forEach(attribute => {
                if (attribute.attrType === 'multipleSelect') {
                    newResource[attribute.name] = attribute.value.join(', ')
                    return true
                }
                if (attribute.attrType === 'interval') {
                    newResource[attribute.name + '_from'] = attribute.value.from
                    newResource[attribute.name + '_to'] = attribute.value.to
                    return true
                }
                newResource[attribute.name] = attribute.value
            })
            resource.tabs.forEach(tab => {
                newResource[tab.name] = tab.value
            })
            if (resource.isActive === 'TRUE')
                resource.isActive = true
            else
                resource.isActive = false
            delete newResource.attributes
            delete newResource.tabs
            delete newResource.seo
            delete newResource._id
            delete newResource.attributes
            delete newResource.tabs
            !!newResource.categories ? newResource.categories = newResource.categories.join(', ') : newResource.categories = ''
            !!newResource['attribute-sets'] ? newResource['attribute-sets'] = newResource['attribute-sets'].join(', ') : newResource['attribute-sets'] = ''
            !!newResource['tab-sets'] ? newResource['tab-sets'] = newResource['tab-sets'].join(', ') : newResource['tab-sets'] = ''
            !!newResource.fromSet ? newResource.fromSet = newResource.fromSet.join(', ') : newResource.fromSet = ''
            !!newResource.relatedProducts ? newResource.relatedProducts = newResource.relatedProducts.join(', ') : newResource.relatedProducts = ''
            !!newResource.images ? newResource.images = newResource.images.join(', ') : newResource.images = ''
            return newResource
        })
        const unparse = Papa.unparse(newResources, {
            encoding: 'utf-8'
        })
        let time = new Date()
        const formatedDate = time.getHours().toString() + ':' + time.getMinutes().toString() + ':' + time.getSeconds().toString()
        const pathFile = `${__dirname}/${time.toLocaleDateString()}.${formatedDate}.csv`
        const pathArchive = `${__dirname}/${time.toLocaleDateString()}.${formatedDate}.zip`
        fs.writeFileSync(pathFile, unparse)

        const output = fs.createWriteStream(pathArchive)
        let archive = archiver('zip', {
            zlib: { level: 9 }
        })

        output.on('close', () => {
            res.download(pathArchive, `${time.toLocaleDateString()}.${formatedDate}.zip`, null, () => {
                fs.unlinkSync(pathFile)
                fs.unlinkSync(pathArchive)
            })
        })

        archive.on('warning', (err) => {
            throw err
        })

        archive.on('error', (err) => {
            res.send({
                success: false,
                msg: 'Ошибка при архивации файла для экспорта'
            })
            throw err
        })

        archive.pipe(output)
        archive.append(fs.createReadStream(pathFile), {name: `${time.toLocaleDateString()}.${formatedDate}.csv`})
        archive.finalize()
    })


    app.post('/api/upload/:resource', upload_middleware.single('file'), async (req, res) => {
        const path = req.file.destination + req.file.path
        gm(path)
            .drawText(80, 80, "FORMETOO.RU")
            .autoOrient()
            .fontSize(80)
            .write("./watermarked.png", err => {
                if (err) console.error(err)
                fs.unlinkSync(path)
                cloudinary.uploader.upload('watermarked.png', result => {
                    if (!!result.url)
                        res.send({
                            success: true,
                            url: result.url
                        })
                    else
                        res.send({
                            success: false
                        })
                })
            })
    })

    app.get('/api/:resource', async (req, res) => {
        const resource = req.params.resource
        const resources = await resourceCollection(resource).find({}).toArray()
        const count = await resourceCollection(resource).count()
        if (!resources && !count)
            return res.send({
                success: false,
                msg: `${resource} не найдены!`
            })
        if (resource === 'orders') {
            resources.map(order => {
                let sum = 0
                order.products.forEach(product => {
                    sum = new Number(sum) + new Number(product.price)
                })
                order.sum = sum
            })
            let data = {
                success: true,
                orders: resources,
                total: count
            }
            return res.send(data)
        }
        let data = {
            success: true,
            total: count
        }
        data[resource] = resources
        return res.send(data)
    })

    app.get('/api/:resource/:id', async (req, res) => {
        const resource = req.params.resource
        const resourceItem = await resourceCollection(resource).findOne({_id: ObjectID(req.params.id)})
        if (!resourceItem)
            return res.send({
                success: false,
                msg: 'Ресурс не найден!'
            })

        if (resource === 'products') {
            const product = await resourceCollection('products').findOne({_id: ObjectID(req.params.id)})
            const attrSets = await resourceCollection('attribute-sets').find({
                slug: {
                    $in: product['attribute-sets']
                }
            }).toArray()
            let attributeSlugs = []
            attrSets.forEach(set => {
                attributeSlugs.push(...set.attributes)
            })
            const attributes = await resourceCollection('attributes').find({
                slug: {
                    $in: attributeSlugs
                }
            }).toArray()

            const tabSets = await resourceCollection('tab-sets').find({
                slug: {
                    $in: product['tab-sets']
                }
            }).toArray()
            let tabSlugs = []
            tabSets.forEach(set => {
                tabSlugs.push(...set.tabs)
            })
            const tabs = await resourceCollection('tabs').find({
                slug: {
                    $in: tabSlugs
                }
            }).toArray()

            const isContained = (obj, list) => {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].slug === obj.slug) {
                        return true;
                    }
                }
                return false;
            }

            let endData = resourceItem

            attributes.forEach(attr => {
                if (!isContained(attr, resourceItem.attributes))
                    endData.attributes.push(attr)
            })

            resourceItem.attributes.forEach((attr, index) => {
                if (!isContained(attr, attributes)) {
                    endData.attributes.splice(index, 1)
                }
            })

            tabs.forEach(tab => {
                if (!isContained(tab, resourceItem.tabs))
                    endData.tabs.push(tab)
            })

            resourceItem.tabs.forEach((tab, index) => {
                if (!isContained(tab, tabs)) {
                    endData.tabs.splice(index, 1)
                }
            })

            res.send(endData)
        } else
            return res.send(resourceItem)
    })

    app.post('/api/:resource', async (req, res) => {
        const resource = req.params.resource
        if (resource === 'users') {
            let user = req.body
            user.password = await AuthProvider.getHash(req.body.password)
            try {
                await resourceCollection(resource).insert(user)
                return res.send({
                    success: true
                })
            } catch (error) {
                return res.send({
                    success: false,
                    msg: 'Ошибка создания пользователя'
                })
            }
        }
        if (resource === 'products') {
            const user = AuthProvider.decode(req.headers.authorization).email
            const time = new Date()
            const month = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря']
            let hour = time.getHours().toString()
            let minutes = time.getMinutes().toString()
            let seconds = time.getSeconds().toString()
            if (hour < 10) {
                hour = '0' + hour
            }
            if (minutes < 10) {
                minutes = '0' + minutes
            }
            if (seconds < 10) {
                seconds = '0' + seconds
            }
            const formatedDate = `${hour}:${minutes}:${seconds}`
            try {
                await resourceCollection(resource).insert({
                    ...req.body,
                    attributes: req.body.attributes || [],
                    tabs: req.body.tabs || []
                })
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при создании продукта',
                    error: e
                })
            }
            try {
                await resourceCollection('logs').insert({
                    user: user,
                    time: `${time.getDay()} ${month[time.getMonth()]} ${formatedDate}`,
                    action: `Создал продукт: ${req.body.title}`
                })
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при создании логов',
                    error: e
                })
            }
            return res.send({
                success: true
            })
        }
        try {
            await resourceCollection(resource).insert(req.body)
            return res.send({
                success: true
            })
        } catch (err) {
            return res.send({
                success: false,
                msg: 'Ошибка создания пользователя'
            })
        }
    })

    app.post('/api/:resource/:id', async (req, res) => {
        const resource = req.params.resource
        if (resource === 'users') {
            let user = req.body
            user.password = AuthProvider.getHash(req.body.password)
            user._id = ObjectID(req.params.id)
            await resourceCollection(resource).findOneAndUpdate({_id: ObjectID(req.params.id)}, user)
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
        if (resource === 'products') {
            const user = AuthProvider.decode(req.headers.authorization).email
            const time = new Date()
            const month = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря']
            let hour = time.getHours().toString()
            let minutes = time.getMinutes().toString()
            let seconds = time.getSeconds().toString()
            if (hour < 10) {
                hour = '0' + hour
            }
            if (minutes < 10) {
                minutes = '0' + minutes
            }
            if (seconds < 10) {
                seconds = '0' + seconds
            }
            const formatedDate = `${hour}:${minutes}:${seconds}`
            try {
                await resourceCollection('logs').insert({
                    user: user,
                    time: `${time.getDay()} ${month[time.getMonth()]} ${formatedDate}`,
                    action: `Редактировал продукт: ${req.body.title}`
                })
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при создании логов',
                    error: e
                })
            }
        }
        let newResource = req.body
        newResource._id = ObjectID(newResource._id)
        await resourceCollection(resource).findOneAndUpdate({_id: ObjectID(req.params.id)}, newResource)
            .catch(() => {
                return res.send({
                    success: false,
                    msg: 'Ошибка редактирования ресурса'
                })
            })
        return res.send({
            success: true
        })
    })

    app.post('/api/:resource/:id/delete', async (req, res) => {
        const resource = req.params.resource
        const product = await resourceCollection(req.params.resource).findOne({_id: ObjectID(req.params.id)})
        if (resource === 'products') {
            const user = AuthProvider.decode(req.headers.authorization).email
            const time = new Date()
            const month = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря']
            let hour = time.getHours().toString()
            let minutes = time.getMinutes().toString()
            let seconds = time.getSeconds().toString()
            if (hour < 10) {
                hour = '0' + hour
            }
            if (minutes < 10) {
                minutes = '0' + minutes
            }
            if (seconds < 10) {
                seconds = '0' + seconds
            }
            const formatedDate = `${hour}:${minutes}:${seconds}`
            try {
                await resourceCollection('logs').insert({
                    user: user,
                    time: `${time.getDay()} ${month[time.getMonth()]} ${formatedDate}`,
                    action: `Удалил продукт: ${product.title}`
                })
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при создании логов',
                    error: e
                })
            }
        }
        await resourceCollection(req.params.resource).deleteOne({_id: ObjectID(req.params.id)})
            .catch(() => {
                return res.send({
                    success: false,
                    msg: 'Ошибка удаления ресурса'
                })
            })
        return res.send({
            success: true
        })
    })
}
