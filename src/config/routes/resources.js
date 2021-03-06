require('isomorphic-fetch')
const ObjectID = require('mongodb').ObjectID
const multer = require('multer')
const fs = require('fs')
const cloudinary = require('cloudinary')
const Papa = require('papaparse')
const archiver = require('archiver')
const Dropbox = require('dropbox').Dropbox
const exec = require('child_process').exec
const unzip = require('unzip')
const rimraf = require('rimraf')

const AuthProvider = require('../../core/auth.provider')
const DataProvider = require('../../core/data.provider')

const dbx = new Dropbox({accessToken: 'AUQh6jPO0UAAAAAAAAAADVeEVI3HwyqIWLz3nqwwsc4DvJwZzZ-DsIbVjGTmEgYZ'})
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
                    name: attribute.name,
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
            const tabs = await resourceCollection('tabs').find({
                slug: {
                    $in: tabSlugs
                }
            }).toArray()
            const tabsData = tabs.map(tab => {
                return {
                    slug: tab.slug,
                    title: tab.title,
                    name: tab.name,
                    tabType: tab.tabType,
                    variants: tab.variants
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
                delimiter: ',',
                header: true
            })
            const output = parsed.data
            output.forEach(item => {
                item.seo = {
                    title: !item.seo_title ? '' : item.seo_title,
                    description: !item.seo_description ? '' : item.seo_description,
                    keywords: !item.seo_keywords ? [] : item.seo_keywords.split(/, ?/)
                }
                if (item.isActive === 'TRUE' || item.isActive === 'true')
                    item.isActive = true
                else
                    item.isActive = false
                delete item.seo_title
                delete item.seo_description
                delete item.seo_keywords
                !!item.categories ? item.categories = item.categories.split(/, ?/) : item.categories = []
                !!item['tab-sets'] ? item['tab-sets'] = item['tab-sets'].split(/, ?/) : item['tab-sets'] = []
                !!item['attribute-sets'] ? item['attribute-sets'] = item['attribute-sets'].split(/, ?/) : item['attribute-sets'] = []
                !!item.images ? item.images = item.images.split(/, ?/) : item.images = []
                !!item.relatedProducts ? item.relatedProducts = item.relatedProducts.split(/, ?/) : item.relatedProducts = []
                !!item.fromSet ? item.fromSet = item.fromSet.split(/, ?/) : item.fromSet = []
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
                seo_keywords: resource.seo.keywords.join(', ')
            }
            resource.attributes.forEach(attribute => {
                if (attribute.attrType === 'multipleSelect' && !!attribute.value) {
                    newResource[attribute.name] = attribute.value.join(', ')
                    return true
                }
                if (attribute.attrType === 'interval' && !!attribute.value) {
                    newResource[attribute.name + '_from'] = attribute.value.from
                    newResource[attribute.name + '_to'] = attribute.value.to
                    return true
                }
                newResource[attribute.name] = attribute.value
            })
            resource.tabs.forEach(tab => {
                if (tab.tabType === 'multipleSelect' && !!tab.value) {
                    newResource[tab.name] = tab.value.join(', ')
                    return true
                }
                if (tab.tabType === 'interval' && !!tab.value) {
                    newResource[tab.name + '_from'] = tab.value.from
                    newResource[tab.name + '_to'] = tab.value.to
                    return true
                }
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
            newResource.creationDate = newResource.creationDate.toLocaleString()
            newResource.modificationDate = newResource.creationDate.toLocaleString()
            return newResource
        })
        const unparse = Papa.unparse(newResources, {
            delimiter: ','
        })
        let time = new Date()
        const formatedDate = time.getHours().toString() + ':' + time.getMinutes().toString() + ':' + time.getSeconds().toString()
        const pathFile = `${__dirname}/${time.toLocaleDateString()}.${formatedDate}.csv`
        const pathArchive = `${__dirname}/${time.toLocaleDateString()}.${formatedDate}.zip`
        fs.writeFileSync(pathFile, unparse)

        const output = fs.createWriteStream(pathArchive)
        let archive = archiver('zip', {
            zlib: {level: 9}
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

    app.post('/api/upload', upload_middleware.single('file'), async (req, res) => {
        fs.readFile(req.file.path, {encoding: 'utf-8'}, async (err, data) => {
            if (err) throw err
            fs.unlinkSync(req.file.path)
            try {
                await dbx.filesUpload({path: '/' + req.file.filename + req.file.originalname, contents: data})
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при загрузке файла',
                    error: e
                })
            }
            try {
                const fileInfo = await dbx.sharingCreateSharedLinkWithSettings({path: '/' + req.file.filename + req.file.originalname})
                res.send({
                    success: true,
                    filename: req.file.filename + req.file.originalname,
                    originalFileName: req.file.originalname
                })
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при получении ссылки на файл',
                    error: e
                })
            }
        })
    })

    app.post('/api/upload/:resource', upload_middleware.single('file'), async (req, res) => {
        const path = req.file.destination + req.file.path
        const {addWaterMark, rotation} = req.body
        if (addWaterMark === 'true') {
            const command = [
                'convert -size 140x80 xc:none -fill gray \\\n',
                '          -gravity NorthWest -draw "text 10,10 \'FORMETOO.RU\'" \\\n',
                '          -gravity SouthEast -draw "text 5,15 \'FORMETOO.RU\'" \\\n',
                '       +distort SRT ',
                rotation || 0,
                ' \\\n',
                '          miff:- |\\\n',
                '    composite -tile - ',
                path,
                '  watermarked.jpg'
            ]
            exec(command.join(' '), (err, stdout, stderr) => {
                if (err) throw err
                cloudinary.uploader.upload('watermarked.jpg', result => {
                    if (!!result.url) {
                        res.send({
                            success: true,
                            url: result.url
                        })
                    } else {
                        res.send({
                            success: false
                        })
                    }
                    fs.unlinkSync(path)
                    fs.unlinkSync('watermarked.jpg')
                })
            })
        } else {
            cloudinary.uploader.upload(path, result => {
                if (!!result.url) {
                    res.send({
                        success: true,
                        url: result.url
                    })
                } else {
                    res.send({
                        success: false
                    })
                }
                fs.unlinkSync(path)
            })
        }
    })

    app.post('/api/upload/3d/:resource', upload_middleware.single('file'), async (req, res) => {
        const {addWaterMark, rotation} = req.body
        if (req.file.mimetype === 'application/zip') {
            const archive = req.file
            const archivePath = archive.destination + archive.path
            fs.createReadStream(archivePath).pipe(unzip.Extract({path: archivePath + 'Extract'}))
                .on('close', () => {
                    fs.unlink(archivePath, err => {
                        if (err) throw err
                    })
                    fs.readdir(archivePath + 'Extract', (err, files) => {
                        if (err) throw err
                        let allPromises = files.map(file => {
                            return new Promise(resolve => {
                                if (addWaterMark === 'true') {
                                    const command = [
                                        'convert -size 140x80 xc:none -fill gray \\\n',
                                        '          -gravity NorthWest -draw "text 10,10 \'FORMETOO.RU\'" \\\n',
                                        '          -gravity SouthEast -draw "text 5,15 \'FORMETOO.RU\'" \\\n',
                                        '       +distort SRT ',
                                        rotation || 0,
                                        ' \\\n',
                                        '          miff:- |\\\n',
                                        '    composite -tile - ',
                                        archivePath + 'Extract' + '/' + file,
                                        '    ' + archivePath + 'Extract' + '/' + file + '-watermarked.jpg'
                                    ]
                                    exec(command.join(' '), err => {
                                        if (err) throw err
                                        cloudinary.v2.uploader.upload(archivePath + 'Extract' + '/' + file + '-watermarked.jpg', {}, (err, result) => {
                                            if (!!result) {
                                                return resolve(result.url)
                                            }
                                        })
                                    })
                                } else {
                                    cloudinary.v2.uploader.upload(archivePath + 'Extract' + '/' + file, {}, (err, result) => {
                                        if (!!result) {
                                            return resolve(result.url)
                                        }
                                    })
                                }
                            })
                        })
                        Promise.all(allPromises)
                            .then(value => {
                                rimraf(archivePath + 'Extract/', () => {
                                })
                                res.send({
                                    success: true,
                                    urls: value
                                })
                            })
                    })
                })
        } else {
            const path = req.file.destination + req.file.path
            if (addWaterMark === 'true') {
                const command = [
                    'convert -size 140x80 xc:none -fill gray \\\n',
                    '          -gravity NorthWest -draw "text 10,10 \'FORMETOO.RU\'" \\\n',
                    '          -gravity SouthEast -draw "text 5,15 \'FORMETOO.RU\'" \\\n',
                    '       +distort SRT ',
                    rotation || 0,
                    ' \\\n',
                    '          miff:- |\\\n',
                    '    composite -tile - ',
                    path,
                    '  watermarked.jpg'
                ]
                exec(command.join(' '), (err, stdout, stderr) => {
                    if (err) throw err
                    cloudinary.v2.uploader.upload('watermarked.jpg', {}, (err, result) => {
                        if (!!result.url) {
                            res.send({
                                success: true,
                                url: result.url
                            })
                        } else {
                            res.send({
                                success: false
                            })
                        }
                        fs.unlinkSync(path)
                        fs.unlinkSync('watermarked.jpg')
                    })
                })
            } else {
                cloudinary.v2.uploader.upload(path, (err, result) => {
                    if (!!result.url) {
                        res.send({
                            success: true,
                            url: result.url
                        })
                    } else {
                        res.send({
                            success: false
                        })
                    }
                    fs.unlinkSync(path)
                })
            }
        }
    })

    app.post('/api/legalentity', async (req, res) => {
        const legalentity = await resourceCollection('legalentity').find().toArray()
        let newLegalentity = req.body
        delete newLegalentity._id
        if (legalentity.length !== 0) {
            try {
                resourceCollection('legalentity').remove({})
                await resourceCollection('legalentity').insert({...newLegalentity})
                res.send({
                    success: true
                })
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при изменении юридического лица',
                    error: e
                })
            }
        } else {
            try {
                await resourceCollection('legalentity').insert({...req.body})
                res.send({
                    success: true
                })
            } catch (e) {
                return res.send({
                    success: false,
                    msg: 'Ошибка при создании юридического лица',
                    error: e
                })
            }
        }
    })

    app.get('/api/:resource', async (req, res) => {
        const resource = req.params.resource
        if (resource === 'tree') {
            const categories = await resourceCollection('categories').find({}).toArray()
            const products = await resourceCollection('products').find({}).toArray()
            let tree = []
            let productsCategory = []
            categories.forEach(category => {
                productsCategory = []
                products.forEach(product => {
                    if (product.categories.indexOf(category.slug) !== -1) {
                        productsCategory.push(product)
                    }
                })
                tree.push({
                    ...category,
                    products: productsCategory
                })
            })
            return res.send({
                success: true,
                tree: tree
            })
        }
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
        Object.prototype.equals = function (object2) {
            for (propName in this) {
                if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                    return false;
                }
                else if (typeof this[propName] != typeof object2[propName]) {
                    return false;
                }
            }
            for (propName in object2) {
                if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                    return false
                }
                else if (typeof this[propName] != typeof object2[propName]) {
                    return false
                }
                if (!this.hasOwnProperty(propName))
                    continue
                if (this[propName] instanceof Array && object2[propName] instanceof Array) {
                    if (!this[propName].equals(object2[propName]))
                        return false;
                }
                else if (this[propName] instanceof Object && object2[propName] instanceof Object) {
                    if (!this[propName].equals(object2[propName]))
                        return false;
                }
                else if (this[propName] != object2[propName]) {
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
            for (var i = 0, l = this.length; i < l; i++) {
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
        if (resource === 'categories') {
            if (!resourceItem.parentCategory) {
                let maxLeft_key = -1
                let maxRight_key = 0
                const categories = await resourceCollection(resource).find({}).toArray()
                categories.forEach(item => {
                    if (item.left_key > maxLeft_key) {
                        maxLeft_key = item.left_key
                    }
                    if (item.right_key > maxRight_key) {
                        maxRight_key = item.right_key
                    }
                })
                await resourceCollection(resource).insert({
                    ...resourceItem,
                    left_key: maxLeft_key + 2,
                    right_key: maxRight_key + 2,
                    level: 1
                })
                return res.send({
                    success: true
                })
            } else {
                const {left_key, right_key, level} = await resourceCollection('categories').findOne({slug: resourceItem.parentCategory})
                const categories = await resourceCollection('categories').find({}).toArray()
                categories.forEach(async category => {
                    if (category.left_key > right_key) {
                        await resourceCollection(resource).update({_id: ObjectID(category._id)}, {
                            $set: {
                                left_key: category.left_key + 2,
                                right_key: category.right_key + 2
                            }
                        })
                    }
                    if (category.right_key >= right_key && category.left_key < right_key) {
                        await resourceCollection(resource).update({_id: ObjectID(category._id)}, {
                            $set: {
                                right_key: category.right_key + 2
                            }
                        })
                    }
                })
                try {
                    await resourceCollection(resource).insert({
                        ...resourceItem,
                        left_key: right_key,
                        right_key: right_key + 1,
                        level: level + 1
                    })
                } catch (err) {
                    return res.send({
                        success: false,
                        msg: 'Ошибка создания категории'
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
                    msg: 'Ошибка создания категории'
                })
            }
            res.send({
                success: true
            })
            return
        }
        try {
            await resourceCollection(resource).insert(resourceItem)
        } catch (err) {
            return res.send({
                success: false,
                msg: 'Ошибка создания ресурса'
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
            user.password = await AuthProvider.getHash(req.body.password)
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
        if (resource === 'categories') {
            const {left_key, right_key} = await resourceCollection(req.params.resource).findOne({_id: ObjectID(req.params.id)})
            const categories = await resourceCollection(req.params.resource).find({}).toArray()
            categories.forEach(async category => {
                if (category.left_key >= left_key && category.right_key <= right_key) {
                    await resourceCollection(req.params.resource).deleteOne({_id: ObjectID(category._id)})
                }
                if (category.right_key > right_key && category.left_key < left_key) {
                    await resourceCollection(req.params.resource).update({_id: ObjectID(category._id)}, {
                        $set: {
                            right_key: category.right_key - (right_key - left_key + 1)
                        }
                    })
                }
                if (category.left_key > right_key) {
                    await resourceCollection(req.params.resource).update({_id: ObjectID(category._id)}, {
                        $set: {
                            left_key: category.left_key - (right_key - left_key + 1),
                            right_key: category.right_key - (right_key - left_key + 1)
                        }
                    })
                }
            })
            return res.send({
                success: true
            })
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
