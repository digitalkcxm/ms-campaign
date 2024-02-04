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

export { status, statusByID }
