import health from '../routes/health.js'
import campaign from '../routes/campaign.js'

export default (app, database, logger, redis) => {
  app.use('/api/v1/health', health())
  app.use('/api/v1/campaign', campaign(database, logger, redis))
}
