import React from 'react'
import {Tabs, Tab} from 'material-ui/Tabs'
import TextField from 'material-ui/TextField'
import RaisedButton from 'material-ui/RaisedButton'
import {
    Table,
    TableBody,
    TableHeader,
    TableHeaderColumn,
    TableRow,
    TableRowColumn,
} from 'material-ui/Table'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import DeleteIcon from 'material-ui/svg-icons/action/delete'
import DatePicker from 'material-ui/DatePicker'

import ToolBar from '@admin/containers/tool-bar'
import Data from '@admin/core/data.provider'

export default class ClientsCreate extends React.Component {
    constructor(props) {
        super(props)
        this.getRole(this.props.location)
        this.state = {
            loaded: false,
            open: false,
            data: {
                addresses: []
            }
        }
        this.handleOpen = this.handleOpen.bind(this)
        this.handleClose = this.handleClose.bind(this)
        this.addAddress = this.addAddress.bind(this)
        this.deleteAddress = this.deleteAddress.bind(this)
    }

    changeState(value, key) {
        let newState = this.state
        newState.data[key] = value
        this.setState(newState)
    }

    async getRole(uri) {
        const response = await Data.getResource(uri)
        this.setState({
            data: response,
            loaded: true
        })
    }

    handleOpen() {
        this.setState({
            open: true
        })
    }

    handleClose() {
        this.setState({
            open: false
        })
    }

    deleteAddress(id) {
        let addresses = []
        this.state.data.addresses.forEach((address, index) => {
            if (index !== id)
                addresses.push(address)
        })
        this.setState({
            data: {
                ...this.state.data,
                addresses: addresses
            }
        })
    }

    addAddress() {
        this.setState({
            data: {
                ...this.state.data,
                addresses: [
                    ...this.state.data.addresses,
                    {
                        country: this.state.country,
                        state: this.state.state,
                        city: this.state.city,
                        street: this.state.street,
                        building: this.state.building,
                        apartment: this.state.apartment
                    }
                ]
            }
        })
        this.handleClose()
    }

