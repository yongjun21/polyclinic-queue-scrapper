const axios = require('axios')
const cheerio = require('cheerio')
const url = require('url')

const firebase = require('./model')
const database = firebase.database()

const polyclinics = {
  SingHealth: {
    endpoint: 'https://apps.singhealth.com.sg/QWatch/QimgPageNew/Loc_Code/__KEY__',
    keys: {
      BDP: 'Bedok',
      BMP: 'Bukit Merah',
      MPP: 'Marine Parade',
      OUP: 'Outram',
      PRP: 'Pasir Ris',
      PGP: 'Punggol',
      SKP: 'Sengkang',
      TMP: 'Tampines',
      QTP: 'Queenstown'
    }
  },
  NHG: {
    endpoint: 'https://smile.nhgp.com.sg/Page/__KEY__.html',
    keys: {
      amk: 'Ang Mo Kio',
      hou: 'Hougang',
      wds: 'Woodlands',
      gyl: 'Geylang',
      tpy: 'Toa Payoh',
      yis: 'Yishun',
      bbk: 'Bukit Batok',
      cck: 'Choa Chu Kang',
      clm: 'Clementi',
      jur: 'Jurong',
      pio: 'Pioneer'
    }
  }
}

exports.handler = function (event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = false
  firebase.auth().signInWithEmailAndPassword(process.env.FIREBASE_USER, process.env.FIREBASE_PASSWORD)
    .then(() => {
      const timestamp = Date.now()
      const jobs = []
      Object.keys(polyclinics).forEach(group => {
        Object.keys(polyclinics[group].keys).forEach(key => {
          jobs.push(fetchQueuingTime(group, key, timestamp))
        })
      })
      return Promise.all(jobs)
    })
    .then(result => {
      const updated = result.filter(item => 'result' in item)
      const errors = result.filter(item => 'error' in item)
      callback(null, {updated, errors})
    })
    .catch(callback)
}

function fetchQueuingTime (group, key, timestamp) {
  timestamp = timestamp - timestamp % (60 * 1000)
  const url = polyclinics[group].endpoint.replace('__KEY__', key)
  const label = polyclinics[group].keys[key]
  return axios.get(url)
    .then(res => cheerio.load(res.data))
    .then(group === 'SingHealth' ? parseSingHealth : parseNHG)
    .then(result => {
      const updates = {
        ['latest/' + label]: result,
        ['historical/' + label + '/' + timestamp]: result
      }
      return database.ref().update(updates).then(() => ({label, result}))
    })
    .catch(error => ({label, error}))
}

function parseSingHealth ($) {
  const resolve = resolveFromUrl(polyclinics.SingHealth.endpoint)

  const patientCount = $('#infoPatientCount').text()
  const registration = resolve($('#imgCam2').attr('src'))
  const consultation = resolve($('#imgCam1').attr('src'))
  const pharmacy = resolve($('#imgCam3').attr('src'))

  return {
    timestamp: Date.now(),
    patientCount: patientCount === '-' ? null : +patientCount,
    registration: validateSrc(registration),
    consultation: validateSrc(consultation),
    pharmacy: validateSrc(pharmacy)
  }
}

function parseNHG ($) {
  const resolve = resolveFromUrl(polyclinics.NHG.endpoint)

  const patientCount = $('#lblStat').text()
  const registration = resolve($('#imgREG').attr('src'))
  const consultation = resolve($('#imgCONS').attr('src'))
  const pharmacy = resolve($('#imgPHARM').attr('src'))

  return {
    timestamp: Date.now(),
    patientCount: patientCount ? +patientCount : null,
    registration: validateSrc(registration),
    consultation: validateSrc(consultation),
    pharmacy: validateSrc(pharmacy)
  }
}

function resolveFromUrl (base) {
  return function (path) {
    return url.resolve(base, path)
  }
}

function validateSrc (url) {
  if (url === 'http://apps.singhealth.com.sg/qwatch/Images/blankimage.jpg') return null
  if (url === 'https://smile.nhgp.com.sg/Images/closed.jpg') return null
  if (url === 'https://smile.nhgp.com.sg/Images/lunch.jpg') return null
  return url
}
