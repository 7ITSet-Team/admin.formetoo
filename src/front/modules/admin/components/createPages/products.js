import React from 'react'
import {Tabs, Tab} from 'material-ui/Tabs'
import TextField from 'material-ui/TextField'
import Toggle from 'material-ui/Toggle'
import {
    Table,
    TableBody,
    TableHeader,
    TableHeaderColumn,
    TableRow,
    TableRowColumn,
} from 'material-ui/Table'
import DeleteIcon from 'material-ui/svg-icons/action/delete'
import SelectField from 'material-ui/SelectField'
import ListIcon from 'material-ui/svg-icons/action/list'
import MenuItem from 'material-ui/MenuItem'
import FlatButton from 'material-ui/FlatButton'
import {Link} from 'react-router-dom'
import uid from 'uid'
import { Editor } from 'react-draft-wysiwyg'
import { EditorState, convertToRaw } from 'draft-js'
import draftToHtml from 'draftjs-to-html'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'

import Data from '@admin/core/data.provider'
import ToolBar from '@admin/containers/tool-bar'

export default class ProductsCreate extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            data: {
                isActive: false,
                relatedProducts: [],
                images: [],
                categories: [],
                'attribute-sets': [],
                'tab-sets': [],
                slug: uid(16)
            },
            descState: EditorState.createEmpty(),
            shortDescState: EditorState.createEmpty(),
            products: []
        }
        this.getResource('/products')
        this.getResource('/categories')
        this.getResource('/attribute-sets')
        this.getResource('/tab-sets')
        this.changeRelatedProducts = this.changeRelatedProducts.bind(this)
        this.uploadFile = this.uploadFile.bind(this)
        this.changeCategories = this.changeCategories.bind(this)
        this.changeAttributeSets = this.changeAttributeSets.bind(this)
        this.changeTabSets = this.changeTabSets.bind(this)
        this.onEditorDescChange = this.onEditorDescChange.bind(this)
        this.onEditorShortDescChange = this.onEditorShortDescChange.bind(this)
    }

    changeState(value, key) {
        let newState = this.state
        newState.data[key] = value
        this.setState(newState)
    }

    changeRelatedProducts(event, index, value) {
        this.state.products.forEach((product) => {
            if (product.slug === value) {
                this.changeState([
                    ...this.state.data.relatedProducts,
                    product
                ], 'relatedProducts')
            }
        })
    }

    deleteRelatedProduct(id) {
        let relatedProducts = []
        this.state.data.relatedProducts.map(relatedProduct => {
            if (relatedProduct.slug !== id) {
                relatedProducts.push(relatedProduct)
            }
        })
        this.changeState(
            relatedProducts,
            'relatedProducts'
        )
    }

    async uploadFile(file) {
        const result = await Data.uploadImage(file.target.files[0])
        this.setState({
            data: {
                ...this.state.data,
                images: [
                    ...this.state.data.images,
                    result.url
                ]
            }
        })
    }

    async getResource(uri) {
        const resource = uri.slice(1)
        const response = await Data.getData(uri)
        let newState = {}
        newState[resource] = response.data
        this.setState(newState)
    }

    changeCategories(event, index, value) {
        this.setState({
            data: {
                ...this.state.data,
                categories: [
                    ...this.state.data.categories,
                    ...value
                ]
            }
        })
    }

    changeAttributeSets(event, index, value) {
        this.setState({
            data: {
                ...this.state.data,
                'attribute-sets': [
                    ...this.state.data['attribute-sets'],
                    ...value
                ]
            }
        })
    }

    changeTabSets(event, index, value) {
        this.setState({
            data: {
                ...this.state.data,
                'tab-sets': [
                    ...this.state.data['tab-sets'],
                    ...value
                ]
            }
        })
    }

    onEditorDescChange(descState) {
        this.setState({
            descState,
        })
    }

    onEditorShortDescChange(shortDescState) {
        this.setState({
            shortDescState,
        })
    }

    render() {
        if (!this.state.categories || !this.state.products || !this.state['attribute-sets'] || !this.state['tab-sets'])
            return false
        console.log(this.state.data)
        return (
            <div>
                <Tabs>
                    <Tab label="Основное">
                        <div
                            className="big-resource">
                            <Link
                                className="resource-actions"
                                to="/products"
                            >
                                <FlatButton
                                    label="Назад к списку"
                                    primary={true}
                                    icon={<ListIcon/>}
                                />
                            </Link>
                            <Toggle
                                style={{
                                    width: '150px',
                                    marginLeft: '20px'
                                }}
                                label="Активный"
                                onToggle={(event, value) => this.changeState(value, 'isActive')}
                            />
                            <TextField
                                fullWidth={true}
                                hintText="Заголовок"
                                errorText="Поле обязательно"
                                onChange={(event, value) => this.changeState(value, 'title')}
                            />
                            <div
                                style={{
                                    color: 'rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                Описание
                            </div>
                            <Editor
                                editorState={this.state.descState}
                                wrapperClassName="demo-wrapper"
                                editorClassName="demo-editor"
                                onEditorStateChange={this.onEditorDescChange}
                                onChange={() => this.setState({
                                    data: {
                                        ...this.state.data,
                                        description: draftToHtml(convertToRaw(this.state.descState.getCurrentContent()))
                                    }
                                })}
                            />
                            <div
                                style={{
                                    color: 'rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                Краткое описание
                            </div>
                            <Editor
                                editorState={this.state.shortDescState}
                                wrapperClassName="demo-wrapper"
                                editorClassName="demo-editor"
                                onEditorStateChange={this.onEditorShortDescChange}
                                onChange={() => this.setState({
                                    data: {
                                        ...this.state.data,
                                        shortDescription: draftToHtml(convertToRaw(this.state.shortDescState.getCurrentContent()))
                                    }
                                })}
                            />
                            <TextField
                                fullWidth={true}
                                hintText="Артикул"
                                errorText="Поле обязательно"
                                onChange={(event, value) => this.changeState(value, 'sku')}
                            />
                            <TextField
                                fullWidth={true}
                                hintText="Цена"
                                errorText="Поле обязательно"
                                onChange={(event, value) => this.changeState(value, 'price')}
                            />
                            <SelectField
                                fullWidth={true}
                                multiple={true}
                                value={this.state.data.categories}
                                floatingLabelText="Категории"
                                onChange={this.changeCategories}
                            >
                                {this.state.categories.map((category, index) => {
                                    return <MenuItem
                                        value={category.slug}
                                        primaryText={category.title}
                                        key={index}
                                    />
                                })}
                            </SelectField>
                            <input
                                type="file"
                                className="inputfile"
                                id="file"
                                onChange={this.uploadFile}
                            />
                            <label
                                htmlFor="file"
                                className="inputfile__label"
                            >
                                Перенесите сюда файл или нажмите, чтобы выбрать изображение
                            </label>
                            <div
                                className="inputfile__images"
                            >
                                {this.state.data.images.map((image, index) => {
                                    return (
                                        <img
                                            className="inputfile__image"
                                            src={image}
                                            key={index}
                                        />
                                    )
                                })}
                            </div>
                            <SelectField
                                fullWidth={true}
                                multiple={true}
                                value={this.state.data['attribute-sets']}
                                floatingLabelText="Наборы атрибутов"
                                onChange={this.changeAttributeSets}
                            >
                                {this.state['attribute-sets'].map((attribute, index) => {
                                    return <MenuItem
                                        value={attribute.slug}
                                        primaryText={attribute.title}
                                        key={index}
                                    />
                                })}
                            </SelectField>
                            <SelectField
                                fullWidth={true}
                                multiple={true}
                                value={this.state.data['tab-sets']}
                                floatingLabelText="Наборы табов"
                                onChange={this.changeTabSets}
                            >
                                {this.state['tab-sets'].map((set, index) => {
                                    return <MenuItem
                                        value={set.slug}
                                        primaryText={set.title}
                                        key={index}
                                    />
                                })}
                            </SelectField>
                        </div>
                    </Tab>
                    <Tab label="SEO">
                        <div
                            className="resource-page">
                            <TextField
                                fullWidth={true}
                                hintText="SEO заголовок"
                                onChange={(event, value) => this.changeState({
                                    ...this.state.data.seo,
                                    title: value
                                }, 'seo')}
                            />
                            <TextField
                                fullWidth={true}
                                hintText="SEO описание"
                                onChange={(event, value) => this.changeState({
                                    ...this.state.data.seo,
                                    description: value
                                }, 'seo')}
                            />
                            <TextField
                                fullWidth={true}
                                hintText="SEO ключевые слова"
                                onChange={(event, value) => this.changeState({
                                    ...this.state.data.seo,
                                    keywords: value
                                }, 'seo')}
                            />
                        </div>
                    </Tab>
                    <Tab label="Похожие продукты">
                        <div
                            className="resource-page">
                            <Table
                                selectable={false}
                            >
                                <TableHeader
                                    displaySelectAll={false}
                                    adjustForCheckbox={false}
                                >
                                    <TableRow>
                                        <TableHeaderColumn>
                                            Артикул
                                        </TableHeaderColumn>
                                        <TableHeaderColumn>
                                            Наименование
                                        </TableHeaderColumn>
                                        <TableHeaderColumn>
                                            Цена
                                        </TableHeaderColumn>
                                        <TableHeaderColumn>
                                        </TableHeaderColumn>
                                    </TableRow>
                                </TableHeader>
                                <TableBody
                                    displayRowCheckbox={false}
                                >
                                    {this.state.data.relatedProducts.map((product, index) => {
                                        return (
                                            <TableRow
                                                key={index}
                                            >
                                                <TableRowColumn>
                                                    {product.sku}
                                                </TableRowColumn>
                                                <TableRowColumn>
                                                    {product.title}
                                                </TableRowColumn>
                                                <TableRowColumn>
                                                    {product.price}
                                                </TableRowColumn>
                                                <TableHeaderColumn>
                                                    <DeleteIcon
                                                        color='rgb(255, 64, 129)'
                                                        onClick={() => this.deleteRelatedProduct(product.slug)}
                                                        style={{cursor: 'pointer'}}
                                                    />
                                                </TableHeaderColumn>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            <SelectField
                                fullWidth={true}
                                value={this.state.data.relatedProducts}
                                floatingLabelText="Похожий продукт"
                                onChange={this.changeRelatedProducts}
                            >
                                {this.state.products.map((product, index) => {
                                    return <MenuItem
                                        value={product.slug}
                                        primaryText={product.title}
                                        key={index}
                                    />
                                })}
                            </SelectField>
                        </div>
                    </Tab>
                </Tabs>
                <ToolBar
                    resources='products'
                    data={this.state.data}
                    action='create'
                />
            </div>
        )
    }
}