    render() {
        const actions = [
            <FlatButton
                label="Закрыть"
                primary={true}
                onClick={this.handleClose}
            />,
            <FlatButton
                label="Подтвердить"
                primary={true}
                onClick={this.addAddress}
            />,
        ]
        if (!this.state.loaded) {
            return false
        }
        return (
            <div>
                <Tabs>
                    <Tab label="Основное">
                        <div
                            className="resource-page">
                            <TextField
                                style={{
                                    width: '97%',
                                    marginLeft: '20px',
                                    marginTop: '20px'
                                }}
                                value={this.state.data.name}
                                hintText="Имя"
                                errorText="Поле обязательно"
                                onChange={(event, value) => this.changeState(value, 'name')}
                            />
                            <TextField
                                style={{
                                    width: '97%',
                                    marginLeft: '20px',
                                    marginTop: '20px'
                                }}
                                value={this.state.data.email}
                                hintText="Почта"
                                errorText="Поле обязательно"
                                onChange={(event, value) => this.changeState(value, 'email')}
                            />
                            <TextField
                                style={{
                                    width: '97%',
                                    marginLeft: '20px',
                                    marginTop: '20px'
                                }}
                                value={this.state.data.phone}
                                hintText="Телефон"
                                errorText="Поле обязательно"
                                onChange={(event, value) => this.changeState(value, 'phone')}
                            />
                            <TextField
                                style={{
                                    width: '97%',
                                    marginLeft: '20px',
                                    marginTop: '20px'
                                }}
                                hintText="Пароль"
                                errorText="Поле обязательно"
                                onChange={(event, value) => this.changeState(value, 'password')}
                            />
                            <DatePicker
                                style={{
                                    width: '97%',
                                    marginLeft: '20px',
                                    marginTop: '20px'
                                }}
                                floatingLabelText="Дата создания"
                                hintText="Дата создания"
                                defaultDate={new Date(this.state.data.creationDate)}
                            />
                            <DatePicker
                                style={{
                                    width: '97%',
                                    marginLeft: '20px',
                                    marginTop: '20px'
                                }}
                                floatingLabelText="Дата изменения"
                                hintText="Дата изменения"
                                defaultDate={new Date(this.state.data.modificationDate)}
                            />
                            <TextField
                                style={{
                                    width: '97%',
                                    marginLeft: '20px',
                                    marginTop: '20px'
                                }}
                                value={this.state.data.slug}
                                onChange={(event, value) => this.setState({
                                    data: {
                                        ...this.state.data,
                                        slug: value
                                    }
                                })}
                                floatingLabelText='Slug'
                                label='Slug'
                            />
                        </div>
                    </Tab>
                            <Tab label="Адреса">
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
                                                    Страна
                                                </TableHeaderColumn>
                                                <TableHeaderColumn>
                                                    Область
                                                </TableHeaderColumn>
                                                <TableHeaderColumn>
                                                    Город
                                                </TableHeaderColumn>
                                                <TableHeaderColumn>
                                                    Улица
                                                </TableHeaderColumn>
                                                <TableHeaderColumn>
                                                    Дом
                                                </TableHeaderColumn>
                                                <TableHeaderColumn>
                                                    Квартира
                                                </TableHeaderColumn>
                                                <TableHeaderColumn>
                                                </TableHeaderColumn>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody
                                            displayRowCheckbox={false}
                                        >
                                            {!!this.state.data.addresses ? this.state.data.addresses.map((address, index) => {
                                                return (
                                                    <TableRow
                                                        key={index}
                                                    >
                                                        <TableRowColumn>
                                                            {address.country}
                                                        </TableRowColumn>
                                                        <TableRowColumn>
                                                            {address.state}
                                                        </TableRowColumn>
                                                        <TableRowColumn>
                                                            {address.city}
                                                        </TableRowColumn>
                                                        <TableRowColumn>
                                                            {address.street}
                                                        </TableRowColumn>
                                                        <TableRowColumn>
                                                            {address.building}
                                                        </TableRowColumn>
                                                        <TableRowColumn>
                                                            {address.apartment}
                                                        </TableRowColumn>
                                                        <TableHeaderColumn>
                                                            <DeleteIcon
                                                                color='rgb(255, 64, 129)'
                                                                onClick={() => this.deleteAddress(index)}
                                                                style={{cursor: 'pointer'}}
                                                            />
                                                        </TableHeaderColumn>
                                                    </TableRow>
                                                )
                                            }): null}
                                        </TableBody>
                                    </Table>
                                    <RaisedButton
                                        label="Добавить"
                                        style={{margin: '38px'}}
                                        onClick={this.handleOpen}
                                    />
                                    <Dialog
                                        title="Создание нового адреса"
                                        actions={actions}
                                        modal={true}
                                        open={this.state.open}
                                        autoScrollBodyContent={true}
                                    >
                                        <TextField
                                            style={{
                                                width: '97%',
                                                marginLeft: '20px',
                                                marginTop: '20px'
                                            }}
                                            floatingLabelText="Страна"
                                            value={this.state.country}
                                            errorText='Обязательное поле'
                                            onChange={(event, value) => this.setState({
                                                country: value,
                                            })}/>
                                        <TextField
                                            style={{
                                                width: '97%',
                                                marginLeft: '20px',
                                                marginTop: '20px'
                                            }}
                                            floatingLabelText="Область"
                                            value={this.state.state}
                                            errorText='Обязательное поле'
                                            onChange={(event, value) => this.setState({
                                                state: value,
                                            })}/>
                                        <TextField
                                            style={{
                                                width: '97%',
                                                marginLeft: '20px',
                                                marginTop: '20px'
                                            }}
                                            floatingLabelText="Город"
                                            value={this.state.city}
                                            errorText='Обязательное поле'
                                            onChange={(event, value) => this.setState({
                                                city: value,
                                            })}/>
                                        <TextField
                                            style={{
                                                width: '97%',
                                                marginLeft: '20px',
                                                marginTop: '20px'
                                            }}
                                            floatingLabelText="Улица"
                                            value={this.state.street}
                                            errorText='Обязательное поле'
                                            onChange={(event, value) => this.setState({
                                                street: value,
                                            })}/>
                                        <TextField
                                            style={{
                                                width: '97%',
                                                marginLeft: '20px',
                                                marginTop: '20px'
                                            }}
                                            floatingLabelText="Дом"
                                            value={this.state.building}
                                            errorText='Обязательное поле'
                                            onChange={(event, value) => this.setState({
                                                building: value,
                                            })}/>
                                        <TextField
                                            style={{
                                                width: '97%',
                                                marginLeft: '20px',
                                                marginTop: '20px'
                                            }}
                                            floatingLabelText="Квартира"
                                            value={this.state.apartment}
                                            onChange={(event, value) => this.setState({
                                                apartment: value,
                                            })}/>
                                    </Dialog>
                                </div>
                            </Tab>
                        )
                </Tabs>
                <ToolBar
                    resources='clients'
                    data={this.state.data}
                    action='edit'
                />
            </div>
        )
    }
}