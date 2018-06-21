import React from 'react'
import AppBar from 'material-ui/AppBar'
import renderRoutes from 'react-router-config/renderRoutes'
import { Route } from 'react-router-dom'

import ResourcesList from '@admin/containers/resources'
import Login from '@admin/containers/login'
import Auth from '@admin/core/auth.provider'
import Data from '@admin/core/data.provider'
import routes from '@admin/constants/routes/index'
import components from '@admin/constants/routes/components'

export default class Layout extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			isMenuOpened: true,
			authorised: Auth.isAuthorizedSession(),
			allowedResources: []
		}
		this.getAllowedResources()
			.catch(error => console.error(`Ошибка при получении разрешённых ресурсов! ${error}`))
		this.openMenu = this.openMenu.bind(this)
	}

	componentWillMount() {
		Auth.init(
			() => this.setState({
				authorised: true
			}),
			() => this.setState({
				authorised: false
			})
		)
	}

	componentWillUnmount() {
		Auth.init()
	}

	openMenu() {
		const {isMenuOpened} = this.state
		return this.setState({
			isMenuOpened: !isMenuOpened
		})
	}

	async getAllowedResources() {
		const resources = await Data.getAllowedResources()
		if (resources.success)
			return this.setState({
				allowedResources: resources.allowed
			})
		else
			return console.error('Ошибка получения разрешённых ресурсов: ', resources.msg)
	}

	render() {
		const {authorised, allowedResources, isMenuOpened} = this.state
		const location = this.props.location.pathname
		const route = this.props.route.path
		if (!authorised)
			return <Login/>
		return (
			<div
				className="layout"
			>
				<AppBar
					title="ForMeToo"
					onLeftIconButtonClick={this.openMenu}
					style={{
						height: 60
					}}
				/>
				<div
					className="body"
				>
					<ResourcesList
						allowedResources={allowedResources}
						isMenuOpened={isMenuOpened}
						basePath={route}
					/>
					<div
						className={
							isMenuOpened
								? "content"
								: "content_moved"
						}
					>
						{renderRoutes(routes(location, route))}
						<Route
							path={route + 'products/:id/copy'}
							component={components.ProductsCreate}
						/>
					</div>
				</div>
			</div>
		)
	}
}