import React from 'react'
import {Tabs, Tab} from 'material-ui/Tabs'
import TextField from 'material-ui/TextField'
import SelectField from 'material-ui/SelectField'
import MenuItem from 'material-ui/MenuItem'
import DatePicker from 'material-ui/DatePicker'

import Data from '@admin/core/data.provider'
import ToolBar from '@admin/containers/tool-bar'

export default class TabSetsEdit extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            data: {
                title: '',
                tabs: [],
                slug: '',
                creationDate: new Date(),
                modificationDate: new Date()
            },
            tabs: []
        }
        this.getTabs()
        this.getTabSets(this.props.location)
        this.changeTabs = this.changeTabs.bind(this)
    }

    changeTabs(event, index, value) {
        this.setState({
            data: {
                ...this.state.data,
                tabs: [
                    ...value
                ]
            }
        })
    }

    async getTabSets(uri) {
        const response = await Data.getResource(uri)
        this.setState({
            data: response
        })
    }

    async getTabs() {
        const response = await Data.getData('/tabs')
        this.setState({
            tabs: response.data
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
                                hintText="Заголовок"
                                value={this.state.data.title}
                                onChange={(event, value) => {
                                    this.setState({
                                        data: {
                                            ...this.state.data,
                                            title: value
                                        }
                                    })
                                }}
                                errorText="Поле обязательно"
                            />
                            <SelectField
                                fullWidth={true}
                                multiple={true}
                                value={this.state.data.tabs}
                                floatingLabelText="Табы"
                                onChange={this.changeTabs}
                            >
                                {this.state.tabs.map((tab, index) => {
                                    return <MenuItem
                                        value={tab.slug}
                                        primaryText={tab.title}
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
                                label='Slug'
                            />
                        </div>
                    </Tab>
                </Tabs>
                <ToolBar
                    resources='tab-sets'
                    data={this.state.data}
                    action='edit'
                />
            </div>
        )
    }
}