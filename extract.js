const _format = require('date-fns/format')
const fs = require('fs')
const Papa = require('papaparse')

const firebase = require('./model')
const database = firebase.database()

database.ref('/historical').once('value')
  .then(state => {
    const data = postProcess(state.val())
    const csv = Papa.unparse(data)
    fs.writeFileSync('data/historical.csv', csv)
    firebase.app().delete()
  })

function postProcess (data) {
  const processed = []
  for (let polyclinic in data) {
    for (let timestamp in data[polyclinic]) {
      const datetime = new Date(+timestamp)
      const date = _format(datetime, 'YYYY-MM-DD')
      const time = _format(datetime, 'HH:mm')
      if (time[4] !== '0' && time[4] !== '5') continue
      const patientCount = data[polyclinic][timestamp].patientCount
      if (patientCount == null) continue
      processed.push({
        polyclinic,
        date,
        time,
        patientCount
      })
    }
  }
  return processed
}
