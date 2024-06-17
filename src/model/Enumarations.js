const status = {
  draft: 1,
  scheduled: 2,
  running: 3,
  canceled: 4,
  error: 5,
  finished: 6
}

const statusByID = {
  1: 'draft',
  2: 'scheduled',
  3: 'running',
  4: 'canceled',
  5: 'error',
  6: 'finished'
}

const channel = {
  'chat': 1,
  'whatsapp': 2,
  'waba': 2,
  'sms': 3,
  'email': 4,
  'phone': 6
}

export { status, statusByID, channel }
