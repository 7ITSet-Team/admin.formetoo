import React from 'react'
import {Tabs, Tab} from 'material-ui/Tabs'
import TextField from 'material-ui/TextField'
import DatePicker from 'material-ui/DatePicker'

import Data from '@admin/core/data.provider'
import ToolBar from '@admin/containers/tool-bar'

export default class StatusEdit extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            data: {
                title: '',
                creationDate: new Date(),
                modificationDate: new Date()
            }
        }
        this.getStatus(this.props.location)
    }

    async getStatus(uri) {
        const response = await Data.getResource(uri)
        this.setState({
            data: response
        })
    }

    render() {
        console.log(this.state)
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
                                value={this.state.data.title}
                                onChange={(event, value) => {
                                    this.setState({
                                        data: {
                                            ...this.state.data,
                                            title: value
                                        }
                                    })
                                }}
                                hintText="Заголовок(наименование)"
                                errorText="Поле обязательно"
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
                        </div>
                    </Tab>
                </Tabs>
                <ToolBar
                    resources='statuses'
                    data={this.state.data}
                    action='edit'
                />
            </div>
        )
    }
}