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
            const attributesData = attributes.map(attribute => {
                return {
                    slug: attribute.slug,
                    title: attribute.title,
                    attrType: attribute.attrType,
                    variants: attribute.variants
                }
            })

            res.send(attributesData)
        }
        if (req.params.resource === 'tabs') {
            const tabSets = await resourceCollection('tab-sets').find({
                slug: {
                    $in: req.body
                }
            }).toArray()
            let tabSlugs = []
            tabSets.forEach(set => {
                tabSlugs.push(...set.tabs)
            })
            const tabsData = attributes.map(tab => {
                return {
                    slug: tab.slug,
                    title: tab.title
                }
            })

            res.send(tabsData)
        }
    })

    app.post('/api/export/:resource', upload_middleware.single('file'), (req, res) => {
        fs.readFile(req.file.path, {encoding: 'utf-8'}, async (err, data) => {
            if (err) throw err
            fs.unlinkSync(req.file.path)
            const parsed = Papa.parse(data, {
                delimiter: ';',
                encoding: 'utf-8',
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
                !!item.categories ? item.categories = item.categories.split(' ') : item.categories = []
                !!item['tab-sets'] ? item['tab-sets'] = item['tab-sets'].split(' ') : item['tab-sets'] = []
                !!item['attribute-sets'] ? item['attribute-sets'] = item['attribute-sets'].split(' ') : item['attribute-sets'] = []
                !!item.images ? item.images = item.images.split(' ') : item.images = []
                !!item.relatedProducts ? item.relatedProducts = item.relatedProducts.split(' ') : item.relatedProducts = []
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
                seo_keywords: resource.seo.keywords.join(' ')
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
            !!newResource.categories ? newResource.categories = newResource.categories.join(' ') : newResource.categories = ''
            !!newResource['attribute-sets'] ? newResource['attribute-sets'] = newResource['attribute-sets'].join(' ') : newResource['attribute-sets'] = ''
            !!newResource['tab-sets'] ? newResource['tab-sets'] = newResource['tab-sets'].join(' ') : newResource['tab-sets'] = ''
            !!newResource.fromSet ? newResource.fromSet = newResource.fromSet.join(' ') : newResource.fromSet = ''
            !!newResource.relatedProducts ? newResource.relatedProducts = newResource.relatedProducts.join(' ') : newResource.relatedProducts = ''
            !!newResource.images ? newResource.images = newResource.images.join(' ') : newResource.images = ''
            newResource.creationDate = new Date(newResource.creationDate).toLocaleString()
            newResource.modificationDate = new Date(newResource.creationDate).toLocaleString()
            return newResource
        })
        const unparse = Papa.unparse(newResources, {
            delimiter: ';',
            encoding: 'utf-8',
            header: true
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
            resources.forEach(order => {
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
        if (resource === 'users' || resource === 'client') {
            resources.forEach(account => {
                delete account.password
            })
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
        if (!resourceItem) {
            return res.send({
                success: false,
                msg: 'Ресурс не найден!'
            })
        }
        if (resource === 'users' || resource === 'client') {
            delete resourceItem.password
        }
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

    app.get('/api/logs/:id/changes', async (req, res) => {
        const id = req.params.id
        const log = await resourceCollection('logs').findOne({_id: ObjectID(id)})
        const before = log.before
        const after = log.after
        delete after._id
        delete before._id
        let translateKeys = {
            isActive: 'Активный',
            title: 'Заголовок',
            description: 'Описание',
            shortDescription: 'Краткое описание',
            sku: 'Артикул',
            price: 'Цена',
            categories: 'Категории',
            'attribute-sets': 'Набор атрибутов',
            'tab-sets': 'Набор табов',
            relatedProducts: 'Похожие продукты',
            images: 'Изображения',
            fromSet: 'Из набора',
            seo: {
                title: 'СЕО заголовок',
                description: 'СЕО описание',
                keywords: 'СЕО ключевые слова'
            },
            modificationDate: 'Дата изменения'
        }

        // МЕТОД СРАВНЕНИЯ ДВУХ ОБЪЕКТОВ
        Object.prototype.equals = function(object2) {
            for (propName in this) {
                if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                    return false;
                }
                else if (typeof this[propName] != typeof object2[propName]) {
                    return false;
                }
            }
            for(propName in object2) {
                if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                    return false
                }
                else if (typeof this[propName] != typeof object2[propName]) {
                    return false
                }
                if(!this.hasOwnProperty(propName))
                    continue
                if (this[propName] instanceof Array && object2[propName] instanceof Array) {
                    if (!this[propName].equals(object2[propName]))
                        return false;
                }
                else if (this[propName] instanceof Object && object2[propName] instanceof Object) {
                    if (!this[propName].equals(object2[propName]))
                        return false;
                }
                else if(this[propName] != object2[propName]) {
                    return false;
                }
            }
            return true;
        }

        // МЕТОД СРАВНЕНИЯ ДВУХ МАССИВОВ
        Array.prototype.equals = function (array) {
            if (!array)
                return false
            if (this.length != array.length)
                return false
            for (var i = 0, l=this.length; i < l; i++) {
                if (this[i] instanceof Array && array[i] instanceof Array) {
                    if (!this[i].equals(array[i]))
                        return false
                }
                else if (this[i] instanceof Object && array[i] instanceof Object) {
                    if (!this[i].equals(array[i]))
                        return false
                }
                else if (this[i] != array[i]) {
                    return false
                }
            }
            return true
        }
        Object.defineProperty(Array.prototype, "equals", {enumerable: false})

        let changes = []

        delete after.attributes
        delete after.tabs
        delete before.attributes
        delete before.tabs

        Object.keys(after).forEach(key => {
            if (before[key] !== after[key]) {
                if (typeof before[key] === 'boolean' && typeof after[key] === 'boolean') {
                    changes.push({
                        title: translateKeys[key],
                        before: before[key] === true ? 'Да' : 'Нет',
                        after: after[key] === true ? 'Да' : 'Нет'
                    })
                    return
                }
                if (before[key] instanceof Array && after[key] instanceof Array) {
                    if (!before[key].equals(after[key])) {
                        changes.push({
                            title: translateKeys[key],
                            before: before[key] instanceof Array ? before[key].join(', ') : before[key],
                            after: after[key] instanceof Array ? after[key].join(', ') : after[key]
                        })
                    }
                    return
                }
                if (before[key] instanceof Object && after[key] instanceof Object) {
                    if (!before[key].equals(after[key])) {
                        Object.keys(before[key]).forEach(beforeKey => {
                            if (before[key][beforeKey] !== after[key][beforeKey]) {
                                changes.push({
                                    title: translateKeys[key][beforeKey],
                                    before: before[key][beforeKey] instanceof Array ? before[key][beforeKey].join(', ') : before[key][beforeKey],
                                    after: after[key][beforeKey] instanceof Array ? after[key][beforeKey].join(', ') : after[key][beforeKey]
                                })
                            }
                        })
                    }
                    return
                }
                changes.push({
                    title: translateKeys[key],
                    before: before[key],
                    after: after[key]
                })
            }
        })

        res.send(changes)
    })

    app.post('/api/:resource', async (req, res) => {
        const resource = req.params.resource
        let resourceItem = req.body
        if (resource === 'users') {
            let user = resourceItem
            user.email = user.email.toLowerCase()
            user.password = await AuthProvider.getHash(resourceItem.password)
            try {
                await resourceCollection(resource).insert(user)
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
                    ...resourceItem,
                    attributes: resourceItem.attributes || [],
                    tabs: resourceItem.tabs || []
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
                    action: `Создал продукт: ${resourceItem.title}`
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
            await resourceCollection(resource).insert(resourceItem)
        } catch (err) {
            return res.send({
                success: false,
                msg: 'Ошибка создания пользователя'
            })
        }
        res.send({
            success: true
        })
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
        let newResource = req.body
        newResource._id = ObjectID(newResource._id)
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
            const beforeChange = await resourceCollection(resource).findOne({_id: ObjectID(req.params.id)})
            try {
                await resourceCollection(resource).findOneAndUpdate({_id: ObjectID(req.params.id)}, newResource)
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при редактировании продуктов',
                    error: e
                })
            }
            const afterChange = await resourceCollection(resource).findOne({_id: ObjectID(req.params.id)})
            try {
                await resourceCollection('logs').insert({
                    user: user,
                    time: `${time.getDay()} ${month[time.getMonth()]} ${formatedDate}`,
                    action: `Редактировал продукт: ${req.body.title}`,
                    before: beforeChange,
                    after: afterChange,
                    actionType: 'edit'
                })
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при создании логов',
                    error: e
                })
            }
        }
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
