import React from 'react'
import Loadable from 'react-loadable'
import CircularProgress from 'material-ui/CircularProgress'

class Loading extends React.Component {
  render() {
    return (
      <div
        className='loading'
      >
        <CircularProgress
          size={200}
          thickness={10}
        />
      </div>
    )
  }
}

const App = Loadable({
  loader: () => import('@src/containers/layout'),
  loading: Loading
})

export default [
  {
    path: '/',
    exact: false,
    component: App
  }
]
