const firebase = require('firebase')

firebase.initializeApp({
  apiKey: 'AIzaSyD3ESiYmskRwKtFN4L4K17A1Ip6Ki0-yYk',
  authDomain: 'polyclinic-queue-scrapper.firebaseapp.com',
  databaseURL: 'https://polyclinic-queue-scrapper.firebaseio.com',
  projectId: 'polyclinic-queue-scrapper',
  storageBucket: 'polyclinic-queue-scrapper.appspot.com',
  messagingSenderId: '463810438567'
})

module.exports = firebase
