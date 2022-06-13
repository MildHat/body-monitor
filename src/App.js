import 'regenerator-runtime/runtime'
import React from 'react'
import { login, logout } from './utils'
import './global.css'

import {
  ResponsiveContainer,
  AreaChart,
  XAxis,
  YAxis,
  Area,
  Tooltip,
  CartesianGrid
} from 'recharts'

import getConfig from './config'
const { networkId } = getConfig(process.env.NODE_ENV || 'development')

export default function App() {
  const [buttonDisabled, setButtonDisabled] = React.useState(false)

  const [data, setData] = React.useState({
    age: null,
    height: null,
    weights: [],
  })

  const [graphData, setGraphData] = React.useState([])

  React.useEffect(
    () => {
      if (window.walletConnection.isSignedIn()) {
        
        window.contract.check_user({
          account_id: window.accountId
        })
        .then(status => {
          console.log(status)
          if (status) {
            window.contract.get_user({
              account_id: window.accountId
            })
            .then(response => {
              initData(response)
            })
          }
        })
      }
    },
    []
  )

  const initData = response => {
    setData(response)
    calculateGraphData(response.weights)
  }

  const calculateGraphData = receivedData => {
    let dataForGraph = []

    for (let index = 0; index < receivedData.length; index++) {
      dataForGraph.push({
        numberOfMeasurement: index + 1,
        weight: receivedData[index],
      })
    }

    setGraphData(dataForGraph)
  }

  // if not signed in, return early with sign-in prompt
  if (!window.walletConnection.isSignedIn()) {
    return (
      <main>
        <h1>Welcome to<br/>Body monitoring App!</h1>
        <p>
          Here you can measure some parameters of your body and learn how to improve your body.
        </p>
        <p>
          Use the button below to start using the app:
        </p>
        <p style={{ textAlign: 'center', marginTop: '2.5em' }}>
          <button onClick={login}>Sign in</button>
        </p>
      </main>
    )
  }

  const LogoutButton = () => {
    return (
      <button className="link" style={{ float: 'right' }} onClick={logout}>
          Sign out
      </button>
    )
  }

  const Graph = () => {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={graphData}>
          <defs>
            <linearGradient id="color" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C99E10" stopOpacity={0.4} />
              <stop offset="75%" stopColor="#C99E10" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <Area
            type="monotoneX"
            dataKey="weight"
            stroke="#C99E10"
            fill="url(#color)"
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            dataKey="weight"
          />

          <XAxis
            dataKey="numberOfMeasurement"
            axisLine={false}
            tickLine={false}
            tickFormatter={number => number % 2 == 0 ? number : "" }
          />
          <CartesianGrid opacity={0.1} vertical={false}/>
          <Tooltip content={<CustomTooltip />} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active) {
      return (
        <div>
          <p>{label}</p>
          <p>{payload[0].value.toFixed(1)} kg</p>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <LogoutButton/>
      { !data.age &&
        <main>
          <h2>Welcome to the registration of<br/>Body monitoring App!</h2>
          <form onSubmit={async event => {
            event.preventDefault()
            setButtonDisabled(true)

            // get elements from the form using their id attribute
            const { fieldset, age, height, weight } = event.target.elements

            // disable the form while the value gets updated on-chain
            fieldset.disabled = true

            let ageData = parseInt(age.value, 10);
            let heightData = parseInt(height.value, 10);
            let weightData = parseFloat(weight.value);

            try {
              await window.contract.register_user({
                age: ageData,
                height: heightData,
                weight: weightData
              })
            } catch (e) {
              alert(
                'Something went wrong! ' +
                'Maybe you need to sign out and back in? ' +
                'Check your browser console for more info.'
              )
              throw e
            }

            window.contract.get_user({
              account_id: window.accountId
            })
            .then(response => {
              initData(response)
            })

            fieldset.disabled = false
            setButtonDisabled(false)
          }}>
          <fieldset id="fieldset">
            <label htmlFor="age"
              style={{
                display: 'block',
                color: 'var(--gray)',
                marginBottom: '0.5em',
                marginTop: '0.5em'
              }}
            >
              Set age
            </label>
            <div>
              <input autoComplete="off" defaultValue="" id="age" type="number"/>
            </div>

            <label htmlFor="height"
              style={{
                display: 'block',
                color: 'var(--gray)',
                marginBottom: '0.5em',
                marginTop: '0.5em'
              }}
            >
              Set height (cm)
            </label>
            <div>
              <input autoComplete="off" defaultValue="" id="height" type="number"/>
            </div>

            <label htmlFor="weight"
              style={{
                display: 'block',
                color: 'var(--gray)',
                marginBottom: '0.5em',
                marginTop: '0.5em'
              }}
            >
              Set weight (kg)
            </label>
            <div>
              <input autoComplete="off" defaultValue="" id="weight" type="number" step="0.1"/>
            </div>
          </fieldset>
          <button disabled={buttonDisabled} style={{ borderRadius: '5px' }}>
            Save
          </button>
        </form>
      </main>
      }
      { data.age && 
        <main>
          <h1>
            {window.accountId}
          </h1>

          <div class="data">
            <p className="data-block">Age: {data && data.age} years</p>
            <p className="data-block">Height: {data && data.height} cm</p>
            <p className="data-block">Current weight: {data && data.weights[data.weights.length - 1] } kg</p>
          </div>

          <form style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5em' }} onSubmit={async event => {
              event.preventDefault()

              const { weight } = event.target.elements

              let weightData = parseFloat(weight.value);

              try {
                await window.contract.add_weight_to_user({
                  account_id: window.accountId,
                  weight: weightData
                })
              } catch (e) {
                alert(
                  'Something went wrong! ' +
                  'Maybe you need to sign out and back in? ' +
                  'Check your browser console for more info.'
                )
                throw e
              } finally {
                let updatedData = data
                updatedData.weights.shift()
                updatedData.weights.push(weightData)

                setData(updatedData)
                calculateGraphData(updatedData.weights)
              }
            }}>
              <input style={{ display: 'block' }} placeholder="Type new weight..." autoComplete="off" defaultValue="" id="weight" step="0.1"/>
              <button style={{ display: 'block' }}>
                Update
              </button>
          </form>

          { data.weights.length > 3 &&
            <Graph/>
          }
        </main>
      }
    </>
  )
}

