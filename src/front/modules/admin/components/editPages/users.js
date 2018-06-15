import React from 'react'
import {Tabs, Tab} from 'material-ui/Tabs'
import TextField from 'material-ui/TextField'
import SelectField from 'material-ui/SelectField'
import MenuItem from 'material-ui/MenuItem'
import DatePicker from 'material-ui/DatePicker'

import Data from '@admin/core/data.provider'
import ToolBar from '@admin/containers/tool-bar'
import Hash from '@admin/core/hash.provider'

export default class UsersEdit extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            roles: [],
            data: {
                name: '',
                email: '',
                password: '',
                role: '',
                slug: '',
                creationDate: new Date(),
                modificationDate: new Date()
            }
        }
        this.getData(this.props.location)
        this.getRoles()
    }

    async getData(uri) {
        const response = await Data.getResource(uri)
        this.setState({
            data: response
        })
    }

    async getRoles() {
        const response = await Data.getData('/roles')
        this.setState({
            roles: response.data
        })
    }

    render() {
        return (
            <div>
                <Tabs>
                    <Tab label="Основное">
                        <div
                            className="resource-page">
                            <TextField
                                fullWidth={true}
                                hintText="Имя"
                                value={this.state.data.name}
                                onChange={(event, value) => this.setState({
                                    data: {
                                        ...this.state.data,
                                        name: value
                                    }
                                })}
                                errorText="Поле обязательно"
                            />
                            <TextField
                                fullWidth={true}
                                hintText="Почта"
                                value={this.state.data.email}
                                onChange={(event, value) => this.setState({
                                    data: {
                                        ...this.state.data,
                                        email: value
                                    }
                                })}
                                errorText="Поле обязательно"
                            />
                            <TextField
                                fullWidth={true}
                                hintText="Пароль"
                                onChange={(event, value) => this.setState({
                                    data: {
                                        ...this.state.data,
                                        password: Hash.getHash(value)
                                    }
                                })}
                                errorText="Поле обязательно"
                            />
                            <SelectField
                                fullWidth={true}
                                value={this.state.data.role}
                                floatingLabelText="Роль"
                                onChange={(event, value) => this.setState({
                                    data: {
                                        ...this.state.data,
                                        role: value
                                    }
                                })}
                            >
                                {this.state.roles.map((role, index) => {
                                    return <MenuItem
                                        value={role.slug}
                                        primaryText={role.name}
                                        key={index}
                                    />
                                })}
                            </SelectField>
                            <DatePicker
                                fullWidth={true}
                                floatingLabelText="Дата создания"
                                hintText="Дата создания"
                                defaultDate={new Date(this.state.data.creationDate)}
                            />
                            <DatePicker
                                fullWidth={true}
                                floatingLabelText="Дата изменения"
                                hintText="Дата изменения"
                                defaultDate={new Date(this.state.data.modificationDate)}
                            />
                            <TextField
                                fullWidth={true}
                                value={this.state.data.slug}
                                onChange={(event, value) => this.setState({
                                    data: {
                                        ...this.state.data,
                                        slug: value
                                    }
                                })}
                                floatingLabelText='Slug'
                            />
                        </div>
                    </Tab>
                </Tabs>
                <ToolBar
                    resources='users'
                    data={this.state.data}
                    action='edit'
                />
            </div>
        )
    }
}